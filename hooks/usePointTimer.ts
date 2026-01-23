import { useGameStore } from '@/store/gameStore';
import { useEffect, useState } from 'react';

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
  } = useGameStore();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isActive = currentPointStartTime !== null;
  const isPaused = pointTimerPausedElapsed !== null;

  useEffect(() => {
    // If no point is active, reset elapsed time
    if (!isActive) {
      setElapsedSeconds(0);
      return;
    }

    // If paused, show the frozen elapsed time
    if (isPaused) {
      setElapsedSeconds(Math.floor(pointTimerPausedElapsed / 1000));
      return;
    }

    // Running: update elapsed time every 500ms
    const updateElapsed = () => {
      const elapsed = Date.now() - currentPointStartTime;
      setElapsedSeconds(Math.floor(elapsed / 1000));
    };

    // Initial update
    updateElapsed();

    const interval = setInterval(updateElapsed, 500);
    return () => clearInterval(interval);
  }, [isActive, isPaused, currentPointStartTime, pointTimerPausedElapsed]);

  return {
    elapsedSeconds,
    isActive,
    isPaused,
    isEnabled: pointTimerEnabled,
    togglePause: togglePointTimerPause,
  };
}
