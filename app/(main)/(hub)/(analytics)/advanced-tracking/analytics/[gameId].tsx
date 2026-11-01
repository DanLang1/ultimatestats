import { useLocalSearchParams } from 'expo-router';

import AdvancedGameRecoveryScreen from '@/components/advancedTracking/AdvancedGameRecoveryScreen';
import AdvancedSavedGameStatsScreen from '@/components/advancedTracking/AdvancedSavedGameStatsScreen';
import type { StatsScreenOrigin } from '@/lib/statsRouteScope';

export default function AdvancedGameStatsScreen() {
  const { gameId, from } = useLocalSearchParams<{
    gameId?: string;
    from?: StatsScreenOrigin;
  }>();
  if (!gameId) return <AdvancedGameRecoveryScreen isLoading={false} from={from} />;
  return <AdvancedSavedGameStatsScreen gameId={gameId} from={from} />;
}
