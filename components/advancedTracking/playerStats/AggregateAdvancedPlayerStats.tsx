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
  const { data: aggregateGames, isFetching } = useAdvancedGames(gameIds);
  const analyticsGame = aggregateAnalyticsGames(aggregateGames.map(buildAnalyticsGame));

  return (
    <AdvancedPlayerStatsView
      analyticsGame={analyticsGame}
      participantId={participantId}
      isLoading={isFetching}
      aggregateGames={aggregateGames}
      aggregateGameIds={gameIds}
      selectedImpactGameId={selectedImpactGameId}
    />
  );
}
