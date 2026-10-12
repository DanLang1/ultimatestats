import { useEffect } from 'react';

import { formatTimerSeconds, getSecondsUntil } from '@/lib/utils';

interface PausableCountdownOptions {
  /** Absolute timestamp when the countdown hits zero; `null` while paused. */
  endTime: number | null;
  setEndTime: (time: number | null) => void;
  /** Seconds remaining; the source of truth while paused. */
  timeLeft: number;
  setTimeLeft: (seconds: number) => void;
  minSeconds: number;
  maxSeconds: number;
}

/**
 * Store-backed break countdown with drift-proof timing. Uses absolute timestamps (endTime)
 * instead of interval-based counting, and keeps running past zero so overtime is visible.
 */
export function usePausableCountdown({
  endTime,
  setEndTime,
  timeLeft,
  setTimeLeft,
  minSeconds,
  maxSeconds,
}: PausableCountdownOptions) {
  const isRunning = endTime !== null;

  useEffect(() => {
    if (endTime === null) return undefined;

    const interval = setInterval(() => {
      setTimeLeft(getSecondsUntil(endTime, Date.now()));
    }, 500);

    return () => clearInterval(interval);
  }, [endTime, setTimeLeft]);

  const toggleTimer = () => {
    if (endTime === null) {
      setEndTime(Date.now() + timeLeft * 1000);
      return;
    }

    // Pause: capture remaining time and clear end time
    setTimeLeft(getSecondsUntil(endTime, Date.now()));
    setEndTime(null);
  };

  const adjustTimer = (deltaSeconds: number) => {
    const newTime = Math.max(minSeconds, Math.min(maxSeconds, timeLeft + deltaSeconds));
    setTimeLeft(newTime);

    // If timer is running, shift the end time to reflect the new duration
    if (endTime !== null) {
      const diff = newTime - getSecondsUntil(endTime, Date.now());
      setEndTime(endTime + diff * 1000);
    }
  };

  return {
    timeLeft,
    isRunning,
    isComplete: timeLeft <= 0,
    isOvertime: timeLeft < 0,
    formattedTime: formatTimerSeconds(timeLeft),
    toggleTimer,
    adjustTimer,
    canDecrement: timeLeft > minSeconds,
    canIncrement: timeLeft < maxSeconds,
  };
}
