import AdvancedPlayerStatsView from '@/components/advancedTracking/playerStats/AdvancedPlayerStatsView';
import { useAdvancedGames } from '@/hooks/advancedTracking/useAdvancedGameQueries';
import { aggregateAnalyticsGames } from '@/lib/advancedTracking/aggregateAnalyticsGames';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import { isAdvancedGameAggregateEligible } from '@/lib/advancedTracking/summary';

type AggregateAdvancedPlayerStatsProps = {
  gameIds: string[];
  participantId: string | undefined;
  sideId: string | undefined;
  selectedImpactGameId: string | undefined;
};

export default function AggregateAdvancedPlayerStats({
  gameIds,
  participantId,
  sideId,
  selectedImpactGameId,
}: AggregateAdvancedPlayerStatsProps) {
  const { data: aggregateGames, isLoading, isError, isComplete } = useAdvancedGames(gameIds);
  const eligibleGames = aggregateGames.filter(isAdvancedGameAggregateEligible);
  const analyticsGame =
    isComplete && !isError ? aggregateAnalyticsGames(eligibleGames.map(buildAnalyticsGame)) : null;
  const eligibleGameIds = eligibleGames.map((game) => game.id);

  return (
    <AdvancedPlayerStatsView
      analyticsGame={analyticsGame}
      participantId={participantId}
      requestedSideId={sideId}
      isLoading={!isComplete && isLoading}
      aggregateGames={isComplete ? eligibleGames : []}
      aggregateGameIds={eligibleGameIds}
      selectedImpactGameId={selectedImpactGameId}
    />
  );
}
