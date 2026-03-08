import { useGameStore } from '@/store/gameStore';
import { formatTimerSeconds } from '@/lib/utils';
import { useEffect } from 'react';

const MIN_SECONDS = 0;
const MAX_SECONDS = 5 * 60; // 5 minute max for timeout timer

/**
 * Hook for managing the timeout countdown timer with drift-proof timing.
 * Uses absolute timestamps (timeoutEndTime) instead of interval-based counting.
 */
export function useTimeoutTimer() {
  const {
    timeoutEndTime: endTime,
    setTimeoutEndTime: setEndTime,
    timeoutTimeLeft: timeLeft,
    setTimeoutTimeLeft: setTimeLeft,
    clearTimeoutModal,
    pointTimerEnabled,
    pointTimerPausedElapsed,
    currentPointStartTime,
    togglePointTimerPause,
  } = useGameStore();

  const isRunning = endTime !== null;

  // Drift-proof countdown using absolute timestamps
  useEffect(() => {
    if (!isRunning || !endTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.ceil((endTime - now) / 1000);
      setTimeLeft(remaining);
    }, 500);

    return () => clearInterval(interval);
  }, [isRunning, endTime, setTimeLeft]);

  const toggleTimer = () => {
    if (!isRunning) {
      // Start: set end time based on current timeLeft
      const targetTime = Date.now() + timeLeft * 1000;
      setEndTime(targetTime);
    } else {
      // Pause: capture remaining time and clear end time
      if (endTime) {
        const now = Date.now();
        const remaining = Math.ceil((endTime - now) / 1000);
        setTimeLeft(remaining);
      }
      setEndTime(null);
    }
  };

  const adjustTimer = (deltaSeconds: number) => {
    const newTime = Math.max(MIN_SECONDS, Math.min(MAX_SECONDS, timeLeft + deltaSeconds));
    setTimeLeft(newTime);

    // If timer is running, update end time to reflect new duration
    if (endTime) {
      const now = Date.now();
      const currentRemaining = Math.ceil((endTime - now) / 1000);
      const diff = newTime - currentRemaining;
      setEndTime(endTime + diff * 1000);
    }
  };

  const handleContinue = () => {
    // Resume point timer if it was paused (timeout pauses the point timer)
    if (pointTimerEnabled && currentPointStartTime !== null && pointTimerPausedElapsed !== null) {
      togglePointTimerPause(); // This will resume it
    }
    clearTimeoutModal();
  };

  return {
    timeLeft,
    isRunning,
    isComplete: timeLeft <= 0,
    isOvertime: timeLeft < 0,
    formattedTime: formatTimerSeconds(timeLeft),
    toggleTimer,
    adjustTimer,
    handleContinue,
    canDecrement: timeLeft > MIN_SECONDS,
    canIncrement: timeLeft < MAX_SECONDS,
  };
}
