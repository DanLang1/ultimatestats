import type { AnalyticsGame } from './analyticsTypes';
import type { PullAction } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

type PullResult = PullAction['result'];

export interface PullStats {
  totalPulls: number;
  /** Pull result → count. E.g. { inbound: 3, ob: 2, dropped: 1, roller: 1 } */
  outcomes: Partial<Record<PullResult, number>>;
  /** Average hang time in ms across timed inbound/dropped pulls. Null if none have it. */
  avgHangTimeMs: number | null;
}

export function getInboundPullCount(stats: Pick<PullStats, 'outcomes'>): number {
  return (stats.outcomes.inbound ?? 0) + (stats.outcomes.roller ?? 0);
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Compute pull outcome and hang time stats from pull actions.
 * Optionally filter to a specific pulling side.
 */
export function computePullStats(game: AnalyticsGame, sideId?: string): PullStats {
  const outcomes: Partial<Record<PullResult, number>> = {};
  let totalPulls = 0;
  let hangTimeSum = 0;
  let hangTimeCount = 0;

  for (const action of game.actions) {
    if (action.kind !== 'pull') continue;
    if (sideId != null && action.sideId !== sideId) continue;

    totalPulls++;

    if (action.result != null) {
      outcomes[action.result] = (outcomes[action.result] ?? 0) + 1;
    }

    if (action.result !== 'ob' && action.result !== 'roller' && action.hangTimeMs != null) {
      hangTimeSum += action.hangTimeMs;
      hangTimeCount++;
    }
  }

  return {
    totalPulls,
    outcomes,
    avgHangTimeMs: hangTimeCount > 0 ? hangTimeSum / hangTimeCount : null,
  };
}
