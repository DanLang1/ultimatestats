import { useEffect, useRef, useState } from 'react';

import { TIMER_TICK_MS } from '@/lib/constants';

export function useCountdown(initialSeconds: number, running: boolean) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, TIMER_TICK_MS);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  return timeLeft;
}
