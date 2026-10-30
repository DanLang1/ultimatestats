import { useNow } from '@/hooks/useTimer';
import { formatTimerSeconds, getSecondsUntil } from '@/lib/utils';

interface PausableCountdownOptions {
  /** Absolute timestamp when the countdown hits zero; `null` while paused. */
  endTime: number | null;
  setEndTime: (time: number | null) => void;
  /** Seconds remaining as of the last pause or adjustment; the source of truth while paused. */
  timeLeft: number;
  setTimeLeft: (seconds: number) => void;
  minSeconds: number;
  maxSeconds: number;
}

/**
 * Store-backed break countdown with drift-proof timing. While running, seconds left derive from
 * the absolute `endTime` on each local tick; the store is written only on toggle and adjust. The
 * countdown keeps running past zero so overtime is visible.
 */
export function usePausableCountdown({
  endTime,
  setEndTime,
  timeLeft: pausedTimeLeft,
  setTimeLeft,
  minSeconds,
  maxSeconds,
}: PausableCountdownOptions) {
  const isRunning = endTime !== null;
  const now = useNow(isRunning);
  const timeLeft = endTime === null ? pausedTimeLeft : getSecondsUntil(endTime, now);

  const toggleTimer = () => {
    if (endTime === null) {
      setEndTime(Date.now() + timeLeft * 1000);
      return;
    }

    setTimeLeft(getSecondsUntil(endTime, Date.now()));
    setEndTime(null);
  };

  const adjustTimer = (deltaSeconds: number) => {
    const newTime = Math.max(minSeconds, Math.min(maxSeconds, timeLeft + deltaSeconds));
    setTimeLeft(newTime);

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
