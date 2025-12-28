import { useGameStore } from '@/store/gameStore';
import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';

/**
 * Hook to show the PullPrompt modal when stat tracking is enabled
 * and no team has been assigned initial possession yet.
 * Only triggers when on the main scoreboard page.
 */
export function usePullPromptNavigation() {
  const { statTrackingEnabled, possession } = useGameStore();
  const pathname = usePathname();

  useEffect(() => {
    // Only show the pull prompt when on the main scoreboard page
    if (pathname === '/' && statTrackingEnabled && possession === null) {
      router.push('/PullPromptModal');
    }
  }, [statTrackingEnabled, possession, pathname]);
}
