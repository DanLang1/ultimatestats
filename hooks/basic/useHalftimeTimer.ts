import { useEffect } from 'react';

import { formatTimerSeconds } from '@/lib/utils';
import { useGameStore } from '@/store/basic/gameStore';

const MIN_SECONDS = 0;
const MAX_SECONDS = 15 * 60;

/**
 * Hook for managing the halftime countdown timer with drift-proof timing.
 * Uses absolute timestamps (halftimeEndTime) instead of interval-based counting.
 */
export function useHalftimeTimer() {
  const {
    halftimeEndTime: endTime,
    setHalftimeEndTime: setEndTime,
    halftimeTimeLeft: timeLeft,
    setHalftimeTimeLeft: setTimeLeft,
    clearHalftimeBreak,
  } = useGameStore();

  const isRunning = endTime !== null;

  // Drift-proof countdown using absolute timestamps
  useEffect(() => {
    if (!isRunning || !endTime) return undefined;

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

  const adjustTimer = (deltaMinutes: number) => {
    const newTime = Math.max(MIN_SECONDS, Math.min(MAX_SECONDS, timeLeft + deltaMinutes * 60));
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
    clearHalftimeBreak();
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
