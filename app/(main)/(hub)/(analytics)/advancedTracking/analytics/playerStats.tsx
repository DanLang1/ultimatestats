import { useLocalSearchParams } from 'expo-router';

import AggregateAdvancedPlayerStats from '@/components/advancedTracking/playerStats/AggregateAdvancedPlayerStats';
import MissingPlayerStatsGame from '@/components/advancedTracking/playerStats/MissingPlayerStatsGame';
import SingleAdvancedPlayerStats from '@/components/advancedTracking/playerStats/SingleAdvancedPlayerStats';

export default function AdvancedPlayerStatsScreen() {
  const {
    gameId,
    participantId,
    aggregateGameIds: aggregateGameIdsParam,
    selectedImpactGameId,
  } = useLocalSearchParams<{
    gameId?: string;
    participantId?: string;
    aggregateGameIds?: string;
    selectedImpactGameId?: string;
  }>();

  if (gameId === 'aggregate') {
    const aggregateGameIds = (aggregateGameIdsParam ?? '').split(',').filter((id) => id.length > 0);
    return (
      <AggregateAdvancedPlayerStats
        gameIds={aggregateGameIds}
        participantId={participantId}
        selectedImpactGameId={selectedImpactGameId}
      />
    );
  }

  if (!gameId) {
    return <MissingPlayerStatsGame />;
  }

  return <SingleAdvancedPlayerStats gameId={gameId} participantId={participantId} />;
}
