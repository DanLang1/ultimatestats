import {
  canCallTimeout,
  getActiveSideId,
  getCompletedGameClockPauseMs,
  getCompletedGameClockPauseMsDuringPoint,
  getCompletedPauseMs,
  getDiscHolderId,
  getDiscHolderRef,
  getEffectiveLineParticipantIds,
  getGameClockElapsedMs,
  getLineParticipantIdsBeforeSub,
  getLastTurnoverEvent,
  getGoalInfo,
  getPassChainEvents,
  getPointAdjustedTimestamp,
  getSafeDiscHolderRef,
  getSideTimeoutState,
  getSubsForStoppage,
  getTrackerDisplaySideId,
  getTrackerInstructionColor,
  getTrackerInstructionText,
  isPullAwaitingPickup,
} from '../trackingDisplayHelpers';
import type { AdvancedTrackedGame, PointPossession, PointSub, TrackedPoint } from '../types';

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

function makePossession(sideId: string, actions: PointPossession['actions'] = []): PointPossession {
  return { id: 'pos1', sideId, actions };
}

// --- Helpers ---
// Fixtures
const p_august = { id: 'p_august', name: 'August' };
const p_meves = { id: 'p_meves', name: 'Meves' };
const participants = [p_august, p_meves];

describe('getGoalInfo', () => {
  it('identifies a focus team goal', () => {
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      possessions: [
        {
          id: 'pos1',
          sideId: HOME,
          actions: [
            {
              id: 'a1',
              kind: 'throw',
              sideId: HOME,
              thrower: august,
              toPlayer: meves,
              result: 'goal',
            },
          ],
        },
      ],
    };
    const info = getGoalInfo(point, HOME, participants);
    expect(info).toEqual({
      isFocusGoal: true,
      isCallahan: false,
      scorerName: 'Meves',
      assisterName: 'August',
    });
  });

  it('identifies an opponent team goal', () => {
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      possessions: [
        {
          id: 'pos1',
          sideId: AWAY,
          actions: [
            {
              id: 'a1',
              kind: 'throw',
              sideId: AWAY,
              thrower: untracked,
              result: 'goal',
            },
          ],
        },
      ],
    };
    const info = getGoalInfo(point, HOME, participants);
    expect(info?.isFocusGoal).toBe(false);
    expect(info?.isCallahan).toBe(false);
  });

  it('identifies a focus team Callahan (caught from opponent)', () => {
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      possessions: [
        {
          id: 'pos1',
          sideId: AWAY,
          actions: [
            {
              id: 'a1',
              kind: 'throw',
              sideId: AWAY,
              thrower: untracked,
              toPlayer: august,
              result: 'callahan',
            },
          ],
        },
      ],
    };
    const info = getGoalInfo(point, HOME, participants);
    expect(info?.isFocusGoal).toBe(true);
    expect(info?.isCallahan).toBe(true);
    expect(info?.scorerName).toBe('August');
  });

  it('identifies an opponent team Callahan (thrown by focus team)', () => {
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      possessions: [
        {
          id: 'pos1',
          sideId: HOME,
          actions: [
            {
              id: 'a1',
              kind: 'throw',
              sideId: HOME,
              thrower: august,
              toPlayer: untracked,
              result: 'callahan',
            },
          ],
        },
      ],
    };
    const info = getGoalInfo(point, HOME, participants);
    // (sideId=HOME === focusSideId=HOME) !== isCallahan=true  =>  true !== true  =>  false
    expect(info?.isFocusGoal).toBe(false);
    expect(info?.isCallahan).toBe(true);
  });

  it('returns null if last action is not a goal', () => {
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      possessions: [
        {
          id: 'pos1',
          sideId: HOME,
          actions: [{ id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'complete' }],
        },
      ],
    };
    expect(getGoalInfo(point, HOME, participants)).toBeNull();
  });
});

describe('getActiveSideId', () => {
  it('returns focusSideId for null possession', () => {
    expect(getActiveSideId(null, baseGame)).toBe(HOME);
  });

  it('returns current side if possession is active', () => {
    const pos = makePossession(AWAY, [
      { id: 'a1', kind: 'disc_pickup', sideId: AWAY, player: untracked },
    ]);
    expect(getActiveSideId(pos, baseGame)).toBe(AWAY);
  });

  it('returns other side if possession is over', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'throwaway' },
    ]);
    expect(getActiveSideId(pos, baseGame)).toBe(AWAY);
  });

  it('returns other side after a turnover followed by an injury stoppage', () => {
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
    expect(getActiveSideId(pos, baseGame)).toBe(AWAY);
  });
});

describe('getTrackerDisplaySideId', () => {
  const dualTrackedGame: AdvancedTrackedGame = {
    ...baseGame,
    gameType: 'scrimmage',
    sides: baseGame.sides.map((side) => ({ ...side, trackingMode: 'full-roster' })),
  };

  it('switches to the receiving side after a dual-tracked turnover', () => {
    const possession = makePossession(HOME, [
      {
        id: 'drop1',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: meves,
        result: 'drop',
      },
    ]);
    const point: TrackedPoint = {
      id: 'point1',
      lines: [],
      possessions: [possession],
    };

    expect(getTrackerDisplaySideId(dualTrackedGame, possession, point)).toBe(AWAY);
  });

  it('retains the scoring side after a dual-tracked goal', () => {
    const possession = makePossession(HOME, [
      {
        id: 'goal1',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: meves,
        result: 'goal',
      },
    ]);
    const point: TrackedPoint = {
      id: 'point1',
      lines: [],
      possessions: [possession],
    };

    expect(getTrackerDisplaySideId(dualTrackedGame, possession, point)).toBe(HOME);
  });
});

describe('getDiscHolderId', () => {
  it('returns null if not focus side possession', () => {
    const pos = makePossession(AWAY);
    expect(getDiscHolderId(pos, HOME)).toBeNull();
  });

  it('returns null if possession is over', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'throw', sideId: HOME, thrower: august, result: 'goal' },
    ]);
    expect(getDiscHolderId(pos, HOME)).toBeNull();
  });

  it('identifies disc holder from pickup', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
    ]);
    expect(getDiscHolderId(pos, HOME)).toBe(august.participantId);
  });

  it('identifies disc holder after a completion', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
      {
        id: 'a2',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: meves,
        result: 'complete',
      },
    ]);
    expect(getDiscHolderId(pos, HOME)).toBe(meves.participantId);
  });
});

describe('getDiscHolderRef', () => {
  const unknown = { refType: 'unknown' as const };

  it('returns null if not focus side possession', () => {
    const pos = makePossession(AWAY);
    expect(getDiscHolderRef(pos, HOME)).toBeNull();
  });

  it('returns participant ref from pickup', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
    ]);
    expect(getDiscHolderRef(pos, HOME)).toEqual(august);
  });

  it('returns unknown ref from pickup', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: unknown },
    ]);
    expect(getDiscHolderRef(pos, HOME)).toEqual(unknown);
  });

  it('returns unknown ref after throw to unknown', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
      {
        id: 'a2',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: unknown,
        result: 'complete',
      },
    ]);
    expect(getDiscHolderRef(pos, HOME)).toEqual(unknown);
    expect(getDiscHolderId(pos, HOME)).toBeNull();
  });
});

describe('getSafeDiscHolderRef', () => {
  const unknown = { refType: 'unknown' as const };

  it('returns the holder after an off-disc injury stoppage resumes', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
      {
        id: 's1',
        kind: 'stoppage',
        reason: 'injury',
        recordedAt: 100,
        pausedAt: 100,
        resumedAt: 200,
      },
    ]);
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      possessions: [pos],
      subs: [
        {
          id: 'sub1',
          sideId: HOME,
          type: 'injury',
          inIds: ['p_extra'],
          outIds: [meves.participantId],
          stoppageActionId: 's1',
        },
      ],
    };
    expect(getSafeDiscHolderRef(pos, HOME, point)).toEqual(august);
  });

  it('returns null after an injury sub removes the holder', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
      {
        id: 's1',
        kind: 'stoppage',
        reason: 'injury',
        recordedAt: 100,
        pausedAt: 100,
        resumedAt: 200,
      },
    ]);
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      possessions: [pos],
      subs: [
        {
          id: 'sub1',
          sideId: HOME,
          type: 'injury',
          inIds: ['p_extra'],
          outIds: [august.participantId],
          stoppageActionId: 's1',
        },
      ],
    };
    expect(getSafeDiscHolderRef(pos, HOME, point)).toBeNull();
  });

  it('returns null after an injury stoppage when the holder is unknown', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: unknown },
      {
        id: 's1',
        kind: 'stoppage',
        reason: 'injury',
        recordedAt: 100,
        pausedAt: 100,
        resumedAt: 200,
      },
    ]);
    expect(getSafeDiscHolderRef(pos, HOME)).toBeNull();
  });

  it('returns the holder when no injury-resume is active', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
    ]);
    expect(getSafeDiscHolderRef(pos, HOME)).toEqual(august);
  });

  it('returns null for null possession', () => {
    expect(getSafeDiscHolderRef(null, HOME)).toBeNull();
  });

  it('returns unknown ref when holder is unknown', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: unknown },
    ]);
    expect(getSafeDiscHolderRef(pos, HOME)).toEqual(unknown);
  });
});

describe('getPassChainEvents', () => {
  it('returns empty events for null possession', () => {
    expect(getPassChainEvents(null, baseGame.participants)).toEqual({
      events: [],
      truncated: false,
    });
  });

  it('builds a chain from pickup + completion', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
      {
        id: 'a2',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: meves,
        result: 'complete',
      },
    ]);
    const { events, truncated } = getPassChainEvents(pos, baseGame.participants);
    expect(truncated).toBe(false);
    expect(events.map((e) => e.name)).toEqual(['August', 'Meves']);
    expect(events[0].id).toBe('a1');
    expect(events[1].id).toBe('a2');
  });

  it('limits to last maxDisplay entries and sets truncated', () => {
    const p1 = { refType: 'participant' as const, participantId: 'p1' };
    const p2 = { refType: 'participant' as const, participantId: 'p2' };
    const p3 = { refType: 'participant' as const, participantId: 'p3' };
    const p4 = { refType: 'participant' as const, participantId: 'p4' };
    const displayParticipants = [
      { id: 'p1', name: 'P1' },
      { id: 'p2', name: 'P2' },
      { id: 'p3', name: 'P3' },
      { id: 'p4', name: 'P4' },
    ];
    const pos = makePossession(HOME, [
      {
        id: 'a1',
        kind: 'throw',
        sideId: HOME,
        thrower: untracked,
        toPlayer: p1,
        result: 'complete',
      },
      { id: 'a2', kind: 'throw', sideId: HOME, thrower: p1, toPlayer: p2, result: 'complete' },
      { id: 'a3', kind: 'throw', sideId: HOME, thrower: p2, toPlayer: p3, result: 'complete' },
      { id: 'a4', kind: 'throw', sideId: HOME, thrower: p3, toPlayer: p4, result: 'complete' },
    ]);
    const { events, truncated } = getPassChainEvents(pos, displayParticipants);
    expect(truncated).toBe(true);
    expect(events.map((e) => e.name)).toEqual(['P2', 'P3', 'P4']);
  });

  it('includes unknown pickup and throws', () => {
    const unknown = { refType: 'unknown' as const };
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: unknown },
      {
        id: 'a2',
        kind: 'throw',
        sideId: HOME,
        thrower: unknown,
        toPlayer: meves,
        result: 'complete',
      },
    ]);
    const { events, truncated } = getPassChainEvents(pos, baseGame.participants);
    expect(truncated).toBe(false);
    expect(events.map((e) => e.name)).toEqual(['Unknown', 'Meves']);
  });

  it('includes unknown as throw receiver', () => {
    const unknown = { refType: 'unknown' as const };
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
      {
        id: 'a2',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: unknown,
        result: 'complete',
      },
    ]);
    const { events, truncated } = getPassChainEvents(pos, baseGame.participants);
    expect(truncated).toBe(false);
    expect(events.map((e) => e.name)).toEqual(['August', 'Unknown']);
  });

  it('keeps the visible chain after an off-disc injury sub', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
      {
        id: 'a2',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: meves,
        result: 'complete',
      },
      {
        id: 's1',
        kind: 'stoppage',
        reason: 'injury',
        recordedAt: 100,
        pausedAt: 100,
        resumedAt: 200,
      },
    ]);
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      possessions: [pos],
      subs: [
        {
          id: 'sub1',
          sideId: HOME,
          type: 'injury',
          inIds: ['p_extra'],
          outIds: ['p_other'],
          stoppageActionId: 's1',
        },
      ],
    };

    const { events, truncated } = getPassChainEvents(pos, baseGame.participants, 3, point);

    expect(truncated).toBe(false);
    expect(events.map((e) => e.name)).toEqual(['August', 'Meves']);
  });

  it('returns empty events while waiting for the post-injury restart pickup', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
      {
        id: 'a2',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: meves,
        result: 'complete',
      },
      {
        id: 's1',
        kind: 'stoppage',
        reason: 'injury',
        recordedAt: 100,
        pausedAt: 100,
        resumedAt: 200,
      },
    ]);
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      possessions: [pos],
      subs: [
        {
          id: 'sub1',
          sideId: HOME,
          type: 'injury',
          inIds: ['p_extra'],
          outIds: [meves.participantId],
          stoppageActionId: 's1',
        },
      ],
    };

    const { events, truncated } = getPassChainEvents(pos, baseGame.participants, 3, point);

    expect(truncated).toBe(false);
    expect(events).toEqual([]);
  });

  it('restarts the displayed chain after a resumed injury pickup', () => {
    const pos = makePossession(HOME, [
      { id: 'a1', kind: 'disc_pickup', sideId: HOME, player: august },
      {
        id: 'a2',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: meves,
        result: 'complete',
      },
      {
        id: 's1',
        kind: 'stoppage',
        reason: 'injury',
        recordedAt: 100,
        pausedAt: 100,
        resumedAt: 200,
      },
      { id: 'a3', kind: 'disc_pickup', sideId: HOME, player: august },
      {
        id: 'a4',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: meves,
        result: 'complete',
      },
    ]);

    const { events, truncated } = getPassChainEvents(pos, baseGame.participants);

    expect(truncated).toBe(false);
    expect(events.map((e) => e.name)).toEqual(['August', 'Meves']);
    expect(events.map((e) => e.id)).toEqual(['a3', 'a4']);
  });
});

describe('getEffectiveLineParticipantIds', () => {
  const makePoint = (participantIds: string[], subs?: TrackedPoint['subs']): TrackedPoint => ({
    id: 'pt1',
    lines: [{ sideId: HOME, participantIds }],
    subs,
    possessions: [],
  });

  const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];

  it('returns start line when no subs', () => {
    const point = makePoint(ids);
    expect(getEffectiveLineParticipantIds(point, HOME)).toEqual(ids);
  });

  it('applies a single out/in swap', () => {
    const sub: PointSub = {
      id: 's1',
      sideId: HOME,
      type: 'injury',
      outIds: ['p7'],
      inIds: ['p8'],
      stoppageActionId: 'stop1',
    };
    const point = makePoint(ids, [sub]);
    const result = getEffectiveLineParticipantIds(point, HOME);
    expect(result).not.toContain('p7');
    expect(result).toContain('p8');
    expect(result).toHaveLength(7);
  });

  it('applies two subs in sequence', () => {
    const subs: PointSub[] = [
      {
        id: 's1',
        sideId: HOME,
        type: 'injury',
        outIds: ['p7'],
        inIds: ['p8'],
        stoppageActionId: 'stop1',
      },
      {
        id: 's2',
        sideId: HOME,
        type: 'injury',
        outIds: ['p6'],
        inIds: ['p9'],
        stoppageActionId: 'stop2',
      },
    ];
    const point = makePoint(ids, subs);
    const result = getEffectiveLineParticipantIds(point, HOME);
    expect(result).not.toContain('p7');
    expect(result).not.toContain('p6');
    expect(result).toContain('p8');
    expect(result).toContain('p9');
    expect(result).toHaveLength(7);
  });

  it('handles player subbed out then back in', () => {
    const subs: PointSub[] = [
      {
        id: 's1',
        sideId: HOME,
        type: 'injury',
        outIds: ['p7'],
        inIds: ['p8'],
        stoppageActionId: 'stop1',
      },
      {
        id: 's2',
        sideId: HOME,
        type: 'injury',
        outIds: ['p8'],
        inIds: ['p7'],
        stoppageActionId: 'stop2',
      },
    ];
    const point = makePoint(ids, subs);
    const result = getEffectiveLineParticipantIds(point, HOME);
    expect(result).toContain('p7');
    expect(result).not.toContain('p8');
  });

  it('returns the line before a later sub for edit diffs', () => {
    const initialLine = ['bob', 'jerry', 'mike', 'john'];
    const subs: PointSub[] = [
      {
        id: 's1',
        sideId: HOME,
        type: 'injury',
        outIds: ['bob'],
        inIds: ['joey'],
        stoppageActionId: 'stop1',
      },
      {
        id: 's2',
        sideId: HOME,
        type: 'injury',
        outIds: ['joey'],
        inIds: ['chuck'],
        stoppageActionId: 'stop2',
      },
    ];
    const point = makePoint(initialLine, subs);

    expect(getEffectiveLineParticipantIds(point, HOME)).toEqual(['jerry', 'mike', 'john', 'chuck']);
    expect(getLineParticipantIdsBeforeSub(point, HOME, 'stop2')).toEqual([
      'jerry',
      'mike',
      'john',
      'joey',
    ]);
  });

  it('ignores subs for the other side', () => {
    const sub: PointSub = {
      id: 's1',
      sideId: AWAY,
      type: 'injury',
      outIds: ['p1'],
      inIds: ['p8'],
      stoppageActionId: 'stop1',
    };
    const point = makePoint(ids, [sub]);
    expect(getEffectiveLineParticipantIds(point, HOME)).toEqual(ids);
  });
});

describe('getSubsForStoppage', () => {
  const sub: PointSub = {
    id: 's1',
    sideId: HOME,
    type: 'injury',
    inIds: ['p8'],
    outIds: ['p7'],
    stoppageActionId: 'stop1',
  };
  const point: TrackedPoint = { id: 'pt1', lines: [], subs: [sub], possessions: [] };

  it('returns every side substitution linked to the stoppage', () => {
    const awaySub: PointSub = {
      ...sub,
      id: 's2',
      sideId: AWAY,
    };
    const pointWithBothSubs: TrackedPoint = {
      ...point,
      subs: [sub, awaySub],
    };

    expect(getSubsForStoppage(pointWithBothSubs, 'stop1')).toEqual([sub, awaySub]);
  });

  it('returns an empty array when no substitution matches', () => {
    expect(getSubsForStoppage(point, 'stop2')).toEqual([]);
    expect(getSubsForStoppage(null, 'stop1')).toEqual([]);
  });
});

describe('getSideTimeoutState', () => {
  it('counts between-point timeouts per side', () => {
    const gameWithTimeouts: AdvancedTrackedGame = {
      ...baseGame,
      settings: {
        locationMode: 'none',
        format: { formatType: 'standard', timeoutsPerHalf: 2, floaterEnabled: true },
      },
      points: [
        {
          id: 'p1',
          lines: [],
          possessions: [],
          transitionsAfter: [
            { id: 't1', transitionType: 'timeout', sideId: HOME },
            { id: 't2', transitionType: 'timeout', sideId: AWAY },
          ],
        },
        {
          id: 'p2',
          lines: [],
          possessions: [],
          transitionsAfter: [{ id: 't3', transitionType: 'timeout', sideId: HOME }],
        },
      ],
    };
    expect(getSideTimeoutState(gameWithTimeouts, HOME)).toMatchObject({
      regularUsedInHalf: 2,
      regularPerHalf: 2,
      floaterUsed: false,
      floaterEnabled: true,
      isSecondHalf: false,
    });
    expect(getSideTimeoutState(gameWithTimeouts, AWAY)).toMatchObject({
      regularUsedInHalf: 1,
      floaterUsed: false,
    });
  });

  it('resets regulars after halftime and tracks floater usage across the game', () => {
    const gameWithHalftime: AdvancedTrackedGame = {
      ...baseGame,
      settings: {
        locationMode: 'none',
        format: { formatType: 'standard', timeoutsPerHalf: 2, floaterEnabled: true },
      },
      gameTransitions: [{ id: 'ht', transitionType: 'halftime', afterPointId: 'p1' }],
      points: [
        {
          id: 'p1',
          lines: [],
          possessions: [
            {
              id: 'pos1',
              sideId: HOME,
              actions: [
                {
                  id: 's1',
                  kind: 'stoppage',
                  reason: 'timeout',
                  sideId: HOME,
                  recordedAt: 0,
                  pausedAt: 0,
                  resumedAt: 1,
                },
              ],
            },
          ],
          transitionsAfter: [{ id: 't1', transitionType: 'timeout', sideId: HOME }],
        },
        {
          id: 'p2',
          lines: [],
          possessions: [],
          transitionsAfter: [
            { id: 't2', transitionType: 'timeout', sideId: HOME },
            { id: 't3', transitionType: 'timeout', sideId: HOME, isFloater: true },
          ],
        },
      ],
    };
    const state = getSideTimeoutState(gameWithHalftime, HOME);
    expect(state).toMatchObject({
      regularUsedInHalf: 2,
      regularPerHalf: 2,
      floaterUsed: true,
      floaterEnabled: true,
      isSecondHalf: true,
    });
  });
});

describe('getCompletedPauseMs', () => {
  it('returns 0 for null point', () => {
    expect(getCompletedPauseMs(null)).toBe(0);
  });

  it('returns 0 when no stoppages', () => {
    const point: TrackedPoint = { id: 'pt1', lines: [], possessions: [] };
    expect(getCompletedPauseMs(point)).toBe(0);
  });

  it('sums completed stoppages across possessions', () => {
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      possessions: [
        {
          id: 'pos1',
          sideId: HOME,
          actions: [
            {
              id: 'a1',
              kind: 'stoppage',
              reason: 'timeout',
              sideId: HOME,
              recordedAt: 1000,
              pausedAt: 1000,
              resumedAt: 71000,
            },
          ],
        },
        {
          id: 'pos2',
          sideId: HOME,
          actions: [
            {
              id: 'a2',
              kind: 'stoppage',
              reason: 'injury',
              recordedAt: 80000,
              pausedAt: 80000,
              resumedAt: 95000,
            },
          ],
        },
      ],
    };
    expect(getCompletedPauseMs(point)).toBe(70000 + 15000);
  });

  it('ignores stoppages without resumedAt', () => {
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      possessions: [
        {
          id: 'pos1',
          sideId: HOME,
          actions: [
            {
              id: 'a1',
              kind: 'stoppage',
              reason: 'timeout',
              sideId: HOME,
              recordedAt: 1000,
              pausedAt: 1000,
            },
          ],
        },
      ],
    };
    expect(getCompletedPauseMs(point)).toBe(0);
  });
});

describe('getPointAdjustedTimestamp', () => {
  it('returns startedAt plus completed pause ms', () => {
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      startedAt: 10000,
      possessions: [
        {
          id: 'pos1',
          sideId: HOME,
          actions: [
            {
              id: 'a1',
              kind: 'stoppage',
              reason: 'timeout',
              sideId: HOME,
              recordedAt: 15000,
              pausedAt: 15000,
              resumedAt: 85000,
            },
          ],
        },
      ],
    };
    expect(getPointAdjustedTimestamp(point)).toBe(10000 + 70000);
  });

  it('adds completed game-clock pause ms when a game is provided', () => {
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      startedAt: 10000,
      possessions: [],
    };
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [point],
      gameClockPauses: [
        {
          id: 'pause1',
          reason: 'manual',
          pausedAt: 20000,
          resumedAt: 50000,
          pointId: point.id,
        },
      ],
    };

    expect(getPointAdjustedTimestamp(point, game)).toBe(40000);
  });

  it('uses revivedAt branch when elapsedMsAtEnd is set', () => {
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      startedAt: 10000,
      elapsedMsAtEnd: 45000,
      revivedAt: 200000,
      possessions: [],
    };
    // adjustedTimestamp = revivedAt - elapsedMsAtEnd  =>  200000 - 45000 = 155000
    expect(getPointAdjustedTimestamp(point)).toBe(155000);
  });

  it('falls back to startedAt path when only revivedAt is set without elapsedMsAtEnd', () => {
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      startedAt: 10000,
      revivedAt: 200000,
      possessions: [],
    };
    expect(getPointAdjustedTimestamp(point)).toBe(10000);
  });

  it('freezes timestamp when point has ended with elapsedMsAtEnd', () => {
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      startedAt: 10000,
      elapsedMsAtEnd: 45000,
      possessions: [
        makePossession(HOME, [
          {
            id: 'a1',
            kind: 'throw',
            sideId: HOME,
            thrower: untracked,
            result: 'goal',
            recordedAt: 55000,
          },
        ]),
      ],
    };
    // When point has ended, adjustedTimestamp should be Date.now() - elapsedMsAtEnd,
    // so that Date.now() - adjustedTimestamp = elapsedMsAtEnd (frozen point duration).
    const adjusted = getPointAdjustedTimestamp(point);
    const elapsed = Date.now() - adjusted;
    expect(elapsed).toBeCloseTo(45000, -1);
  });
});

describe('game clock pause helpers', () => {
  it('sums only completed game-clock pauses', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      gameClockPauses: [
        { id: 'pause1', reason: 'manual', pausedAt: 10000, resumedAt: 30000 },
        { id: 'pause2', reason: 'manual', pausedAt: 40000 },
        { id: 'pause3', reason: 'manual', pausedAt: 50000, resumedAt: 65000 },
      ],
    };

    expect(getCompletedGameClockPauseMs(game)).toBe(35000);
  });

  it('freezes game-clock elapsed at active pause start', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [{ id: 'pt1', lines: [], startedAt: 10000, possessions: [] }],
      gameClockPauses: [
        { id: 'pause1', reason: 'manual', pausedAt: 20000, resumedAt: 30000 },
        { id: 'pause2', reason: 'manual', pausedAt: 50000 },
      ],
    };

    expect(getGameClockElapsedMs(game, 90000)).toBe(30000);
  });

  it('subtracts completed game-clock pauses from elapsed game time', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [{ id: 'pt1', lines: [], startedAt: 10000, possessions: [] }],
      gameClockPauses: [
        { id: 'pause1', reason: 'manual', pausedAt: 20000, resumedAt: 30000 },
        { id: 'pause2', reason: 'manual', pausedAt: 50000, resumedAt: 70000 },
      ],
    };

    expect(getGameClockElapsedMs(game, 90000)).toBe(50000);
  });

  it('bounds point pause overlap by pointEndMs', () => {
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      startedAt: 10000,
      possessions: [],
    };
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [point],
      gameClockPauses: [
        {
          id: 'pause1',
          reason: 'manual',
          pausedAt: 20000,
          resumedAt: 90000,
          pointId: point.id,
        },
      ],
    };

    expect(getCompletedGameClockPauseMsDuringPoint(game, point, 50000)).toBe(30000);
  });

  it('ignores game-clock pauses outside the point window', () => {
    const point: TrackedPoint = {
      id: 'pt1',
      lines: [],
      startedAt: 50000,
      possessions: [],
    };
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [point],
      gameClockPauses: [
        { id: 'pause1', reason: 'manual', pausedAt: 10000, resumedAt: 30000 },
        { id: 'pause2', reason: 'manual', pausedAt: 80000, resumedAt: 90000 },
      ],
    };

    expect(getCompletedGameClockPauseMsDuringPoint(game, point, 70000)).toBe(0);
  });
});

describe('canCallTimeout', () => {
  it('returns true if regular timeouts are left', () => {
    const state = {
      regularUsedInHalf: 1,
      regularPerHalf: 2,
      floaterUsed: false,
      floaterEnabled: true,
      isSecondHalf: false,
    };
    expect(canCallTimeout(state)).toBe(true);
  });

  it('returns true if regular timeouts are used but floater is available', () => {
    const state = {
      regularUsedInHalf: 2,
      regularPerHalf: 2,
      floaterUsed: false,
      floaterEnabled: true,
      isSecondHalf: false,
    };
    expect(canCallTimeout(state)).toBe(true);
  });

  it('returns false if regular used and no floater enabled', () => {
    const state = {
      regularUsedInHalf: 2,
      regularPerHalf: 2,
      floaterUsed: false,
      floaterEnabled: false,
      isSecondHalf: false,
    };
    expect(canCallTimeout(state)).toBe(false);
  });

  it('returns false if all timeouts used', () => {
    const state = {
      regularUsedInHalf: 2,
      regularPerHalf: 2,
      floaterUsed: true,
      floaterEnabled: true,
      isSecondHalf: false,
    };
    expect(canCallTimeout(state)).toBe(false);
  });
});

describe('isPullAwaitingPickup', () => {
  it('returns false if point is over', () => {
    expect(
      isPullAwaitingPickup({
        possession: null,
        pointIsOver: true,
        oppHasDisc: false,
        discHolderId: null,
      }),
    ).toBe(false);
  });

  it('returns true if last action was a pull and no holder yet', () => {
    const pos = makePossession(HOME, [
      {
        id: 'a1',
        kind: 'pull',
        sideId: HOME,
        receivingSideId: AWAY,
        puller: august,
        result: 'inbound',
      },
    ]);
    expect(
      isPullAwaitingPickup({
        possession: pos,
        pointIsOver: false,
        oppHasDisc: false,
        discHolderId: null,
      }),
    ).toBe(true);
  });

  it('returns false if disc is already picked up', () => {
    const pos = makePossession(HOME, [
      {
        id: 'a1',
        kind: 'pull',
        sideId: HOME,
        receivingSideId: AWAY,
        puller: august,
        result: 'inbound',
      },
    ]);
    expect(
      isPullAwaitingPickup({
        possession: pos,
        pointIsOver: false,
        oppHasDisc: false,
        discHolderId: 'p1',
      }),
    ).toBe(false);
  });
});

describe('getTrackerInstructionText', () => {
  it('returns null if point is over', () => {
    expect(
      getTrackerInstructionText({
        pointIsOver: true,
        passModifier: null,
        oppHasDisc: false,
        discHolderId: null,
        isAwaitingPullPickup: false,
      }),
    ).toBeNull();
  });

  it('handles pass modifiers', () => {
    expect(
      getTrackerInstructionText({
        pointIsOver: false,
        passModifier: 'callahan',
        oppHasDisc: false,
        discHolderId: null,
        isAwaitingPullPickup: false,
      }),
    ).toBe('TAP PLAYER FOR CALLAHAN');

    expect(
      getTrackerInstructionText({
        pointIsOver: false,
        passModifier: 'pressure',
        oppHasDisc: true,
        discHolderId: null,
        isAwaitingPullPickup: false,
      }),
    ).toBe('TAP PLAYER WHO APPLIED PRESSURE');
  });

  it('handles opponent having disc', () => {
    expect(
      getTrackerInstructionText({
        pointIsOver: false,
        passModifier: null,
        oppHasDisc: true,
        discHolderId: null,
        isAwaitingPullPickup: false,
      }),
    ).toBe('TAP PLAYER FOR BLOCK');
  });

  it('handles empty disc holder', () => {
    expect(
      getTrackerInstructionText({
        pointIsOver: false,
        passModifier: null,
        oppHasDisc: false,
        discHolderId: null,
        isAwaitingPullPickup: true,
      }),
    ).toBe('TAP STARTING PLAYER');

    expect(
      getTrackerInstructionText({
        pointIsOver: false,
        passModifier: null,
        oppHasDisc: false,
        discHolderId: null,
        isAwaitingPullPickup: false,
      }),
    ).toBe('TAP PLAYER TO PICK UP');
  });

  it('returns null when everything is normal', () => {
    expect(
      getTrackerInstructionText({
        pointIsOver: false,
        passModifier: null,
        oppHasDisc: false,
        discHolderId: 'p1',
        isAwaitingPullPickup: false,
      }),
    ).toBeNull();
  });
});

describe('getTrackerInstructionColor', () => {
  const palette = { success: 'green', warning: 'orange', textMuted: 'grey' };

  it('returns success for positive defensive modifiers', () => {
    expect(getTrackerInstructionColor('callahan', palette)).toBe('green');
    expect(getTrackerInstructionColor('stall', palette)).toBe('green');
    expect(getTrackerInstructionColor('pressure', palette)).toBe('green');
  });

  it('returns warning for fifty-fifty', () => {
    expect(getTrackerInstructionColor('fifty-fifty', palette)).toBe('orange');
  });

  it('returns textMuted for null modifier', () => {
    expect(getTrackerInstructionColor(null, palette)).toBe('grey');
  });
});

describe('getLastTurnoverEvent', () => {
  it('shows the credited defender for pressure', () => {
    const possession = makePossession(AWAY, [
      {
        id: 'pressure1',
        kind: 'throw',
        sideId: AWAY,
        thrower: untracked,
        defender: august,
        result: 'pressure',
      },
    ]);

    expect(getLastTurnoverEvent(possession, false, participants)).toEqual({
      label: 'PRESSURE',
      isFocusTurnover: false,
      isDropWithSplitAttribution: false,
      responsibleName: 'August',
      throwerName: null,
    });
  });

  it('shows the specific dropper for a fully tracked opposing side', () => {
    const connor = { refType: 'participant' as const, participantId: 'connor' };
    const charlotte = { refType: 'participant' as const, participantId: 'charlotte' };
    const possession = makePossession(HOME, [
      {
        id: 'complete1',
        kind: 'throw',
        sideId: HOME,
        thrower: august,
        toPlayer: connor,
        result: 'complete',
      },
      {
        id: 'drop1',
        kind: 'throw',
        sideId: HOME,
        thrower: connor,
        toPlayer: charlotte,
        result: 'drop',
      },
    ]);

    expect(
      getLastTurnoverEvent(
        possession,
        false,
        [
          ...participants,
          { id: connor.participantId, name: 'Connor' },
          { id: charlotte.participantId, name: 'Charlotte' },
        ],
        { showSpecificResult: true },
      ),
    ).toEqual({
      label: 'DROP',
      isFocusTurnover: false,
      isDropWithSplitAttribution: false,
      responsibleName: 'Charlotte',
      throwerName: null,
    });
  });
});
