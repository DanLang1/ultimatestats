import {
  getCompletedGameClockPauseMs,
  getGameClockElapsedMs,
  getLastTurnoverEvent,
  getGoalInfo,
  getPassChainEvents,
  getSideTimeoutState,
} from '../trackingDisplayHelpers';
import type { AdvancedTrackedGame, PointPossession, TrackedPoint } from '../types';

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

  it('resets regulars after halftime, counting a legacy halftime-break timeout in the second half', () => {
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
          // Legacy data: games saved before timeouts were blocked during the halftime break.
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
