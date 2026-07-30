import {
  assertPointActionParticipantsPreserved,
  assertTwoSides,
  assertValidInjurySubInput,
  assertValidLines,
  assertValidParticipantRefs,
  assertValidSideIds,
  canStartSecondHalfEarly,
  cloneGame,
  didPullTurnOver,
  didLastOperationEndCurrentPoint,
  getAdvancedRecentLines,
  getCurrentPoint,
  getCurrentPossession,
  getEffectiveGameTo,
  getGameScore,
  getLastAction,
  getLineReceivingSideId,
  getOtherSideId,
  getPointActionParticipantIds,
  getPointScoringSideId,
  getReceivingSideForNextPoint,
  getScrimmageParticipantSideAssignments,
  hasPointEnded,
  isAdvancedGameOver,
  isPointEndingThrow,
  isPossessionOver,
  isTurnoverThrow,
  reconcilePointSubsAfterLineCorrection,
  syncDerivedHalftimeTransition,
} from '../trackingUtils';
import type { InjurySubInput } from '../trackingUtils';
import type {
  AdvancedTrackedGame,
  PointLine,
  PointPossession,
  StoppageAction,
  ThrowAction,
  TrackedPoint,
} from '../types';

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

describe('getPointActionParticipantIds', () => {
  it('collects known pull, pickup, throw, receiver, and defender participants', () => {
    const point = makePoint([
      makePossession(HOME, [
        {
          id: 'pull-1',
          kind: 'pull',
          sideId: AWAY,
          receivingSideId: HOME,
          puller: meves,
          receiver: august,
          result: 'inbound',
        },
        {
          id: 'pickup-1',
          kind: 'disc_pickup',
          sideId: HOME,
          player: { refType: 'participant', participantId: 'p_pickup' },
        },
        {
          id: 'throw-1',
          kind: 'throw',
          sideId: HOME,
          thrower: august,
          toPlayer: { refType: 'participant', participantId: 'p_receiver' },
          defender: { refType: 'participant', participantId: 'p_defender' },
          result: 'block',
        },
        {
          id: 'stoppage-1',
          kind: 'stoppage',
          reason: 'injury',
          sideId: HOME,
        },
      ]),
    ]);

    expect(new Set(getPointActionParticipantIds(point))).toEqual(
      new Set([august.participantId, meves.participantId, 'p_pickup', 'p_receiver', 'p_defender']),
    );
  });
});

describe('line-correction injury reconciliation', () => {
  const stoppage: StoppageAction = {
    id: 'stoppage-1',
    kind: 'stoppage',
    reason: 'injury',
  };
  const pickup = {
    id: 'pickup-1',
    kind: 'disc_pickup' as const,
    sideId: HOME,
    player: meves,
  };
  const sub = {
    id: 'sub-home',
    type: 'injury' as const,
    sideId: HOME,
    inIds: [meves.participantId],
    outIds: [august.participantId],
    stoppageActionId: stoppage.id,
  };

  it('drops a sub invalidated by the corrected starting line', () => {
    const point: TrackedPoint = {
      ...makePoint([makePossession(HOME, [stoppage])]),
      lines: [{ sideId: HOME, participantIds: [meves.participantId] }],
      subs: [sub],
    };

    expect(reconcilePointSubsAfterLineCorrection(point, new Set([HOME]))).toBeUndefined();
  });

  it('allows an action participant to move from a sub onto the corrected starting line', () => {
    const originalPoint: TrackedPoint = {
      ...makePoint([makePossession(HOME, [stoppage, pickup])]),
      subs: [sub],
    };
    const candidatePoint: TrackedPoint = {
      ...originalPoint,
      lines: [{ sideId: HOME, participantIds: [meves.participantId] }],
      subs: undefined,
    };

    expect(() =>
      assertPointActionParticipantsPreserved(baseGame, originalPoint, candidatePoint),
    ).not.toThrow();
  });

  it('rejects orphaning an action participant when an invalidated sub is removed', () => {
    const originalPoint: TrackedPoint = {
      ...makePoint([makePossession(HOME, [stoppage, pickup])]),
      subs: [sub],
    };
    const candidatePoint: TrackedPoint = {
      ...originalPoint,
      subs: undefined,
    };

    expect(() =>
      assertPointActionParticipantsPreserved(baseGame, originalPoint, candidatePoint),
    ).toThrow(
      'Meves has recorded an action this point, so this correction cannot remove them from the active lineup at that time.',
    );
  });
});

function makeStoppageAction(overrides: Partial<StoppageAction> = {}): StoppageAction {
  return {
    id: 'stoppage-1',
    kind: 'stoppage',
    reason: 'injury',
    recordedAt: 2000,
    ...overrides,
  };
}

function makeInjurySubInput(overrides: Partial<InjurySubInput> = {}): InjurySubInput {
  return {
    stoppageActionId: 'stoppage-1',
    sideId: HOME,
    inIds: [august.participantId],
    outIds: [meves.participantId],
    ...overrides,
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
    for (const result of ['complete', 'drop', 'throwaway', 'stall', 'block'] as const) {
      expect(isPointEndingThrow(result)).toBe(false);
    }
  });
});

describe('isTurnoverThrow', () => {
  it('returns true for all turnover results', () => {
    for (const result of ['drop', 'throwaway', 'stall', 'block'] as const) {
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
    for (const result of ['inbound', 'ob'] as const) {
      expect(didPullTurnOver(result)).toBe(false);
    }
  });
});

// ── isPossessionClosed ────────────────────────────────────────────────────────

describe('isPossessionOver', () => {
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

  it('returns true after a turnover followed by an injury stoppage', () => {
    const pos = makePossession(HOME, [
      {
        id: 'a1',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: meves,
        result: 'drop',
      },
      {
        id: 'a2',
        kind: 'stoppage',
        reason: 'injury',
        sideId: HOME,
        recordedAt: 100,
        pausedAt: 100,
        resumedAt: 200,
      },
    ]);
    expect(isPossessionOver(pos)).toBe(true);
  });

  it('returns false after a completion followed by an injury stoppage', () => {
    const pos = makePossession(HOME, [
      {
        id: 'a1',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: meves,
        result: 'complete',
      },
      {
        id: 'a2',
        kind: 'stoppage',
        reason: 'injury',
        sideId: HOME,
        recordedAt: 100,
        pausedAt: 100,
        resumedAt: 200,
      },
    ]);
    expect(isPossessionOver(pos)).toBe(false);
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

  it('returns false after an inbound pull', () => {
    const pos = makePossession(HOME, [
      {
        id: 'a1',
        kind: 'pull',
        sideId: AWAY,
        receivingSideId: HOME,
        puller: untracked,
        result: 'inbound',
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

  it('returns the opposing side on a callahan even when the thrower is on the same side', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'callahan' },
    ]);
    expect(getPointScoringSideId(baseGame, makePoint([pos]))).toBe(AWAY);
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

  it('uses the same game-over rules for a scrimmage', () => {
    const winningPoint = makePoint([
      makePossession(HOME, [
        { id: 'goal', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
      ]),
    ]);

    expect(
      isAdvancedGameOver({
        ...baseGame,
        gameType: 'scrimmage',
        settings: { locationMode: 'none', format: { formatType: 'standard', gameTo: 1 } },
        sides: [
          { id: HOME, label: 'Light', trackingMode: 'full-roster' },
          { id: AWAY, label: 'Dark', trackingMode: 'full-roster' },
        ],
        points: [winningPoint],
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

  it('ignores a hard_cap transition when hard cap tracking is disabled', () => {
    const point = makePoint([
      makePossession(HOME, [
        { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
      ]),
    ]);

    expect(
      isAdvancedGameOver({
        ...baseGame,
        settings: {
          locationMode: 'none',
          format: { formatType: 'standard', gameTo: 15, hardCapEnabled: false },
        },
        points: [point],
        gameTransitions: [{ id: 'hard1', transitionType: 'hard_cap', afterPointId: point.id }],
      }),
    ).toBe(false);
  });

  it('returns false when hard cap has been reached but the score is tied (universe point continues)', () => {
    // USAU 6.D.2: if score is tied when hard cap scoring attempt completes, play continues until one additional goal
    const game: AdvancedTrackedGame = {
      ...baseGame,
      settings: { locationMode: 'none', format: { formatType: 'standard', gameTo: 15 } },
      points: [
        makePoint([
          makePossession(HOME, [
            { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
          ]),
        ]),
        {
          ...makePoint([
            makePossession(AWAY, [
              { id: 'a2', kind: 'throw', sideId: AWAY, thrower: untracked, result: 'goal' },
            ]),
          ]),
          id: 'pt2',
        },
      ],
      gameTransitions: [{ id: 'hard1', transitionType: 'hard_cap', afterPointId: 'pt2' }],
    };
    expect(isAdvancedGameOver(game)).toBe(false);
  });
});

describe('getEffectiveGameTo — soft cap edge cases', () => {
  it('adds one to higherScore unconditionally when soft cap is in effect (even if already at or above base gameTo)', () => {
    // USAU 6.D.1: "one is added to the higher score and the resulting number is the new game total."
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

    // Score is 1-0. Old code returned 2 (1 < 15). New code also returns 2.
    expect(getEffectiveGameTo(game)).toBe(2);
  });

  it('soft cap with tied score at base gameTo minus one sets target to base gameTo', () => {
    // 14-14 in game to 15 → effective target should be 15
    const points = Array.from({ length: 28 }, (_, index) => ({
      ...makePoint([
        makePossession(index % 2 === 0 ? HOME : AWAY, [
          {
            id: `a${index}`,
            kind: 'throw',
            sideId: index % 2 === 0 ? HOME : AWAY,
            thrower: index % 2 === 0 ? august : untracked,
            result: 'goal',
          },
        ]),
      ]),
      id: `pt${index}`,
    }));
    const game: AdvancedTrackedGame = {
      ...baseGame,
      settings: { locationMode: 'none', format: { formatType: 'standard', gameTo: 15 } },
      points,
      gameTransitions: [{ id: 'soft1', transitionType: 'soft_cap', afterPointId: 'pt27' }],
    };
    expect(getEffectiveGameTo(game)).toBe(15);
  });

  it('ignores a soft_cap transition when soft cap tracking is disabled', () => {
    const point = makePoint([
      makePossession(HOME, [
        { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
      ]),
    ]);
    const game: AdvancedTrackedGame = {
      ...baseGame,
      settings: {
        locationMode: 'none',
        format: { formatType: 'standard', gameTo: 15, softCapEnabled: false },
      },
      points: [point],
      gameTransitions: [{ id: 'soft1', transitionType: 'soft_cap', afterPointId: point.id }],
    };

    expect(getEffectiveGameTo(game)).toBe(15);
  });
});

describe('didLastOperationEndCurrentPoint', () => {
  const endedPoint = makePoint([
    makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
    ]),
  ]);

  it('returns true when the last undoable action belongs to the current point', () => {
    const game = makeGame([{ ...endedPoint, id: 'pt1' }]);

    expect(didLastOperationEndCurrentPoint(game, { kind: 'action', pointId: 'pt1' })).toBe(true);
  });

  it('returns true for an amended goal on the current point', () => {
    const game = makeGame([{ ...endedPoint, id: 'pt1' }]);

    expect(
      didLastOperationEndCurrentPoint(game, { kind: 'amend_throw_result', pointId: 'pt1' }),
    ).toBe(true);
  });

  it('returns false for between-point operations', () => {
    const game = makeGame([{ ...endedPoint, id: 'pt1' }]);

    expect(
      didLastOperationEndCurrentPoint(game, { kind: 'between_point_timeout', pointId: 'pt1' }),
    ).toBe(false);
  });

  it('returns false for the early-halftime undo marker', () => {
    const game = makeGame([{ ...endedPoint, id: 'pt1' }]);

    expect(didLastOperationEndCurrentPoint(game, { kind: 'halftime_early', pointId: 'pt1' })).toBe(
      false,
    );
  });

  it('returns false when the undo entry belongs to an earlier point', () => {
    const game = makeGame([
      { ...endedPoint, id: 'pt1' },
      { ...endedPoint, id: 'pt2' },
    ]);

    expect(didLastOperationEndCurrentPoint(game, { kind: 'action', pointId: 'pt1' })).toBe(false);
  });
});

describe('canStartSecondHalfEarly', () => {
  const endedPoint = makePoint([
    makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
    ]),
  ]);

  function makeHalftimeGame(point: TrackedPoint): AdvancedTrackedGame {
    return {
      ...baseGame,
      settings: {
        locationMode: 'none',
        format: { formatType: 'standard', gameTo: 15, halftimeAt: 8 },
      },
      points: [point],
    };
  }

  it('returns true after the latest point-ending operation', () => {
    const game = makeHalftimeGame({ ...endedPoint, id: 'pt1' });

    expect(canStartSecondHalfEarly(game, { kind: 'action', pointId: 'pt1' })).toBe(true);
  });

  it('returns false when halftime is disabled', () => {
    const game: AdvancedTrackedGame = {
      ...makeHalftimeGame({ ...endedPoint, id: 'pt1' }),
      settings: { locationMode: 'none', format: { formatType: 'standard', gameTo: 15 } },
    };

    expect(canStartSecondHalfEarly(game, { kind: 'action', pointId: 'pt1' })).toBe(false);
  });

  it('returns false while the current point is still active', () => {
    const game = makeHalftimeGame({
      ...makePoint([makePossession(HOME, [])]),
      id: 'pt1',
    });

    expect(canStartSecondHalfEarly(game, { kind: 'action', pointId: 'pt1' })).toBe(false);
  });

  it('returns false when a halftime transition already exists', () => {
    const game: AdvancedTrackedGame = {
      ...makeHalftimeGame({ ...endedPoint, id: 'pt1' }),
      gameTransitions: [{ id: 'ht1', transitionType: 'halftime', afterPointId: 'pt1' }],
    };

    expect(canStartSecondHalfEarly(game, { kind: 'action', pointId: 'pt1' })).toBe(false);
  });

  it('returns false after a non-point-ending undoable operation', () => {
    const game = makeHalftimeGame({ ...endedPoint, id: 'pt1' });

    expect(canStartSecondHalfEarly(game, { kind: 'between_point_timeout', pointId: 'pt1' })).toBe(
      false,
    );
  });

  it('returns false when the game is already over', () => {
    const game: AdvancedTrackedGame = {
      ...makeHalftimeGame({ ...endedPoint, id: 'pt1' }),
      settings: {
        locationMode: 'none',
        format: { formatType: 'standard', gameTo: 1, halftimeAt: 1 },
      },
    };

    expect(canStartSecondHalfEarly(game, { kind: 'action', pointId: 'pt1' })).toBe(false);
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

  it('callahan by HOME means AWAY receives next (scoring side pulls)', () => {
    // HOME receives, but AWAY throws a callahan → AWAY scores, HOME receives next
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [{ sideId: HOME, participantIds: [august.participantId] }],
      possessions: [
        makePossession(HOME, [
          { id: 'a1', kind: 'throw', sideId: HOME, thrower: untracked, result: 'callahan' },
        ]),
      ],
    };
    expect(getReceivingSideForNextPoint(makeGame([point]))).toBe(HOME);
  });

  it('callahan by AWAY means HOME receives next', () => {
    // AWAY receives, but HOME throws a callahan → HOME scores, AWAY receives next
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [{ sideId: AWAY, participantIds: [meves.participantId] }],
      possessions: [
        makePossession(AWAY, [
          { id: 'a1', kind: 'throw', sideId: AWAY, thrower: untracked, result: 'callahan' },
        ]),
      ],
    };
    expect(getReceivingSideForNextPoint(makeGame([point]))).toBe(AWAY);
  });
});

// ── getLineReceivingSideId ───────────────────────────────────────────────────

describe('getLineReceivingSideId', () => {
  it('returns initialReceivingSideId before any point exists', () => {
    expect(getLineReceivingSideId(makeGame([]), null)).toBe(HOME);
  });

  it('returns the current point receiving side while a point is in progress', () => {
    const point = makePoint([
      makePossession(AWAY, [
        {
          id: 'a1',
          kind: 'pull',
          sideId: HOME,
          receivingSideId: AWAY,
          puller: august,
          result: 'inbound',
        },
      ]),
    ]);

    expect(getLineReceivingSideId(makeGame([point]), point)).toBe(AWAY);
  });

  it('returns initialReceivingSideId for an empty in-progress point shell', () => {
    const point = { ...makePoint([]), possessions: [] };

    expect(getLineReceivingSideId(makeGame([point]), point)).toBe(HOME);
  });

  it('returns the next receiving side after a completed point', () => {
    const point = makePoint([
      makePossession(HOME, [
        { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
      ]),
    ]);

    expect(getLineReceivingSideId(makeGame([point]), point)).toBe(AWAY);
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

  const scrimmageParticipants = Array.from({ length: 14 }, (_, index) => ({
    id: `scrim-${index + 1}`,
    name: `Player ${index + 1}`,
  }));
  const scrimmageGame: AdvancedTrackedGame = {
    ...baseGame,
    gameType: 'scrimmage',
    sides: [
      { id: HOME, label: 'Light', trackingMode: 'full-roster' },
      { id: AWAY, label: 'Dark', trackingMode: 'full-roster' },
    ],
    participants: scrimmageParticipants,
  };
  const lightIds = scrimmageParticipants.slice(0, 7).map((participant) => participant.id);
  const darkIds = scrimmageParticipants.slice(7).map((participant) => participant.id);

  it('accepts two unique seven-player scrimmage lines', () => {
    const lines = [
      { sideId: HOME, participantIds: lightIds },
      { sideId: AWAY, participantIds: darkIds },
    ];

    expect(() => assertValidLines(scrimmageGame, lines)).not.toThrow();
  });

  it('applies both-side line validation to a non-scrimmage game with two tracked rosters', () => {
    const dualTrackedGame: AdvancedTrackedGame = {
      ...scrimmageGame,
      gameType: 'game',
    };
    const lines = [
      { sideId: HOME, participantIds: lightIds },
      { sideId: AWAY, participantIds: darkIds },
    ];

    expect(() => assertValidLines(dualTrackedGame, lines)).not.toThrow();
    expect(() => assertValidLines(dualTrackedGame, [lines[0]])).toThrow(
      'exactly one line for each side',
    );
  });

  it('rejects a scrimmage point without both sides', () => {
    expect(() =>
      assertValidLines(scrimmageGame, [{ sideId: HOME, participantIds: lightIds }]),
    ).toThrow('exactly one line for each side');
  });

  it('rejects short-sided scrimmage lines', () => {
    const lines = [
      { sideId: HOME, participantIds: lightIds.slice(0, 6) },
      { sideId: AWAY, participantIds: darkIds },
    ];

    expect(() => assertValidLines(scrimmageGame, lines)).toThrow('seven participants on each side');
  });

  it('rejects a participant selected for both scrimmage sides', () => {
    const lines = [
      { sideId: HOME, participantIds: lightIds },
      { sideId: AWAY, participantIds: [...darkIds.slice(0, 6), lightIds[0]] },
    ];

    expect(() => assertValidLines(scrimmageGame, lines)).toThrow('cannot play for both sides');
  });
});

// ── assertValidInjurySubInput ─────────────────────────────────────────────────

describe('assertValidInjurySubInput', () => {
  it('does not throw for valid input', () => {
    const point = makePoint([makePossession(HOME, [makeStoppageAction()])]);
    const game = makeGame([point]);
    const input = makeInjurySubInput();

    expect(() => assertValidInjurySubInput(game, point, input)).not.toThrow();
  });

  it('throws when stoppageActionId is not found in any possession', () => {
    const point = makePoint([makePossession(HOME, [makeStoppageAction()])]);
    const game = makeGame([point]);
    const input = makeInjurySubInput({ stoppageActionId: 'nonexistent' });

    expect(() => assertValidInjurySubInput(game, point, input)).toThrow(
      'Stoppage action "nonexistent" not found in current point.',
    );
  });

  it('throws when action is not a stoppage', () => {
    const throwAction: ThrowAction = {
      id: 'throw-1',
      kind: 'throw',
      sideId: HOME,
      thrower: august,
      result: 'complete',
      recordedAt: 3000,
    };
    const possession = makePossession(HOME, [throwAction]);
    const point = makePoint([possession]);
    const game = makeGame([point]);
    const input = makeInjurySubInput({ stoppageActionId: 'throw-1' });

    expect(() => assertValidInjurySubInput(game, point, input)).toThrow(
      'Action "throw-1" is not a stoppage.',
    );
  });

  it('throws when stoppage reason is not injury', () => {
    const possession = makePossession(HOME, [makeStoppageAction({ reason: 'timeout' })]);
    const point = makePoint([possession]);
    const game = makeGame([point]);
    const input = makeInjurySubInput();

    expect(() => assertValidInjurySubInput(game, point, input)).toThrow(
      'Only injury stoppages can have subs.',
    );
  });

  it('throws when sideId is unknown', () => {
    const point = makePoint([makePossession(HOME, [makeStoppageAction()])]);
    const game = makeGame([point]);
    const input = makeInjurySubInput({ sideId: 'unknown-side' });

    expect(() => assertValidInjurySubInput(game, point, input)).toThrow(
      'Unknown sideId "unknown-side"',
    );
  });

  it('throws when inIds contain an unknown participant', () => {
    const point = makePoint([makePossession(HOME, [makeStoppageAction()])]);
    const game = makeGame([point]);
    const input = makeInjurySubInput({ inIds: ['unknown-participant'] });

    expect(() => assertValidInjurySubInput(game, point, input)).toThrow(
      'Unknown participantId "unknown-participant"',
    );
  });

  it('throws when outIds contain an unknown participant', () => {
    const point = makePoint([makePossession(HOME, [makeStoppageAction()])]);
    const game = makeGame([point]);
    const input = makeInjurySubInput({ outIds: ['unknown-participant'] });

    expect(() => assertValidInjurySubInput(game, point, input)).toThrow(
      'Unknown participantId "unknown-participant"',
    );
  });

  it('finds the stoppage across multiple possessions', () => {
    const firstPossession = makePossession(AWAY, [
      {
        id: 'pickup-1',
        kind: 'disc_pickup' as const,
        sideId: AWAY,
        player: august,
        recordedAt: 3000,
      },
    ]);
    const secondPossession = makePossession(HOME, [makeStoppageAction({ id: 'stoppage-2' })]);
    const point = makePoint([firstPossession, secondPossession]);
    const game = makeGame([point]);
    const input = makeInjurySubInput({ stoppageActionId: 'stoppage-2' });

    expect(() => assertValidInjurySubInput(game, point, input)).not.toThrow();
  });

  it('throws when point has no possessions', () => {
    const point = { ...makePoint([]), possessions: [] };
    const game = makeGame([point]);
    const input = makeInjurySubInput();

    expect(() => assertValidInjurySubInput(game, point, input)).toThrow(
      'Stoppage action "stoppage-1" not found in current point.',
    );
  });
});

// ── getAdvancedRecentLines ────────────────────────────────────────────────────

const _sid = (id: string, label: string) => ({ id, label, trackingMode: 'full-roster' }) as const;

const _participant = (id: string, name: string) => ({ id, name });

const _line = (sideId: string, participantIds: string[]): PointLine => ({ sideId, participantIds });

const _point = (id: string, lines: PointLine[]): TrackedPoint => ({ id, lines, possessions: [] });

const _makeGame = (overrides: Partial<AdvancedTrackedGame> = {}): AdvancedTrackedGame => ({
  id: 'rg1',
  schemaVersion: 1,
  createdAt: 0,
  updatedAt: 0,
  gameType: 'game',
  status: 'in_progress',
  focusSideId: 'side-a',
  initialReceivingSideId: 'side-a',
  sides: [_sid('side-a', 'Us'), _sid('side-b', 'Them')],
  participants: [
    _participant('p1', 'Alice'),
    _participant('p2', 'Bob'),
    _participant('p3', 'Carol'),
    _participant('p4', 'Dave'),
    _participant('p5', 'Eve'),
    _participant('p6', 'Frank'),
    _participant('p7', 'Grace'),
  ],
  points: [],
  settings: { locationMode: 'none' },
  ...overrides,
});

describe('getScrimmageParticipantSideAssignments', () => {
  it('assigns players to the most recent side they played for', () => {
    const game = _makeGame({
      gameType: 'scrimmage',
      points: [
        _point('pt1', [_line('side-a', ['p1']), _line('side-b', ['p2'])]),
        _point('pt2', [_line('side-a', ['p3']), _line('side-b', ['p1'])]),
      ],
    });

    expect([...getScrimmageParticipantSideAssignments(game)]).toEqual([
      ['p1', 'side-b'],
      ['p2', 'side-b'],
      ['p3', 'side-a'],
    ]);
  });

  it('counts an injury sub as the incoming player joining that side', () => {
    const point = _point('pt1', [_line('side-a', ['p1']), _line('side-b', ['p2'])]);
    point.subs = [
      {
        id: 'sub-1',
        sideId: 'side-a',
        type: 'injury',
        inIds: ['p4'],
        outIds: ['p1'],
        stoppageActionId: 'stoppage-1',
      },
    ];
    const game = _makeGame({ gameType: 'scrimmage', points: [point] });

    expect(getScrimmageParticipantSideAssignments(game).get('p4')).toBe('side-a');
  });

  it('leaves every player unassigned for a regular game', () => {
    const game = _makeGame({
      points: [_point('pt1', [_line('side-a', ['p1'])])],
    });

    expect(getScrimmageParticipantSideAssignments(game).size).toBe(0);
  });
});

describe('getAdvancedRecentLines', () => {
  it('returns empty when there are no points', () => {
    const game = _makeGame();
    expect(getAdvancedRecentLines(game)).toEqual([]);
  });

  it('returns empty when the focus side has no lines in any point', () => {
    const game = _makeGame({
      points: [
        _point('pt1', [_line('side-b', ['p1', 'p2', 'p3'])]),
        _point('pt2', [_line('side-b', ['p4', 'p5', 'p6'])]),
      ],
    });
    expect(getAdvancedRecentLines(game)).toEqual([]);
  });

  it('returns the last 3 distinct focus-side lines (most recent first)', () => {
    const game = _makeGame({
      focusSideId: 'side-a',
      points: [
        _point('pt1', [_line('side-a', ['p1', 'p2', 'p3']), _line('side-b', ['p4', 'p5', 'p6'])]),
        _point('pt2', [_line('side-a', ['p2', 'p3', 'p4']), _line('side-b', ['p5', 'p6', 'p7'])]),
        _point('pt3', [_line('side-a', ['p3', 'p4', 'p5']), _line('side-b', ['p6', 'p7', 'p1'])]),
        _point('pt4', [_line('side-a', ['p4', 'p5', 'p6']), _line('side-b', ['p7', 'p1', 'p2'])]),
        _point('pt5', [_line('side-a', ['p5', 'p6', 'p7']), _line('side-b', ['p1', 'p2', 'p3'])]),
      ],
    });

    const result = getAdvancedRecentLines(game);

    expect(result).toEqual([
      { pointNumber: 5, playerIds: ['p5', 'p6', 'p7'] },
      { pointNumber: 4, playerIds: ['p4', 'p5', 'p6'] },
      { pointNumber: 3, playerIds: ['p3', 'p4', 'p5'] },
    ]);
  });

  it('deduplicates by player set (order-independent)', () => {
    const game = _makeGame({
      focusSideId: 'side-a',
      points: [
        _point('pt1', [_line('side-a', ['p1', 'p2', 'p3'])]),
        _point('pt2', [_line('side-a', ['p3', 'p2', 'p1'])]),
        _point('pt3', [_line('side-a', ['p1', 'p2', 'p4'])]),
      ],
    });

    const result = getAdvancedRecentLines(game);

    expect(result).toEqual([
      { pointNumber: 3, playerIds: ['p1', 'p2', 'p4'] },
      { pointNumber: 2, playerIds: ['p3', 'p2', 'p1'] },
    ]);
  });

  it('skips points where focus side line is missing', () => {
    const game = _makeGame({
      focusSideId: 'side-a',
      points: [
        _point('pt1', [_line('side-b', ['p1', 'p2', 'p3'])]),
        _point('pt2', [_line('side-a', ['p4', 'p5', 'p6'])]),
        _point('pt3', [_line('side-b', ['p1', 'p2', 'p3'])]),
      ],
    });

    const result = getAdvancedRecentLines(game);

    expect(result).toEqual([{ pointNumber: 2, playerIds: ['p4', 'p5', 'p6'] }]);
  });

  it('returns recent lines for a requested non-focus side', () => {
    const game = _makeGame({
      points: [
        _point('pt1', [_line('side-a', ['p1']), _line('side-b', ['p4', 'p5', 'p6'])]),
        _point('pt2', [_line('side-a', ['p2']), _line('side-b', ['p5', 'p6', 'p7'])]),
      ],
    });

    expect(getAdvancedRecentLines(game, 'side-b')).toEqual([
      { pointNumber: 2, playerIds: ['p5', 'p6', 'p7'] },
      { pointNumber: 1, playerIds: ['p4', 'p5', 'p6'] },
    ]);
  });
});
