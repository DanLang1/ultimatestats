import AdvancedPlayerStatsView from '@/components/advancedTracking/playerStats/AdvancedPlayerStatsView';
import { useAdvancedGames } from '@/hooks/advancedTracking/useAdvancedGameQueries';
import { aggregateAnalyticsGames } from '@/lib/advancedTracking/aggregateAnalyticsGames';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';

type AggregateAdvancedPlayerStatsProps = {
  gameIds: string[];
  participantId: string | undefined;
  selectedImpactGameId: string | undefined;
};

export default function AggregateAdvancedPlayerStats({
  gameIds,
  participantId,
  selectedImpactGameId,
}: AggregateAdvancedPlayerStatsProps) {
  const { data: aggregateGames, isLoading, isError, isComplete } = useAdvancedGames(gameIds);
  const analyticsGame =
    isComplete && !isError ? aggregateAnalyticsGames(aggregateGames.map(buildAnalyticsGame)) : null;

  return (
    <AdvancedPlayerStatsView
      analyticsGame={analyticsGame}
      participantId={participantId}
      isLoading={!isComplete && isLoading}
      aggregateGames={isComplete ? aggregateGames : []}
      aggregateGameIds={gameIds}
      selectedImpactGameId={selectedImpactGameId}
    />
  );
}
