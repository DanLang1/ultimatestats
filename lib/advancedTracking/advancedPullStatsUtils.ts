import type { AnalyticsGame } from './analyticsTypes';
import { PULL_RESULT_SPECS, PULL_RESULTS, type PullResult } from './types';

export interface PullStats {
  totalPulls: number;
  /** Pull result → count. E.g. { inbound: 3, ob: 2, dropped: 1, roller: 1 } */
  outcomes: Partial<Record<PullResult, number>>;
  /** Average hang time in ms across timed inbound/dropped pulls. Null if none have it. */
  avgHangTimeMs: number | null;
}

export function getInboundPullCount(stats: Pick<PullStats, 'outcomes'>): number {
  let count = 0;
  for (const result of PULL_RESULTS) {
    if (PULL_RESULT_SPECS[result].countsAsInbound) count += stats.outcomes[result] ?? 0;
  }
  return count;
}

/**
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

    outcomes[action.result] = (outcomes[action.result] ?? 0) + 1;

    if (PULL_RESULT_SPECS[action.result].countsHangTime && action.hangTimeMs != null) {
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
