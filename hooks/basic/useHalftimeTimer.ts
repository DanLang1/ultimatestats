import { usePausableCountdown } from '@/hooks/basic/usePausableCountdown';
import { MAX_HALFTIME_BREAK_SECONDS, MIN_HALFTIME_BREAK_SECONDS } from '@/lib/constants';
import { useGameStore } from '@/store/basic/gameStore';

/** Halftime break countdown, adjusted in whole minutes. */
export function useHalftimeTimer() {
  const {
    halftimeEndTime,
    setHalftimeEndTime,
    halftimeTimeLeft,
    setHalftimeTimeLeft,
    clearHalftimeBreak,
  } = useGameStore();

  const countdown = usePausableCountdown({
    endTime: halftimeEndTime,
    setEndTime: setHalftimeEndTime,
    timeLeft: halftimeTimeLeft,
    setTimeLeft: setHalftimeTimeLeft,
    minSeconds: MIN_HALFTIME_BREAK_SECONDS,
    maxSeconds: MAX_HALFTIME_BREAK_SECONDS,
  });

  const adjustTimer = (deltaMinutes: number) => {
    countdown.adjustTimer(deltaMinutes * 60);
  };

  const handleContinue = () => {
    clearHalftimeBreak();
  };

  return {
    ...countdown,
    adjustTimer,
    handleContinue,
  };
}
