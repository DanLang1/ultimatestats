import type { TimeOfPossessionStats } from '@/lib/timeOfPossessionTypes';

import type { AdvancedPlayerStats } from './advancedPlayerStatsUtils';
import { computeAdvancedPlayerStats } from './advancedPlayerStatsUtils';
import type { PullStats } from './advancedPullStatsUtils';
import { computePullStats } from './advancedPullStatsUtils';
import type { AdvancedTeamStats } from './advancedTeamStatsUtils';
import { computeAdvancedTeamStats } from './advancedTeamStatsUtils';
import { computeAdvancedTimeOfPossessionStats } from './advancedTimeOfPossessionUtils';
import type { AdvancedTimingStats } from './advancedTimingStatsUtils';
import { computeAdvancedTimingStats } from './advancedTimingStatsUtils';
import type { AnalyticsSidePerspective } from './analyticsPerspectiveUtils';
import {
  getAnalyticsOpposingSideId,
  getAnalyticsSidePerspective,
} from './analyticsPerspectiveUtils';
import type { AnalyticsGame } from './analyticsTypes';

/** Every statistic derived for one side of one advanced-tracked game. */
export interface AdvancedGameStats {
  perspective: AnalyticsSidePerspective;
  opposingSideId: string;
  playerStats: AdvancedPlayerStats[];
  teamStats: AdvancedTeamStats;
  pullStats: PullStats;
  timeOfPossessionStats: TimeOfPossessionStats;
  timingStats: AdvancedTimingStats;
}

/**
 * Derives every statistic for one side of one advanced-tracked game through a single
 * interface. Callers that need a raw slice (CSV, cards, aggregate) read it off the result
 * instead of re-orchestrating the individual stat utilities and side resolution.
 *
 * `sideId` must be a resolved side of the game; normalize a user side preference with
 * `resolveAnalyticsSideId` before calling.
 */
export function computeAdvancedGameStats(
  analyticsGame: AnalyticsGame,
  sideId: string,
): AdvancedGameStats {
  const opposingSideId = getAnalyticsOpposingSideId(analyticsGame, sideId);

  return {
    perspective: getAnalyticsSidePerspective(analyticsGame, sideId),
    opposingSideId,
    playerStats: computeAdvancedPlayerStats(analyticsGame, sideId),
    teamStats: computeAdvancedTeamStats(analyticsGame, sideId),
    pullStats: computePullStats(analyticsGame, sideId),
    timeOfPossessionStats: computeAdvancedTimeOfPossessionStats(
      analyticsGame,
      sideId,
      opposingSideId,
    ),
    timingStats: computeAdvancedTimingStats(analyticsGame),
  };
}
