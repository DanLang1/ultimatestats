import { useGameStore } from '@/store/gameStore';
import { router } from 'expo-router';
import { useEffect } from 'react';

/**
 * Navigates to HalftimeModal when isHalftimeBreak is true.
 * This handles the case where user navigates away during halftime
 * and returns to the scoreboard - the modal will re-show.
 */
export function useHalftimeNavigation() {
  const { isHalftimeBreak } = useGameStore();

  useEffect(() => {
    if (isHalftimeBreak) {
      router.push('/HalftimeModal');
    }
  }, [isHalftimeBreak]);
}
