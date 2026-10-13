import { useEffect } from 'react';

import { useNow } from '@/hooks/useTimer';
import { getGameClockSecondsLeft } from '@/lib/basic/gameClockUtils';
import { useGameStore } from '@/store/basic/gameStore';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * The basic game clock (hard cap countdown). Seconds left derive from the persisted deadline, so
 * the store is written only on start, pause, reset, and the two one-shot transitions below.
 */
export function useGameTimer() {
  const hardCapMins = useSettingsStore((state) => state.hardCapMins);
  const softCapMins = useSettingsStore((state) => state.softCapMins);
  const timerEndTime = useGameStore((state) => state.timerEndTime);
  const timerTimeLeft = useGameStore((state) => state.timerTimeLeft);
  const softCapPending = useGameStore((state) => state.softCapPending);
  const setSoftCapPending = useGameStore((state) => state.setSoftCapPending);
  const startGameClock = useGameStore((state) => state.startGameClock);
  const pauseGameClock = useGameStore((state) => state.pauseGameClock);
  const expireGameClock = useGameStore((state) => state.expireGameClock);
  const resetGameClock = useGameStore((state) => state.resetGameClock);

  const isActive = timerEndTime !== null;
  const now = useNow(isActive);
  const timeLeft = getGameClockSecondsLeft({ timerEndTime, timerTimeLeft }, now);

  // Soft cap pending and hard cap expiry are the clock's only store writes while it runs. They
  // are checked against the wall clock on every tick so a delayed or backgrounded tick still
  // lands them, and they are idempotent when several screens mount this hook at once.
  const shouldMarkSoftCapPending = isActive && !softCapPending && timeLeft <= softCapMins * 60;
  const hasExpired = isActive && timeLeft === 0;

  useEffect(() => {
    if (shouldMarkSoftCapPending) setSoftCapPending(true);
  }, [shouldMarkSoftCapPending, setSoftCapPending]);

  useEffect(() => {
    if (hasExpired) expireGameClock();
  }, [hasExpired, expireGameClock]);

  const toggleTimer = () => {
    if (isActive) pauseGameClock();
    else startGameClock();
  };

  const resetTimer = () => {
    resetGameClock(hardCapMins * 60);
  };

  return {
    timeLeft,
    isActive,
    toggleTimer,
    resetTimer,
  };
}
