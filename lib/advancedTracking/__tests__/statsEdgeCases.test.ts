import { computeAdvancedImpact } from '../advancedImpactUtils';
import { computeAdvancedPlayerStats } from '../advancedPlayerStatsUtils';
import { computePullStats } from '../advancedPullStatsUtils';
import { computeAdvancedTeamStats } from '../advancedTeamStatsUtils';
import { computeAdvancedTimingStats } from '../advancedTimingStatsUtils';
import { buildAnalyticsGame } from '../buildAnalyticsGame';
import type { AdvancedTrackedGame } from '../types';

// ── Shared fixtures ──────────────────────────────────────────────────────────

const ZOO = 'Zoo';
const RIVALS = 'rivals';

const participants = [
  { id: 'p_august', name: 'August' },
  { id: 'p_meves', name: 'Meves' },
  { id: 'p_joah', name: 'Joah' },
  { id: 'p_max', name: 'Max' },
];

const august = { refType: 'participant' as const, participantId: 'p_august' };
const meves = { refType: 'participant' as const, participantId: 'p_meves' };
const joah = { refType: 'participant' as const, participantId: 'p_joah' };
const max = { refType: 'participant' as const, participantId: 'p_max' };
const untracked = { refType: 'untracked' as const };

const baseGame: Omit<AdvancedTrackedGame, 'points'> = {
  id: 'g1',
  schemaVersion: 1,
  createdAt: 0,
  updatedAt: 0,
  gameType: 'game',
  status: 'in_progress',
  focusSideId: ZOO,
  initialReceivingSideId: ZOO,
  settings: { locationMode: 'none' },
  sides: [
    { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
    { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
  ],
  participants,
};

function findStats(stats: ReturnType<typeof computeAdvancedPlayerStats>, participantId: string) {
  const playerStats = stats.find((candidate) => candidate.participantId === participantId);
  if (!playerStats) throw new Error(`No stats found for ${participantId}`);
  return playerStats;
}

// ── Player Stats Edge Cases ──────────────────────────────────────────────────

describe('computeAdvancedPlayerStats — edge cases', () => {
  it('player with zero throw attempts has null completionPct', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_max'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: max,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: max,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedPlayerStats(analytics);
    const maxStats = findStats(stats, 'p_max');
    expect(maxStats.throwAttempts).toBe(0);
    expect(maxStats.completionPct).toBeNull();
    expect(maxStats.goals).toBe(1);
    expect(maxStats.receptions).toBe(1);
  });

  it('player who only pulls has correct pull stats and zero completions', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  toPlayer: untracked,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedPlayerStats(analytics);
    const augustStats = findStats(stats, 'p_august');
    expect(augustStats.pulls).toBe(1);
    expect(augustStats.completions).toBe(0);
    expect(augustStats.throwAttempts).toBe(0);
    expect(augustStats.dPoints).toBe(1);
    expect(augustStats.oPoints).toBe(0);
  });

  it('player with only stallsConceded has correct plusMinus', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  result: 'stall',
                },
              ],
            },
            {
              id: 'pos2',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a3',
                  kind: 'disc_pickup',
                  sideId: RIVALS,
                  player: untracked,
                },
                {
                  id: 'a4',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  toPlayer: untracked,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedPlayerStats(analytics);
    const augustStats = findStats(stats, 'p_august');
    expect(augustStats.stallsConceded).toBe(1);
    expect(augustStats.throwAttempts).toBe(0);
    expect(augustStats.plusMinus).toBe(-1);
  });

  it('player who gets a block and a goal in same point has plusMinus +2', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'block',
                  defender: meves,
                },
              ],
            },
            {
              id: 'pos2',
              sideId: ZOO,
              actions: [
                {
                  id: 'b1',
                  kind: 'disc_pickup',
                  sideId: ZOO,
                  player: meves,
                },
                {
                  id: 'b2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: august,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedPlayerStats(analytics);
    const mevesStats = findStats(stats, 'p_meves');
    expect(mevesStats.blocks).toBe(1);
    expect(mevesStats.assists).toBe(1);
    expect(mevesStats.plusMinus).toBe(2);
  });

  it('player on field with no stats still shows pointsPlayed', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedPlayerStats(analytics);
    const mevesStats = findStats(stats, 'p_meves');
    expect(mevesStats.pointsPlayed).toBe(1);
    expect(mevesStats.goals).toBe(1);
    expect(mevesStats.assists).toBe(0);
  });

  it('oEfficiency is null when player has zero O-points', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'throwaway',
                },
              ],
            },
            {
              id: 'pos2',
              sideId: ZOO,
              actions: [
                {
                  id: 'b1',
                  kind: 'disc_pickup',
                  sideId: ZOO,
                  player: august,
                },
                {
                  id: 'b2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedPlayerStats(analytics);
    const augustStats = findStats(stats, 'p_august');
    expect(augustStats.oPoints).toBe(0);
    expect(augustStats.dPoints).toBe(1);
    expect(augustStats.oEfficiency).toBeNull();
    expect(augustStats.dEfficiency).toBe(1);
  });

  it('correctly counts totalTouches including disc_pickups and pull_receptions', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'complete',
                },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: august,
                  result: 'complete',
                },
                {
                  id: 'a4',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedPlayerStats(analytics);
    const augustStats = findStats(stats, 'p_august');
    // receptions: 1 (a3)
    // disc_pickups: 0
    // pull_receptions: 1 (a1)
    expect(augustStats.totalTouches).toBe(2);

    const mevesStats = findStats(stats, 'p_meves');
    // receptions: 2 (a2, a4)
    // disc_pickups: 0
    // pull_receptions: 0
    expect(mevesStats.totalTouches).toBe(2);
  });

  it('player who was subbed in still gets point credit', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          subs: [
            {
              id: 'sub1',
              sideId: ZOO,
              type: 'injury',
              inIds: ['p_meves'],
              outIds: ['p_august'],
              stoppageActionId: 'stop1',
            },
          ],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'stop1',
                  kind: 'stoppage',
                  reason: 'injury',
                  recordedAt: 10000,
                  pausedAt: 10000,
                  resumedAt: 20000,
                },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: max,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedPlayerStats(analytics);
    expect(stats.some((s) => s.participantId === 'p_august' && s.pointsPlayed === 1)).toBe(true);
    expect(stats.some((s) => s.participantId === 'p_meves' && s.pointsPlayed === 1)).toBe(true);
  });
});

// ── Team Stats Edge Cases ────────────────────────────────────────────────────

describe('computeAdvancedTeamStats — edge cases', () => {
  it('clean hold counts correctly', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: ZOO,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedTeamStats(analytics, ZOO);
    expect(stats.holds).toBe(1);
    expect(stats.cleanHolds).toBe(1);
    expect(stats.dirtyHolds).toBe(0);
  });

  it('dirty hold counts when there are turnovers but focus side still scores', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: ZOO,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  result: 'throwaway',
                },
              ],
            },
            {
              id: 'pos2',
              sideId: RIVALS,
              actions: [
                {
                  id: 'b1',
                  kind: 'disc_pickup',
                  sideId: RIVALS,
                  player: untracked,
                },
                {
                  id: 'b2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'throwaway',
                },
              ],
            },
            {
              id: 'pos3',
              sideId: ZOO,
              actions: [
                {
                  id: 'c1',
                  kind: 'disc_pickup',
                  sideId: ZOO,
                  player: august,
                },
                {
                  id: 'c2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedTeamStats(analytics, ZOO);
    expect(stats.holds).toBe(1);
    expect(stats.cleanHolds).toBe(0);
    expect(stats.dirtyHolds).toBe(1);
  });

  it('break point does not count as clean or dirty hold', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'throwaway',
                },
              ],
            },
            {
              id: 'pos2',
              sideId: ZOO,
              actions: [
                {
                  id: 'b1',
                  kind: 'disc_pickup',
                  sideId: ZOO,
                  player: august,
                },
                {
                  id: 'b2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedTeamStats(analytics, ZOO);
    expect(stats.breaks).toBe(1);
    expect(stats.cleanHolds).toBe(0);
    expect(stats.dirtyHolds).toBe(0);
  });

  it('callahan break does not count as clean or dirty hold', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'callahan',
                  defender: meves,
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedTeamStats(analytics, ZOO);
    expect(stats.breaks).toBe(1);
    expect(stats.cleanHolds).toBe(0);
    expect(stats.dirtyHolds).toBe(0);
  });

  it('possessionsPerPoint excludes opponent possessions', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: ZOO,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  result: 'throwaway',
                },
              ],
            },
            {
              id: 'pos2',
              sideId: RIVALS,
              actions: [
                {
                  id: 'b1',
                  kind: 'disc_pickup',
                  sideId: RIVALS,
                  player: untracked,
                },
                {
                  id: 'b2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'throwaway',
                },
              ],
            },
            {
              id: 'pos3',
              sideId: ZOO,
              actions: [
                {
                  id: 'c1',
                  kind: 'disc_pickup',
                  sideId: ZOO,
                  player: august,
                },
                {
                  id: 'c2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedTeamStats(analytics, ZOO);
    // ZOO had 2 possessions (pos1 and pos3), RIVALS had 1 (pos2)
    // possessionsPerPoint should be 2/1 = 2.0
    expect(stats.possessionsPerPoint).toBeCloseTo(2.0);
  });

  it('scoresAfterTurnovers counts only focus side scores after possessionIndex > 0', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        // Break: ZOO scores on possession 1 after RIVALS turnover
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'throwaway',
                },
              ],
            },
            {
              id: 'pos2',
              sideId: ZOO,
              actions: [
                {
                  id: 'b1',
                  kind: 'disc_pickup',
                  sideId: ZOO,
                  player: august,
                },
                {
                  id: 'b2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        // Hold: ZOO scores on possession 0 (no turnover)
        {
          id: 'pt2',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos3',
              sideId: ZOO,
              actions: [
                {
                  id: 'c1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'c2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedTeamStats(analytics, ZOO);
    expect(stats.scoresAfterTurnovers).toBe(1); // only pt1
  });

  it('longest scoring run and longest drought', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: ZOO,
      points: [
        // Zoo scores
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        // Rivals score
        {
          id: 'pt2',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos2',
              sideId: RIVALS,
              actions: [
                {
                  id: 'b1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'b2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  toPlayer: untracked,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        // Zoo scores
        {
          id: 'pt3',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos3',
              sideId: ZOO,
              actions: [
                {
                  id: 'c1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound',
                },
                {
                  id: 'c2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        // Zoo scores
        {
          id: 'pt4',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos4',
              sideId: ZOO,
              actions: [
                {
                  id: 'd1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound',
                },
                {
                  id: 'd2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedTeamStats(analytics, ZOO);
    expect(stats.longestScoringRun).toBe(2); // pt3 + pt4
    expect(stats.longestDrought).toBe(1); // pt2
  });

  it('terminated point does not affect scoring run or drought', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      endReason: 'time_limit',
      initialReceivingSideId: ZOO,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        {
          id: 'pt2',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos2',
              sideId: ZOO,
              actions: [
                {
                  id: 'b1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound',
                },
                {
                  id: 'b2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'complete',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedTeamStats(analytics, ZOO);
    expect(stats.longestScoringRun).toBe(1);
    expect(stats.longestDrought).toBe(0);
    expect(stats.oPoints).toBe(1); // terminated point excluded
    expect(stats.dPoints).toBe(0);
  });
});

// ── Impact Stats Edge Cases ──────────────────────────────────────────────────

describe('computeAdvancedImpact — edge cases', () => {
  it('block-only point yields description B and plusMinusDelta +1', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_meves'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'block',
                  defender: meves,
                },
              ],
            },
            {
              id: 'pos2',
              sideId: ZOO,
              actions: [
                {
                  id: 'b1',
                  kind: 'disc_pickup',
                  sideId: ZOO,
                  player: meves,
                },
                {
                  id: 'b2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: august,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const impact = computeAdvancedImpact(analytics, 'p_meves', ZOO);
    expect(impact).toHaveLength(1);
    expect(impact[0].description).toContain('B');
    expect(impact[0].plusMinusDelta).toBe(2); // block (+1) + assist (+1)
  });

  it('player not on field gets onField false and delta 0 even with team goal', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const impact = computeAdvancedImpact(analytics, 'p_joah', ZOO);
    expect(impact[0].onField).toBe(false);
    expect(impact[0].plusMinusDelta).toBe(0);
  });
});

// ── Pull Stats Edge Cases ────────────────────────────────────────────────────

describe('computePullStats — edge cases', () => {
  it('counts dropped pulls in outcomes', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'dropped',
                },
              ],
            },
            {
              id: 'pos2',
              sideId: ZOO,
              actions: [
                {
                  id: 'a2',
                  kind: 'disc_pickup',
                  sideId: ZOO,
                  player: untracked,
                },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: untracked,
                  toPlayer: untracked,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computePullStats(analytics, ZOO);
    expect(stats.totalPulls).toBe(1);
    expect(stats.outcomes).toEqual({ dropped: 1 });
  });

  it('excludes pulls by the opposing side when sideId filter is applied', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'disc_pickup',
                  sideId: RIVALS,
                  player: untracked,
                },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  toPlayer: untracked,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        {
          id: 'pt2',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos2',
              sideId: ZOO,
              actions: [
                {
                  id: 'b1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound',
                },
                {
                  id: 'b2',
                  kind: 'disc_pickup',
                  sideId: ZOO,
                  player: untracked,
                },
                {
                  id: 'b3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: untracked,
                  toPlayer: untracked,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const zooStats = computePullStats(analytics, ZOO);
    expect(zooStats.totalPulls).toBe(1);

    const rivalsStats = computePullStats(analytics, RIVALS);
    expect(rivalsStats.totalPulls).toBe(1);
  });
});

// ── Timing Stats Edge Cases ──────────────────────────────────────────────────

describe('computeAdvancedTimingStats — edge cases', () => {
  it('excludes terminated points without timing data', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      endReason: 'time_limit',
      points: [
        {
          id: 'pt1',
          startedAt: 0,
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound',
                  recordedAt: 0,
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                  recordedAt: 30000,
                },
              ],
            },
          ],
        },
        {
          id: 'pt2',
          // no startedAt
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos2',
              sideId: ZOO,
              actions: [
                {
                  id: 'b1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound',
                },
                {
                  id: 'b2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'complete',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedTimingStats(analytics);
    expect(stats.timedPointCount).toBe(1);
    expect(stats.avgPointDurationMs).toBe(30000);
  });
});

// ── Integration: End-to-end correctness ──────────────────────────────────────

describe('end-to-end stat correctness', () => {
  it('full game with every result type produces correct aggregate stats', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'final',
      initialReceivingSideId: ZOO,
      points: [
        // Pt1: Clean hold — goal, assist, completion, reception, pull_reception
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'complete',
                },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: joah,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        // Pt2: Break — block, disc_pickup, goal, assist
        {
          id: 'pt2',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah'] }],
          possessions: [
            {
              id: 'pos2a',
              sideId: RIVALS,
              actions: [
                {
                  id: 'b1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'b2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'block',
                  defender: joah,
                },
              ],
            },
            {
              id: 'pos2b',
              sideId: ZOO,
              actions: [
                {
                  id: 'b3',
                  kind: 'disc_pickup',
                  sideId: ZOO,
                  player: meves,
                },
                {
                  id: 'b4',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: joah,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        // Pt3: Broken — throwaway
        {
          id: 'pt3',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah'] }],
          possessions: [
            {
              id: 'pos3a',
              sideId: ZOO,
              actions: [
                {
                  id: 'c1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'c2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  result: 'throwaway',
                },
              ],
            },
            {
              id: 'pos3b',
              sideId: RIVALS,
              actions: [
                {
                  id: 'c3',
                  kind: 'disc_pickup',
                  sideId: RIVALS,
                  player: untracked,
                },
                {
                  id: 'c4',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  toPlayer: untracked,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        // Pt4: Opp hold — stall
        {
          id: 'pt4',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah'] }],
          possessions: [
            {
              id: 'pos4a',
              sideId: RIVALS,
              actions: [
                {
                  id: 'd1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'd2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'stall',
                  defender: joah,
                },
              ],
            },
            {
              id: 'pos4b',
              sideId: ZOO,
              actions: [
                {
                  id: 'd3',
                  kind: 'disc_pickup',
                  sideId: ZOO,
                  player: meves,
                },
                {
                  id: 'd4',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: max,
                  result: 'drop',
                  splitAttribution: true,
                },
              ],
            },
            {
              id: 'pos4c',
              sideId: RIVALS,
              actions: [
                {
                  id: 'd5',
                  kind: 'disc_pickup',
                  sideId: RIVALS,
                  player: untracked,
                },
                {
                  id: 'd6',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  toPlayer: untracked,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        // Pt5: Callahan break
        {
          id: 'pt5',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
          possessions: [
            {
              id: 'pos5',
              sideId: RIVALS,
              actions: [
                {
                  id: 'e1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'e2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'callahan',
                  defender: max,
                },
              ],
            },
          ],
        },
        // Pt6: O-point stall on tracked player
        {
          id: 'pt6',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah'] }],
          possessions: [
            {
              id: 'pos6a',
              sideId: ZOO,
              actions: [
                {
                  id: 'f1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'f2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'complete',
                },
                {
                  id: 'f3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  result: 'stall',
                  defender: joah,
                },
              ],
            },
            {
              id: 'pos6b',
              sideId: RIVALS,
              actions: [
                {
                  id: 'f4',
                  kind: 'disc_pickup',
                  sideId: RIVALS,
                  player: untracked,
                },
                {
                  id: 'f5',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  toPlayer: untracked,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedPlayerStats(analytics);
    const teamStats = computeAdvancedTeamStats(analytics, ZOO);

    // Team-level assertions
    // Under "scoring team pulls next", receiving sides are:
    // pt1 Zoo, pt2 Rivals, pt3 Rivals, pt4 Zoo, pt5 Zoo, pt6 Rivals
    expect(teamStats.holds).toBe(2); // pt1, pt5 (callahan counts as hold)
    expect(teamStats.breaks).toBe(1); // pt2
    expect(teamStats.timesBroken).toBe(1); // pt4
    expect(teamStats.oppHolds).toBe(2); // pt3, pt6
    expect(teamStats.oPoints).toBe(3); // pt1, pt4, pt5
    expect(teamStats.dPoints).toBe(3); // pt2, pt3, pt6
    expect(teamStats.cleanHolds).toBe(1); // pt1
    expect(teamStats.dirtyHolds).toBe(1); // pt5 (callahan: single possession but side doesn't match scorer)

    // August stats
    const augustStats = findStats(stats, 'p_august');
    expect(augustStats.pulls).toBe(3); // pt2, pt4, pt5
    expect(augustStats.pullReceptions).toBe(3); // pt1, pt3, pt6
    expect(augustStats.completions).toBe(2); // pt1 a2, pt6 f2
    expect(augustStats.throwAttempts).toBe(3); // pt1 a2, pt3 c2, pt6 f2
    expect(augustStats.throwaways).toBe(1); // pt3 c2
    expect(augustStats.plusMinus).toBe(-1); // 0+0+0+0 -1-0-0

    // Meves stats
    const mevesStats = findStats(stats, 'p_meves');
    expect(mevesStats.completions).toBe(2); // pt1 a3, pt2 b4
    expect(mevesStats.throwAttempts).toBe(3); // pt1 a3, pt2 b4, pt4 d4
    expect(mevesStats.throwaways).toBeCloseTo(0.5); // pt4 split drop
    expect(mevesStats.assists).toBe(2); // pt2 b4, pt1 a3
    expect(mevesStats.stallsConceded).toBe(1); // pt6 f3
    expect(mevesStats.plusMinus).toBe(0.5); // 0+2+0+0 -0.5-0-1 = 0.5

    // Joah stats
    const joahStats = findStats(stats, 'p_joah');
    expect(joahStats.goals).toBe(2); // pt1 a3, pt2 b4
    expect(joahStats.receptions).toBe(2); // pt1 a3, pt2 b4
    expect(joahStats.blocks).toBe(1); // pt2 b2
    expect(joahStats.stalls).toBe(2); // pt4 d2, pt6 f3
    expect(joahStats.plusMinus).toBe(5);
    // Joah goals: 2 (pt1, pt2)
    // Joah assists: 0
    // Joah blocks: 1 (pt2)
    // Joah stalls: 2 (pt4, pt6)
    // Joah throwaways: 0
    // Joah drops: 0
    // Joah stallsConceded: 0
    // plusMinus = 2 + 0 + 1 + 2 - 0 - 0 - 0 = 5
    expect(joahStats.plusMinus).toBe(5);

    // Max stats
    const maxStats = findStats(stats, 'p_max');
    expect(maxStats.callahans).toBe(1); // pt5 e2
    expect(maxStats.blocks).toBe(1); // pt5 e2 (callahan implies block)
    expect(maxStats.goals).toBe(1); // pt5 e2 (callahan implies goal)
    expect(maxStats.drops).toBeCloseTo(0.5); // pt4 d4 split
    expect(maxStats.plusMinus).toBe(1.5); // 1+0+1+0 -0-0.5-0 = 1.5
  });
});
