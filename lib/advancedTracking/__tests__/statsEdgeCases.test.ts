import { createAdvancedGameFixture } from '@/test/fixtures/advancedGameBuilder';

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
const max = { refType: 'participant' as const, participantId: 'p_max' };
const untracked = { refType: 'untracked' as const };

const baseGame = createAdvancedGameFixture({
  id: 'g1',
  createdAt: 0,
  updatedAt: 0,
  focusSideId: ZOO,
  initialReceivingSideId: ZOO,
  sides: [
    { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
    { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
  ],
  participants,
});

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

  it('counts disc_pickups in totalTouches', () => {
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
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'disc_pickup',
                  sideId: ZOO,
                  player: august,
                },
                {
                  id: 'a3',
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
    // disc_pickup (a2) only — no receptions or pull_receptions
    expect(findStats(stats, 'p_august').totalTouches).toBe(1);
  });
});

// ── Team Stats Edge Cases ────────────────────────────────────────────────────

describe('computeAdvancedTeamStats — edge cases', () => {
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
