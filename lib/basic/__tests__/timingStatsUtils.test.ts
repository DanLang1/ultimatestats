import { GameEvent } from '@/store/basic/gameStore.types';

import { aggregateTimingStats, computeTimingStats, TimingStats } from '../teamStatsUtils';

// Helper to create goal events with duration
const goal = (team: 'team1' | 'team2', elapsedMs?: number): GameEvent => ({
  type: 'goal',
  team,
  goalPlayerId: null,
  assistPlayerId: null,
  elapsedMs,
});

describe('computeTimingStats', () => {
  it('returns zeros when no timing data is available', () => {
    const events: GameEvent[] = [goal('team1')]; // No elapsedMs
    const stats = computeTimingStats(events, 'team1', 15);

    expect(stats.hasTimingData).toBe(false);
    expect(stats.avgPointDurationMs).toBe(0);
    expect(stats.timedPointCount).toBe(0);
  });

  it('calculates averages, min, and max correctly for a sample game', () => {
    /**
     * Test Scenario:
     * - Point 1: Team1 O (Receive) -> Goal (60s)
     * - Point 2: Team1 D (Pull) -> Opp Goal (120s)
     * - Point 3: Team1 O (Receive) -> Goal (80s)
     * - Point 4: Team1 D (Pull) -> Goal (Break) (140s)
     */
    const events: GameEvent[] = [
      goal('team1', 60000), // O-point: 60s
      goal('team2', 120000), // D-point: 120s
      goal('team1', 80000), // O-point: 80s
      goal('team1', 140000), // D-point: 140s
    ];

    const stats = computeTimingStats(events, 'team1', 15);

    expect(stats.hasTimingData).toBe(true);
    expect(stats.timedPointCount).toBe(4);
    expect(stats.timedOPointCount).toBe(2);
    expect(stats.timedDPointCount).toBe(2);

    // Total: (60 + 120 + 80 + 140) / 4 = 400 / 4 = 100s
    expect(stats.avgPointDurationMs).toBe(100000);

    // O-Avg: (60 + 80) / 2 = 70s
    expect(stats.avgOPointDurationMs).toBe(70000);

    // D-Avg: (120 + 140) / 2 = 130s
    expect(stats.avgDPointDurationMs).toBe(130000);

    expect(stats.longestPointDurationMs).toBe(140000);
    expect(stats.shortestPointDurationMs).toBe(60000);
  });

  it('handles the user requested case: 12 points (7 O, 5 D)', () => {
    /**
     * Sequence to get exactly 7 O-points and 5 D-points for Team 1:
     * (Assume starting possession: 'team1' O)
     * P1-P6: Team 2 scores (Team 1 holds O for all these as they keep receiving)
     * P7: Team 1 scores (the hold) -> Team 1 pulls next -> P8 is D
     * P8-P12: Team 1 scores (the breaks) -> Team 1 pulls again -> Stay on D
     */
    const events: GameEvent[] = [
      goal('team2', 10000), // P1 (O)
      goal('team2', 20000), // P2 (O)
      goal('team2', 30000), // P3 (O)
      goal('team2', 40000), // P4 (O)
      goal('team2', 50000), // P5 (O)
      goal('team2', 60000), // P6 (O)
      goal('team1', 70000), // P7 (O)
      goal('team1', 80000), // P8 (D)
      goal('team1', 90000), // P9 (D)
      goal('team1', 100000), // P10 (D)
      goal('team1', 110000), // P11 (D)
      goal('team1', 120000), // P12 (D)
    ];

    const stats = computeTimingStats(events, 'team1', 15);

    expect(stats.timedPointCount).toBe(12);
    expect(stats.timedOPointCount).toBe(7);
    expect(stats.timedDPointCount).toBe(5);

    // Avg O: (10+20+30+40+50+60+70) / 7 = 280/7 = 40s
    expect(stats.avgOPointDurationMs).toBe(40000);

    // Avg D: (80+90+100+110+120) / 5 = 500/5 = 100s
    expect(stats.avgDPointDurationMs).toBe(100000);

    // Avg All: (40*7 + 100*5) / 12 = (280 + 500) / 12 = 780 / 12 = 65s
    expect(stats.avgPointDurationMs).toBe(65000);
    expect(stats.longestPointDurationMs).toBe(120000);
    expect(stats.shortestPointDurationMs).toBe(10000);
  });
});

describe('aggregateTimingStats', () => {
  it('calculates weighted averages accurately across multiple games', () => {
    // Game 1: 10 points @ average 60s
    const stats1: TimingStats = {
      hasTimingData: true,
      avgPointDurationMs: 60000,
      avgOPointDurationMs: 50000,
      avgDPointDurationMs: 70000,
      longestPointDurationMs: 100000,
      shortestPointDurationMs: 20000,
      timedPointCount: 10,
      timedOPointCount: 5,
      timedDPointCount: 5,
    };

    // Game 2: 2 points @ average 120s
    const stats2: TimingStats = {
      hasTimingData: true,
      avgPointDurationMs: 120000,
      avgOPointDurationMs: 100000,
      avgDPointDurationMs: 140000,
      longestPointDurationMs: 150000,
      shortestPointDurationMs: 90000,
      timedPointCount: 2,
      timedOPointCount: 1,
      timedDPointCount: 1,
    };

    const aggregated = aggregateTimingStats([stats1, stats2]);

    expect(aggregated.hasTimingData).toBe(true);
    expect(aggregated.timedPointCount).toBe(12);
    expect(aggregated.timedOPointCount).toBe(6);
    expect(aggregated.timedDPointCount).toBe(6);

    // Weighted Avg All: (60000 * 10 + 120000 * 2) / 12 = (600,000 + 240,000) / 12 = 840,000 / 12 = 70,000
    expect(aggregated.avgPointDurationMs).toBe(70000);

    // Weighted Avg O: (50000 * 5 + 100000 * 1) / 6 = (250,000 + 100,000) / 6 = 350,000 / 6 = 58,333.33
    expect(aggregated.avgOPointDurationMs).toBeCloseTo(58333.33, 0);

    // Weighted Avg D: (70000 * 5 + 140000 * 1) / 6 = (350,000 + 140,000) / 6 = 490,000 / 6 = 81,666.67
    expect(aggregated.avgDPointDurationMs).toBeCloseTo(81666.67, 0);

    expect(aggregated.longestPointDurationMs).toBe(150000);
    expect(aggregated.shortestPointDurationMs).toBe(20000);
  });

  it('returns empty stats if no games have timing data', () => {
    const stats: TimingStats = {
      hasTimingData: false,
      avgPointDurationMs: 0,
      avgOPointDurationMs: 0,
      avgDPointDurationMs: 0,
      longestPointDurationMs: 0,
      shortestPointDurationMs: 0,
      timedPointCount: 0,
      timedOPointCount: 0,
      timedDPointCount: 0,
    };
    const aggregated = aggregateTimingStats([stats, stats]);
    expect(aggregated.hasTimingData).toBe(false);
    expect(aggregated.avgPointDurationMs).toBe(0);
  });
});
