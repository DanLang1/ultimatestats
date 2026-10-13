import { useNow } from '@/hooks/useTimer';
import { useGameStore } from '@/store/basic/gameStore';

/**
 * Hook to manage point timer elapsed time display.
 * Returns the current elapsed time in seconds and pause state.
 */
export function usePointTimer() {
  const {
    currentPointStartTime,
    pointTimerPausedElapsed,
    pointTimerEnabled,
    togglePointTimerPause,
    startPoint,
  } = useGameStore();

  const isActive = currentPointStartTime !== null;
  const isPaused = pointTimerPausedElapsed !== null;
  const now = useNow(isActive && !isPaused);

  let elapsedMs = 0;
  if (isActive) {
    elapsedMs = isPaused ? pointTimerPausedElapsed : Math.max(0, now - currentPointStartTime);
  }

  return {
    elapsedSeconds: Math.floor(elapsedMs / 1000),
    isActive,
    isPaused,
    isEnabled: pointTimerEnabled,
    togglePause: togglePointTimerPause,
    restart: startPoint,
  };
}
