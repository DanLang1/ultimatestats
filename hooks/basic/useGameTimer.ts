import { useEffect } from 'react';

import { useGameStore } from '@/store/basic/gameStore';
import { useSettingsStore } from '@/store/settingsStore';

export function useGameTimer() {
  const { hardCapMins, softCapMins } = useSettingsStore();
  const {
    setSoftCapPending,
    softCapPending,
    timerIsActive: isActive,
    setTimerActive: setIsActive,
    timerEndTime: endTime,
    setTimerEndTime: setEndTime,
    timerTimeLeft: timeLeft,
    setTimerTimeLeft: setTimeLeft,
  } = useGameStore();

  /**
   * setInterval prone to inconsistent times, so using a date reference to calculate remaining time
   * Instead of tracking time since last 'tick' with setInterval (which can be inconsistent), we check when the timer should end (endTime) and calculate remaining time (endTime - now)
   */
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && endTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
        setTimeLeft(remaining);

        // Check for Softcap
        if (!softCapPending && remaining <= softCapMins * 60) {
          setSoftCapPending(true);
        }

        if (remaining === 0) {
          setIsActive(false);
          setEndTime(null);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [
    isActive,
    endTime,
    softCapPending,
    softCapMins,
    setSoftCapPending,
    setIsActive,
    setEndTime,
    setTimeLeft,
  ]);

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
    setTimeLeft(hardCapMins * 60);
  };

  return {
    timeLeft,
    isActive,
    toggleTimer,
    resetTimer,
  };
}
