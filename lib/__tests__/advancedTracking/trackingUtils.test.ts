import {
  assertTwoSides,
  assertValidLines,
  assertValidParticipantRefs,
  assertValidSideIds,
  cloneGame,
  didPullTurnOver,
  getCurrentPoint,
  getCurrentPossession,
  getEffectiveGameTo,
  getGameScore,
  getLastAction,
  getOtherSideId,
  getPointScoringSideId,
  getReceivingSideForNextPoint,
  hasPointEnded,
  isAdvancedGameOver,
  isPointEndingThrow,
  isPossessionOver,
  isTurnoverThrow,
  syncDerivedHalftimeTransition,
} from '../../advancedTracking/trackingUtils';
import type {
  AdvancedTrackedGame,
  PointPossession,
  TrackedPoint,
} from '../../advancedTracking/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const HOME = 'home';
const AWAY = 'away';

const august = { refType: 'participant' as const, participantId: 'p_august' };
const meves = { refType: 'participant' as const, participantId: 'p_meves' };
const untracked = { refType: 'untracked' as const };

const baseGame: AdvancedTrackedGame = {
  id: 'g1',
  schemaVersion: 1,
  createdAt: 0,
  updatedAt: 0,
  gameType: 'game',
  status: 'in_progress',
  focusSideId: HOME,
  initialReceivingSideId: HOME,
  settings: { locationMode: 'none' },
  sides: [
    { id: HOME, label: 'Home', trackingMode: 'full-roster' },
    { id: AWAY, label: 'Away', trackingMode: 'anonymous' },
  ],
  participants: [
    { id: august.participantId, name: 'August' },
    { id: meves.participantId, name: 'Meves' },
  ],
  points: [],
};

function makeGame(points: TrackedPoint[]): AdvancedTrackedGame {
  return { ...baseGame, points };
}

function makePossession(sideId: string, actions: PointPossession['actions'] = []): PointPossession {
  return { id: 'pos1', sideId, actions };
}

function makePoint(possessions: PointPossession[]): TrackedPoint {
  return {
    id: 'pt1',
    lines: [{ sideId: HOME, participantIds: [august.participantId] }],
    possessions,
  };
}

// ── getCurrentPoint ───────────────────────────────────────────────────────────

describe('getCurrentPoint', () => {
  it('returns null for null game', () => {
    expect(getCurrentPoint(null)).toBeNull();
  });

  it('returns null for game with no points', () => {
    expect(getCurrentPoint(makeGame([]))).toBeNull();
  });

  it('returns the last point', () => {
    const p1 = makePoint([makePossession(HOME)]);
    const p2 = { ...makePoint([makePossession(AWAY)]), id: 'pt2' };
    expect(getCurrentPoint(makeGame([p1, p2]))).toBe(p2);
  });
});

// ── getCurrentPossession ──────────────────────────────────────────────────────

describe('getCurrentPossession', () => {
  it('returns null for null game', () => {
    expect(getCurrentPossession(null)).toBeNull();
  });

  it('returns null when current point has no possessions', () => {
    const point = { ...makePoint([]), possessions: [] };
    expect(getCurrentPossession(makeGame([point]))).toBeNull();
  });

  it('returns the last possession of the current point', () => {
    const pos1 = makePossession(HOME);
    const pos2 = { ...makePossession(AWAY), id: 'pos2' };
    expect(getCurrentPossession(makeGame([makePoint([pos1, pos2])]))).toBe(pos2);
  });
});

// ── getLastAction ─────────────────────────────────────────────────────────────

describe('getLastAction', () => {
  it('returns null for null possession', () => {
    expect(getLastAction(null)).toBeNull();
  });

  it('returns null for possession with no actions', () => {
    expect(getLastAction(makePossession(HOME))).toBeNull();
  });

  it('returns the last action', () => {
    const action1 = { id: 'a1', kind: 'disc_pickup' as const, sideId: HOME, player: august };
    const action2 = { id: 'a2', kind: 'disc_pickup' as const, sideId: HOME, player: meves };
    expect(getLastAction(makePossession(HOME, [action1, action2]))).toBe(action2);
  });
});

// ── getOtherSideId ────────────────────────────────────────────────────────────

describe('getOtherSideId', () => {
  it('returns the other side', () => {
    expect(getOtherSideId(baseGame, HOME)).toBe(AWAY);
    expect(getOtherSideId(baseGame, AWAY)).toBe(HOME);
  });

  it('throws for an unknown sideId', () => {
    const singleSideGame = {
      ...baseGame,
      sides: [{ id: HOME, label: 'Home', trackingMode: 'full-roster' as const }],
    };
    expect(() => getOtherSideId(singleSideGame, HOME)).toThrow();
  });
});

// ── isPointEndingThrow / isTurnoverThrow ──────────────────────────────────────

describe('isPointEndingThrow', () => {
  it('returns true for goal and callahan', () => {
    expect(isPointEndingThrow('goal')).toBe(true);
    expect(isPointEndingThrow('callahan')).toBe(true);
  });

  it('returns false for all other results', () => {
    for (const result of [
      'complete',
      'drop',
      'throwaway',
      'stall',
      'block',
      'interception',
    ] as const) {
      expect(isPointEndingThrow(result)).toBe(false);
    }
  });
});

describe('isTurnoverThrow', () => {
  it('returns true for all turnover results', () => {
    for (const result of ['drop', 'throwaway', 'stall', 'block', 'interception'] as const) {
      expect(isTurnoverThrow(result)).toBe(true);
    }
  });

  it('returns false for complete, goal, callahan', () => {
    expect(isTurnoverThrow('complete')).toBe(false);
    expect(isTurnoverThrow('goal')).toBe(false);
    expect(isTurnoverThrow('callahan')).toBe(false);
  });
});

// ── didPullTurnOver ───────────────────────────────────────────────────────────

describe('didPullTurnOver', () => {
  it('returns true only for dropped', () => {
    expect(didPullTurnOver('dropped')).toBe(true);
  });

  it('returns false for all other pull results', () => {
    for (const result of [
      'caught',
      'landed_in_bounds',
      'landed_in_bounds_rolled_out',
      'ob_pull',
    ] as const) {
      expect(didPullTurnOver(result)).toBe(false);
    }
  });
});

// ── isPossessionClosed ────────────────────────────────────────────────────────

describe('isPossessionClosed', () => {
  it('returns false for null possession', () => {
    expect(isPossessionOver(null)).toBe(false);
  });

  it('returns false for empty possession', () => {
    expect(isPossessionOver(makePossession(HOME))).toBe(false);
  });

  it('returns false after a completion', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'complete' },
    ]);
    expect(isPossessionOver(pos)).toBe(false);
  });

  it('returns true after a goal', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
    ]);
    expect(isPossessionOver(pos)).toBe(true);
  });

  it('returns true after a callahan', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'callahan' },
    ]);
    expect(isPossessionOver(pos)).toBe(true);
  });

  it('returns true after a throwaway', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'throwaway' },
    ]);
    expect(isPossessionOver(pos)).toBe(true);
  });

  it('returns true after a dropped pull', () => {
    const pos = makePossession(HOME, [
      {
        id: 'a1',
        kind: 'pull',
        sideId: AWAY,
        receivingSideId: HOME,
        puller: untracked,
        result: 'dropped',
      },
    ]);
    expect(isPossessionOver(pos)).toBe(true);
  });

  it('returns false after a caught pull', () => {
    const pos = makePossession(HOME, [
      {
        id: 'a1',
        kind: 'pull',
        sideId: AWAY,
        receivingSideId: HOME,
        puller: untracked,
        result: 'caught',
      },
    ]);
    expect(isPossessionOver(pos)).toBe(false);
  });
});

// ── hasPointEnded ─────────────────────────────────────────────────────────────

describe('hasPointEnded', () => {
  it('returns false for null', () => {
    expect(hasPointEnded(null)).toBe(false);
  });

  it('returns false for point with no possessions', () => {
    expect(hasPointEnded({ ...makePoint([]), possessions: [] })).toBe(false);
  });

  it('returns true after a goal', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
    ]);
    expect(hasPointEnded(makePoint([pos]))).toBe(true);
  });

  it('returns true after a callahan', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'callahan' },
    ]);
    expect(hasPointEnded(makePoint([pos]))).toBe(true);
  });

  it('returns false after a turnover (point not ended)', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'throwaway' },
    ]);
    expect(hasPointEnded(makePoint([pos]))).toBe(false);
  });
});

// ── getPointScoringSideId ─────────────────────────────────────────────────────

describe('getPointScoringSideId', () => {
  it('returns null when point has no possessions', () => {
    expect(getPointScoringSideId(baseGame, { ...makePoint([]), possessions: [] })).toBeNull();
  });

  it('returns null when last action is not a throw', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
    ]);
    expect(getPointScoringSideId(baseGame, makePoint([pos]))).toBeNull();
  });

  it('returns the possessing side on a goal', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
    ]);
    expect(getPointScoringSideId(baseGame, makePoint([pos]))).toBe(HOME);
  });

  it('returns the opposing side on a callahan', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'callahan' },
    ]);
    expect(getPointScoringSideId(baseGame, makePoint([pos]))).toBe(AWAY);
  });

  it('returns null for a non-scoring throw result', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'throwaway' },
    ]);
    expect(getPointScoringSideId(baseGame, makePoint([pos]))).toBeNull();
  });
});

// ── getGameScore ──────────────────────────────────────────────────────────────

describe('getGameScore', () => {
  it('returns zero for both sides when no points have been scored', () => {
    expect(getGameScore(makeGame([]))).toEqual({ [HOME]: 0, [AWAY]: 0 });
  });

  it('credits the possessing side on a goal', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
    ]);
    expect(getGameScore(makeGame([makePoint([pos])]))).toEqual({ [HOME]: 1, [AWAY]: 0 });
  });

  it('credits the defending side on a callahan', () => {
    // HOME possession → callahan → AWAY scores
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'callahan' },
    ]);
    expect(getGameScore(makeGame([makePoint([pos])]))).toEqual({ [HOME]: 0, [AWAY]: 1 });
  });

  it('does not count points that have not been scored yet', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'throwaway' },
    ]);
    expect(getGameScore(makeGame([makePoint([pos])]))).toEqual({ [HOME]: 0, [AWAY]: 0 });
  });

  it('accumulates score across multiple points', () => {
    const homeGoal = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
    ]);
    const awayGoal = makePossession(AWAY, [
      { id: 'a2', kind: 'throw', sideId: AWAY, thrower: untracked, result: 'goal' },
    ]);
    const game = makeGame([
      makePoint([homeGoal]),
      { ...makePoint([awayGoal]), id: 'pt2' },
      { ...makePoint([homeGoal]), id: 'pt3' },
    ]);
    expect(getGameScore(game)).toEqual({ [HOME]: 2, [AWAY]: 1 });
  });
});

// ── getEffectiveGameTo / isAdvancedGameOver ──────────────────────────────────

describe('getEffectiveGameTo', () => {
  it('returns the base gameTo when no soft cap transition exists', () => {
    expect(
      getEffectiveGameTo({
        ...baseGame,
        settings: { locationMode: 'none', format: { formatType: 'standard', gameTo: 15 } },
      }),
    ).toBe(15);
  });

  it('reduces gameTo to higherScore + 1 when soft cap is recorded below the target', () => {
    const point = makePoint([
      makePossession(HOME, [
        { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
      ]),
    ]);
    const game: AdvancedTrackedGame = {
      ...baseGame,
      settings: { locationMode: 'none', format: { formatType: 'standard', gameTo: 15 } },
      points: [point],
      gameTransitions: [{ id: 'soft1', transitionType: 'soft_cap', afterPointId: point.id }],
    };

    expect(getEffectiveGameTo(game)).toBe(2);
  });
});

describe('isAdvancedGameOver', () => {
  it('returns false when no points have been scored', () => {
    expect(
      isAdvancedGameOver({
        ...baseGame,
        settings: { locationMode: 'none', format: { formatType: 'standard', gameTo: 15 } },
      }),
    ).toBe(false);
  });

  it('returns true when the score reaches the effective gameTo target', () => {
    const points = Array.from({ length: 15 }, (_, index) => ({
      ...makePoint([
        makePossession(HOME, [
          { id: `a${index}`, kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
        ]),
      ]),
      id: `pt${index}`,
    }));

    expect(
      isAdvancedGameOver({
        ...baseGame,
        settings: { locationMode: 'none', format: { formatType: 'standard', gameTo: 15 } },
        points,
      }),
    ).toBe(true);
  });

  it('returns true when hard cap has been reached and the score is not tied', () => {
    const point = makePoint([
      makePossession(HOME, [
        { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
      ]),
    ]);

    expect(
      isAdvancedGameOver({
        ...baseGame,
        settings: { locationMode: 'none', format: { formatType: 'standard', gameTo: 15 } },
        points: [point],
        gameTransitions: [{ id: 'hard1', transitionType: 'hard_cap', afterPointId: point.id }],
      }),
    ).toBe(true);
  });
});

describe('syncDerivedHalftimeTransition', () => {
  it('adds a halftime transition after the point where a side reaches halftimeAt', () => {
    const points = Array.from({ length: 8 }, (_, index) => ({
      ...makePoint([
        makePossession(HOME, [
          { id: `a${index}`, kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
        ]),
      ]),
      id: `pt${index}`,
    }));
    const game: AdvancedTrackedGame = {
      ...baseGame,
      settings: {
        locationMode: 'none',
        format: { formatType: 'standard', gameTo: 15, halftimeAt: 8 },
      },
      points,
    };

    syncDerivedHalftimeTransition(game);

    expect(game.gameTransitions).toEqual([
      { id: 'halftime_g1', transitionType: 'halftime', afterPointId: 'pt7' },
    ]);
  });

  it('removes halftime when the scoring point is undone', () => {
    const points = Array.from({ length: 7 }, (_, index) => ({
      ...makePoint([
        makePossession(HOME, [
          { id: `a${index}`, kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
        ]),
      ]),
      id: `pt${index}`,
    }));
    const game: AdvancedTrackedGame = {
      ...baseGame,
      settings: {
        locationMode: 'none',
        format: { formatType: 'standard', gameTo: 15, halftimeAt: 8 },
      },
      points,
      gameTransitions: [{ id: 'halftime_g1', transitionType: 'halftime', afterPointId: 'pt7' }],
    };

    syncDerivedHalftimeTransition(game);

    expect(game.gameTransitions).toBeUndefined();
  });
});

// ── getReceivingSideForNextPoint ──────────────────────────────────────────────

describe('getReceivingSideForNextPoint', () => {
  it('returns initialReceivingSideId when there are no points', () => {
    expect(getReceivingSideForNextPoint(makeGame([]))).toBe(HOME);
  });

  it('returns the non-scoring side after a goal (scored by HOME → AWAY receives)', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
    ]);
    expect(getReceivingSideForNextPoint(makeGame([makePoint([pos])]))).toBe(AWAY);
  });

  it('returns the non-scoring side after a callahan (AWAY scores → HOME receives)', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'callahan' },
    ]);
    // callahan scored by AWAY, so HOME receives
    expect(getReceivingSideForNextPoint(makeGame([makePoint([pos])]))).toBe(HOME);
  });

  it('throws when the current point has not been scored yet', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'throwaway' },
    ]);
    expect(() => getReceivingSideForNextPoint(makeGame([makePoint([pos])]))).toThrow();
  });

  it('flips receiving side after halftime (initial receiver now pulls)', () => {
    // HOME received first half. HOME scored the last point before half.
    // Without halftime: AWAY would receive (non-scoring side). But halftime flips it.
    // After halftime: the team that initially pulled (AWAY) now receives.
    const point: TrackedPoint = {
      id: 'pt_half',
      lines: [{ sideId: HOME, participantIds: [august.participantId] }],
      possessions: [
        makePossession(HOME, [
          { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
        ]),
      ],
    };
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [point],
      gameTransitions: [{ id: 'gt1', transitionType: 'halftime', afterPointId: 'pt_half' }],
    };
    // AWAY initially pulled, so after halftime AWAY receives
    expect(getReceivingSideForNextPoint(game)).toBe(AWAY);
  });

  it('halftime overrides normal scoring logic when scoring side would have received', () => {
    // AWAY scored (callahan) going into half — normally HOME would receive.
    // But halftime means AWAY (initial puller) receives instead.
    const point: TrackedPoint = {
      id: 'pt_half',
      lines: [{ sideId: HOME, participantIds: [august.participantId] }],
      possessions: [
        makePossession(HOME, [
          { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'callahan' },
        ]),
      ],
    };
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [point],
      gameTransitions: [{ id: 'gt1', transitionType: 'halftime', afterPointId: 'pt_half' }],
    };
    // callahan: AWAY scored, normally HOME receives. But halftime: AWAY receives.
    expect(getReceivingSideForNextPoint(game)).toBe(AWAY);
  });

  it('does not flip receiving side when halftime is on a different point', () => {
    const point: TrackedPoint = {
      id: 'pt_latest',
      lines: [{ sideId: HOME, participantIds: [august.participantId] }],
      possessions: [
        makePossession(HOME, [
          { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
        ]),
      ],
    };
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [point],
      gameTransitions: [{ id: 'gt1', transitionType: 'halftime', afterPointId: 'pt_some_other' }],
    };
    // No halftime flip — normal logic: HOME scored, so AWAY receives
    expect(getReceivingSideForNextPoint(game)).toBe(AWAY);
  });
});

// ── cloneGame ─────────────────────────────────────────────────────────────────

describe('cloneGame', () => {
  it('produces a deep copy with equal value', () => {
    const game = makeGame([makePoint([makePossession(HOME)])]);
    const clone = cloneGame(game);
    expect(clone).toEqual(game);
    expect(clone).not.toBe(game);
    expect(clone.points[0]).not.toBe(game.points[0]);
  });
});

// ── assertTwoSides ────────────────────────────────────────────────────────────

describe('assertTwoSides', () => {
  it('does not throw for exactly two sides', () => {
    expect(() => assertTwoSides(baseGame.sides)).not.toThrow();
  });

  it('throws for one side', () => {
    expect(() => assertTwoSides([baseGame.sides[0]])).toThrow();
  });

  it('throws for three sides', () => {
    const extra = { id: 'extra', label: 'Extra', trackingMode: 'anonymous' as const };
    expect(() => assertTwoSides([...baseGame.sides, extra])).toThrow();
  });
});

// ── assertValidSideIds ────────────────────────────────────────────────────────

describe('assertValidSideIds', () => {
  it('does not throw for known side ids', () => {
    expect(() => assertValidSideIds(baseGame, [HOME, AWAY])).not.toThrow();
  });

  it('throws for an unknown side id', () => {
    expect(() => assertValidSideIds(baseGame, ['unknown'])).toThrow();
  });
});

// ── assertValidParticipantRefs ────────────────────────────────────────────────

describe('assertValidParticipantRefs', () => {
  it('does not throw for known participant refs', () => {
    expect(() => assertValidParticipantRefs(baseGame, [august, meves])).not.toThrow();
  });

  it('does not throw for untracked or unknown refs', () => {
    const unknownRef = { refType: 'unknown' as const };
    expect(() => assertValidParticipantRefs(baseGame, [untracked, unknownRef])).not.toThrow();
  });

  it('does not throw for undefined entries', () => {
    expect(() => assertValidParticipantRefs(baseGame, [undefined])).not.toThrow();
  });

  it('throws for a participant ref with an unknown id', () => {
    const bad = { refType: 'participant' as const, participantId: 'p_nobody' };
    expect(() => assertValidParticipantRefs(baseGame, [bad])).toThrow();
  });
});

// ── assertValidLines ──────────────────────────────────────────────────────────

describe('assertValidLines', () => {
  it('does not throw for valid lines', () => {
    const lines = [{ sideId: HOME, participantIds: [august.participantId] }];
    expect(() => assertValidLines(baseGame, lines)).not.toThrow();
  });

  it('throws for empty lines array', () => {
    expect(() => assertValidLines(baseGame, [])).toThrow();
  });

  it('throws for an unknown sideId in a line', () => {
    const lines = [{ sideId: 'unknown', participantIds: [] }];
    expect(() => assertValidLines(baseGame, lines)).toThrow();
  });

  it('throws for an unknown participantId in a line', () => {
    const lines = [{ sideId: HOME, participantIds: ['p_nobody'] }];
    expect(() => assertValidLines(baseGame, lines)).toThrow();
  });
});
