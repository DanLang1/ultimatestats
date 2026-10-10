import { useLocalSearchParams } from 'expo-router';

import AdvancedGameRecoveryScreen, {
  type AdvancedGameStatsOrigin,
} from '@/components/advancedTracking/AdvancedGameRecoveryScreen';
import AdvancedSavedGameStatsScreen from '@/components/advancedTracking/AdvancedSavedGameStatsScreen';

export default function AdvancedGameStatsScreen() {
  const { gameId, from } = useLocalSearchParams<{
    gameId?: string;
    from?: AdvancedGameStatsOrigin;
  }>();
  if (!gameId) return <AdvancedGameRecoveryScreen isLoading={false} from={from} />;
  return <AdvancedSavedGameStatsScreen gameId={gameId} from={from} />;
}
