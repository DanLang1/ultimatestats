import { computeAdvancedTimingStats } from '../../advancedTracking/advancedTimingStatsUtils';
import { buildAnalyticsGame } from '../../advancedTracking/buildAnalyticsGame';
import type { AdvancedTrackedGame } from '../../advancedTracking/types';

// ── Shared fixtures ──────────────────────────────────────────────────────────

const ZOO = 'Zoo';
const RIVALS = 'rivals';

const august = { refType: 'participant' as const, participantId: 'p_august' };
const meves = { refType: 'participant' as const, participantId: 'p_meves' };
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
  participants: [
    { id: 'p_august', name: 'August' },
    { id: 'p_meves', name: 'Meves' },
  ],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('advancedTimingStatsUtils', () => {
  it('computes timing stats from timed points', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          startedAt: 1000,
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
                  result: 'caught',
                  recordedAt: 1000,
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                  recordedAt: 61000, // 60 seconds
                },
              ],
            },
          ],
        },
        {
          id: 'pt2',
          startedAt: 100000,
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
                  result: 'caught',
                  recordedAt: 100000,
                },
                {
                  id: 'b2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  toPlayer: untracked,
                  result: 'goal',
                  recordedAt: 130000, // 30 seconds
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedTimingStats(analytics);

    expect(stats.hasTimingData).toBe(true);
    expect(stats.timedPointCount).toBe(2);
    expect(stats.avgPointDurationMs).toBeCloseTo(45000); // (60000 + 30000) / 2
    expect(stats.longestPointDurationMs).toBe(60000);
    expect(stats.shortestPointDurationMs).toBe(30000);
  });

  it('returns hasTimingData false when no points have timing', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          // no startedAt
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
                  result: 'caught',
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
    const stats = computeAdvancedTimingStats(analytics);

    expect(stats.hasTimingData).toBe(false);
    expect(stats.avgPointDurationMs).toBeNull();
    expect(stats.longestPointDurationMs).toBeNull();
    expect(stats.shortestPointDurationMs).toBeNull();
    expect(stats.timedPointCount).toBe(0);
  });

  it('handles mix of timed and untimed points', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          startedAt: 1000,
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
                  result: 'caught',
                  recordedAt: 1000,
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                  recordedAt: 41000, // 40 seconds
                },
              ],
            },
          ],
        },
        {
          id: 'pt2',
          // no startedAt = no timing
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
                  result: 'caught',
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
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedTimingStats(analytics);

    expect(stats.hasTimingData).toBe(true);
    expect(stats.timedPointCount).toBe(1); // Only pt1 has timing
    expect(stats.avgPointDurationMs).toBeCloseTo(40000);
    expect(stats.longestPointDurationMs).toBe(40000);
    expect(stats.shortestPointDurationMs).toBe(40000);
  });
});
