import { defineAdvancedGameTestContext } from '@/test/fixtures/advancedGameBuilder';

import { computeAdvancedTimingStats } from '../advancedTimingStatsUtils';

const timing = defineAdvancedGameTestContext({
  id: 'timing-stats-game',
  createdAt: 0,
  updatedAt: 0,
  focusSideId: 'Zoo',
  initialReceivingSideId: 'Zoo',
  sides: [
    { id: 'Zoo', label: 'Zoo', trackingMode: 'full-roster' },
    { id: 'rivals', label: 'Rivals', trackingMode: 'anonymous' },
  ],
  players: {
    august: { id: 'p_august', name: 'August' },
    meves: { id: 'p_meves', name: 'Meves' },
  },
  defaultLines: [{ sideId: 'Zoo', participantIds: ['p_august', 'p_meves'] }],
});

const { august, meves } = timing.players;

describe('advancedTimingStatsUtils', () => {
  it('computes timing stats from timed points', () => {
    const analytics = timing
      .scenario()
      .startPoint({
        puller: timing.untracked,
        receiver: august,
        startedAt: 1000,
        recordedAt: 1000,
      })
      .goal(meves, { recordedAt: 61000 })
      .startPoint({
        puller: august,
        receiver: timing.untracked,
        startedAt: 100000,
        recordedAt: 100000,
      })
      .goal(undefined, { recordedAt: 130000 })
      .buildAnalytics();

    const stats = computeAdvancedTimingStats(analytics);

    expect(stats.hasTimingData).toBe(true);
    expect(stats.timedPointCount).toBe(2);
    expect(stats.avgPointDurationMs).toBeCloseTo(45000);
    expect(stats.longestPointDurationMs).toBe(60000);
    expect(stats.shortestPointDurationMs).toBe(30000);
  });

  it('returns hasTimingData false when no points have timing', () => {
    const analytics = timing
      .scenario()
      .hold({ puller: timing.untracked, receiver: august, scorer: meves })
      .buildAnalytics();

    const stats = computeAdvancedTimingStats(analytics);

    expect(stats.hasTimingData).toBe(false);
    expect(stats.avgPointDurationMs).toBeNull();
    expect(stats.longestPointDurationMs).toBeNull();
    expect(stats.shortestPointDurationMs).toBeNull();
    expect(stats.timedPointCount).toBe(0);
  });

  it('handles mix of timed and untimed points', () => {
    const analytics = timing
      .scenario()
      .startPoint({
        puller: timing.untracked,
        receiver: august,
        startedAt: 1000,
        recordedAt: 1000,
      })
      .goal(meves, { recordedAt: 41000 })
      .hold({ puller: august, receiver: timing.untracked })
      .buildAnalytics();

    const stats = computeAdvancedTimingStats(analytics);

    expect(stats.hasTimingData).toBe(true);
    expect(stats.timedPointCount).toBe(1);
    expect(stats.avgPointDurationMs).toBeCloseTo(40000);
    expect(stats.longestPointDurationMs).toBe(40000);
    expect(stats.shortestPointDurationMs).toBe(40000);
  });
});
