import { usePausableCountdown } from '@/hooks/basic/usePausableCountdown';
import { MAX_TIMEOUT_SECONDS, MIN_TIMEOUT_SECONDS } from '@/lib/constants';
import { useGameStore } from '@/store/basic/gameStore';

/** Timeout countdown, adjusted in seconds. Resumes the point timer when the timeout ends. */
export function useTimeoutTimer() {
  const {
    timeoutEndTime,
    setTimeoutEndTime,
    timeoutTimeLeft,
    setTimeoutTimeLeft,
    clearTimeoutModal,
    pointTimerEnabled,
    pointTimerPausedElapsed,
    currentPointStartTime,
    togglePointTimerPause,
  } = useGameStore();

  const countdown = usePausableCountdown({
    endTime: timeoutEndTime,
    setEndTime: setTimeoutEndTime,
    timeLeft: timeoutTimeLeft,
    setTimeLeft: setTimeoutTimeLeft,
    minSeconds: MIN_TIMEOUT_SECONDS,
    maxSeconds: MAX_TIMEOUT_SECONDS,
  });

  const handleContinue = () => {
    // Resume point timer if it was paused (timeout pauses the point timer)
    if (pointTimerEnabled && currentPointStartTime !== null && pointTimerPausedElapsed !== null) {
      togglePointTimerPause(); // This will resume it
    }
    clearTimeoutModal();
  };

  return {
    ...countdown,
    handleContinue,
  };
}
