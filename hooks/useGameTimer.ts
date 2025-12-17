import { useGameStore } from '@/store/gameStore';
import { useEffect, useState } from 'react';

export function useGameTimer() {
  const { gameLength, setSoftCapPending, softCapPending, softCapMins } = useGameStore();

  const [timeLeft, setTimeLeft] = useState(gameLength * 60);
  const [isActive, setIsActive] = useState(false);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [prevGameLength, setPrevGameLength] = useState(gameLength);

  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  // may seem weird to set state during render, but this is actually the correct way to do it - as long as you're adjusting state within the component
  if (gameLength !== prevGameLength) {
    setPrevGameLength(gameLength);
    setTimeLeft(gameLength * 60);
    setIsActive(false);
    setEndTime(null);
  }

  /**
   * setInterval prone to inconsistent times, so using a date reference to calculate remaining time
   * Instead of tracking time since last 'tick' with setInterval (which can be inconsistent), we check when the timer should end (endTime) and calculate remaining time (endTime - now)
   */
  useEffect(() => {
    let interval: number;
    if (isActive && endTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
        setTimeLeft(remaining);

        // Check for Softcap
        const elapsedSeconds = gameLength * 60 - remaining;
        if (!softCapPending && elapsedSeconds >= softCapMins * 60) {
          setSoftCapPending(true);
        }

        if (remaining === 0) {
          setIsActive(false);
          setEndTime(null);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isActive, endTime, softCapPending, gameLength, softCapMins, setSoftCapPending]);

  const toggleTimer = () => {
    if (!isActive) {
      // Start
      const targetTime = Date.now() + timeLeft * 1000;
      setEndTime(targetTime);
      setIsActive(true);
    } else {
      // Pause
      if (endTime) {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
        setTimeLeft(remaining);
      }
      setEndTime(null);
      setIsActive(false);
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setEndTime(null);
    setTimeLeft(gameLength * 60);
  };

  return {
    timeLeft,
    isActive,
    toggleTimer,
    resetTimer,
  };
}
