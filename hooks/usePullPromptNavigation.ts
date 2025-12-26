import { useGameStore } from '@/store/gameStore';
import { router } from 'expo-router';
import { useEffect } from 'react';

/**
 * Hook to show the PullPrompt modal when stat tracking is enabled
 * and no team has been assigned initial possession yet.
 */
export function usePullPromptNavigation() {
  const { statTrackingEnabled, possession } = useGameStore();

  useEffect(() => {
    if (statTrackingEnabled && possession === null) {
      router.push('/PullPromptModal');
    }
  }, [statTrackingEnabled, possession]);
}
