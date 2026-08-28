import { useEffect, useState } from 'react';

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

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isActive = currentPointStartTime !== null;
  const isPaused = pointTimerPausedElapsed !== null;

  useEffect(() => {
    // If no point is active, reset elapsed time
    if (!isActive) {
      // Keep the visible timer aligned with point lifecycle changes.
      // eslint-disable-next-line react/set-state-in-effect
      setElapsedSeconds(0);
      return undefined;
    }

    // If paused, show the frozen elapsed time
    if (isPaused) {
      setElapsedSeconds(Math.floor(pointTimerPausedElapsed / 1000));
      return undefined;
    }

    // Running: update elapsed time every 500ms
    const updateElapsed = () => {
      const elapsed = Date.now() - currentPointStartTime;
      setElapsedSeconds(Math.floor(elapsed / 1000));
    };

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
    restart: startPoint,
  };
}
