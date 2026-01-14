import { useGameStore } from '@/store/gameStore';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

/**
 * Navigates to HalftimeModal when isHalftimeBreak is true.
 * Uses useFocusEffect to ensure the modal shows every time the
 * scoreboard gains focus (e.g., after completing stat entry).
 *
 * Waits for pendingStatEntry to be cleared first - stat entry takes priority.
 */
export function useHalftimeNavigation() {
  const { isHalftimeBreak, pendingStatEntry } = useGameStore();

  useFocusEffect(
    useCallback(() => {
      // Only show halftime modal after stat entry is complete
      if (isHalftimeBreak && !pendingStatEntry) {
        router.push('/HalftimeModal');
      }
    }, [isHalftimeBreak, pendingStatEntry]),
  );
}
