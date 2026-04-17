import type { AnalyticsGame } from './analyticsTypes';
import type { PullAction } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

type PullResult = PullAction['result'];

export interface PullStats {
  totalPulls: number;
  /** Pull result → count. E.g. { inbound: 3, ob: 2, dropped: 1 } */
  outcomes: Partial<Record<PullResult, number>>;
  /** Average hang time in ms across pulls that have hangTimeMs. Null if none have it. */
  avgHangTimeMs: number | null;
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
      const result = action.result as PullResult;
      outcomes[result] = (outcomes[result] ?? 0) + 1;
    }

    if (action.hangTimeMs != null) {
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
