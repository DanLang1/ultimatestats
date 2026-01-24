import { checkGameOver } from '@/lib/gameUtils';
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

  const isGameOver = checkGameOver({
    team1Score: useGameStore.getState().team1Score,
    team2Score: useGameStore.getState().team2Score,
    gameTo: useGameStore.getState().gameTo,
    timerTimeLeft: useGameStore.getState().timerTimeLeft,
  });

  useFocusEffect(
    useCallback(() => {
      // Only show halftime modal after stat entry is complete
      if (isHalftimeBreak && !pendingStatEntry && !isGameOver) {
        router.push('/HalftimeModal');
      }
    }, [isHalftimeBreak, pendingStatEntry, isGameOver]),
  );
}
