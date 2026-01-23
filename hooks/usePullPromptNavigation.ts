import { useGameStore } from '@/store/gameStore';
import { router, useFocusEffect, usePathname } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Hook to show the PullPrompt modal when stat tracking is enabled
 * and no team has been assigned initial possession yet.
 * Only triggers when on the main scoreboard page.
 *
 * Uses useFocusEffect instead of useEffect to ensure navigation only happens
 * after the screen is fully focused, avoiding race conditions.
 */
export function usePullPromptNavigation() {
  const { statTrackingEnabled, possession } = useGameStore();
  const pathname = usePathname();
  const hasNavigatedRef = useRef(false);

  // DERIVED LOGIC: Calculate if we should show the prompt
  const shouldShowPullPrompt = pathname === '/' && statTrackingEnabled && possession === null;

  useFocusEffect(
    useCallback(() => {
      // Reset the navigation guard when conditions change
      if (!shouldShowPullPrompt) {
        hasNavigatedRef.current = false;
        return;
      }

      // Prevent double navigation
      if (hasNavigatedRef.current) return;
      hasNavigatedRef.current = true;

      router.push('/PullPromptModal');
    }, [shouldShowPullPrompt]),
  );
}
