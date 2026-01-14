import { useGameStore } from '@/store/gameStore';
import { useEffect } from 'react';

const DEFAULT_HALFTIME_SECONDS = 7 * 60;
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
    if (!isRunning || !endTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      setTimeLeft(remaining);

      // Stop when timer reaches 0
      if (remaining === 0) {
        setEndTime(null);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isRunning, endTime, setTimeLeft, setEndTime]);

  const toggleTimer = () => {
    if (!isRunning) {
      // Start: set end time based on current timeLeft
      const targetTime = Date.now() + timeLeft * 1000;
      setEndTime(targetTime);
    } else {
      // Pause: capture remaining time and clear end time
      if (endTime) {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
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
      const currentRemaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      const diff = newTime - currentRemaining;
      setEndTime(endTime + diff * 1000);
    }
  };

  const handleContinue = () => {
    clearHalftimeBreak();
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    timeLeft,
    isRunning,
    isComplete: timeLeft === 0,
    formattedTime: formatTime(timeLeft),
    toggleTimer,
    adjustTimer,
    handleContinue,
    canDecrement: timeLeft > MIN_SECONDS,
    canIncrement: timeLeft < MAX_SECONDS,
  };
}
