import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { router, useFocusEffect, usePathname } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Hook to show the PullPrompt modal when:
 * - Stat tracking is enabled and no team has initial possession, OR
 * - Gender ratio tracking is enabled and no first point ratio is set
 * Only triggers when on the main scoreboard page.
 *
 * Uses useFocusEffect instead of useEffect to ensure navigation only happens
 * after the screen is fully focused, avoiding race conditions.
 */
export function usePullPromptNavigation() {
  const { statTrackingEnabled, possession } = useGameStore();
  const { genderRatioEnabled, firstPointRatio } = useSettingsStore();
  const pathname = usePathname();
  const hasNavigatedRef = useRef(false);

  // DERIVED LOGIC: Calculate if we should show the prompt
  const needPossession = statTrackingEnabled && possession === null;
  const needRatio = genderRatioEnabled && firstPointRatio === null;
  const shouldShowPullPrompt = pathname === '/' && (needPossession || needRatio);

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
