import type { AnalyticsGame } from './analyticsTypes';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdvancedTimingStats {
  /** True if at least one point has durationMs. */
  hasTimingData: boolean;
  /** Average point duration in ms across timed points. Null if no timing data. */
  avgPointDurationMs: number | null;
  /** Longest point duration in ms. Null if no timing data. */
  longestPointDurationMs: number | null;
  /** Shortest point duration in ms. Null if no timing data. */
  shortestPointDurationMs: number | null;
  /** Number of points with timing data. */
  timedPointCount: number;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function computeAdvancedTimingStats(game: AnalyticsGame): AdvancedTimingStats {
  const durations: number[] = [];

  for (const point of game.points) {
    if (point.durationMs != null) {
      durations.push(point.durationMs);
    }
  }

  if (durations.length === 0) {
    return {
      hasTimingData: false,
      avgPointDurationMs: null,
      longestPointDurationMs: null,
      shortestPointDurationMs: null,
      timedPointCount: 0,
    };
  }

  const sum = durations.reduce((a, b) => a + b, 0);

  return {
    hasTimingData: true,
    avgPointDurationMs: sum / durations.length,
    longestPointDurationMs: Math.max(...durations),
    shortestPointDurationMs: Math.min(...durations),
    timedPointCount: durations.length,
  };
}
