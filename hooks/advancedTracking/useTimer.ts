import { useEffect, useRef, useState } from 'react';

interface TimestampTimerOptions {
  timestamp: number | null;
  mode?: 'elapsed' | 'countdown';
  durationSeconds?: number;
  intervalMs?: number;
  enabled?: boolean;
}

// TODO: refactor other timers to use this hook

/**
 * A timer that calculates elapsed or remaining time based on a fixed timestamp reference.
 * Highly robust against re-renders and drift-proof as it always references the system clock.
 *
 * Useful when the time reference is managed externally (e.g., in a store, props, or database).
 */
export function useTimestampTimer({
  timestamp,
  mode = 'elapsed',
  durationSeconds = 0,
  intervalMs = 1000,
  enabled = true,
}: TimestampTimerOptions) {
  const [value, setValue] = useState(() => {
    if (timestamp === null) return mode === 'countdown' ? durationSeconds : 0;
    const now = Date.now();
    if (mode === 'countdown') {
      const totalMs = durationSeconds * 1000;
      return Math.max(0, Math.ceil((totalMs - (now - timestamp)) / 1000));
    }
    return now - timestamp;
  });

  useEffect(() => {
    if (!enabled || timestamp === null) {
      if (timestamp === null) {
        setValue(mode === 'countdown' ? durationSeconds : 0);
      }
      return;
    }

    const update = () => {
      const now = Date.now();
      if (mode === 'countdown') {
        const totalMs = durationSeconds * 1000;
        const left = Math.max(0, Math.ceil((totalMs - (now - timestamp)) / 1000));
        setValue(left);
      } else {
        setValue(now - timestamp);
      }
    };

    update();
    const id = setInterval(update, intervalMs);
    return () => clearInterval(id);
  }, [timestamp, mode, durationSeconds, intervalMs, enabled]);

  return value;
}

/**
 * A self-contained stopwatch hook with start/stop/reset controls.
 * Uses a timestamp reference internally to be drift-proof.
 */
export function useStopwatch(initialElapsedMs = 0) {
  const [elapsed, setElapsed] = useState(initialElapsedMs);
  const [isRunning, setIsRunning] = useState(false);
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - (lastTickRef.current || now);
      lastTickRef.current = now;
      setElapsed((prev) => prev + delta);
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning]);

  const start = () => setIsRunning(true);
  const stop = () => setIsRunning(false);
  const reset = () => {
    setIsRunning(false);
    setElapsed(0);
  };

  return {
    elapsed,
    isRunning,
    start,
    stop,
    reset,
    setElapsed,
  };
}
