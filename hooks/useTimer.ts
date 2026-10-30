import { useEffect, useRef, useState } from 'react';

import { STOPWATCH_TICK_MS, TIMER_TICK_MS } from '@/lib/constants';
import { getSecondsUntil } from '@/lib/utils';

/**
 * Current wall-clock time, refreshed every `intervalMs` while `enabled`. When disabled the value
 * holds at the last tick, so callers derive paused or idle displays from their own timestamps.
 * Deriving from the system clock keeps timers drift-proof across re-renders.
 */
export function useNow(enabled: boolean, intervalMs = TIMER_TICK_MS): number {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!enabled) return undefined;

    // Resync on enable so the first running render doesn't use a stale timestamp.
    // eslint-disable-next-line react/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);

  return now;
}

interface CountdownSecondsOptions {
  /** When the countdown started; `null` means it is not running. */
  startedAt: number | null;
  durationSeconds: number;
  intervalMs?: number;
}

/**
 * Seconds left in a countdown that started at `startedAt`, going negative once it passes zero.
 * Returns `durationSeconds` while not running.
 */
export function useCountdownSeconds({
  startedAt,
  durationSeconds,
  intervalMs = TIMER_TICK_MS,
}: CountdownSecondsOptions): number {
  const now = useNow(startedAt !== null, intervalMs);
  if (startedAt === null) return durationSeconds;

  // Clamp so a tick that predates a re-baselined `startedAt` never adds time.
  const elapsedMs = Math.max(0, now - startedAt);
  return getSecondsUntil(durationSeconds * 1000, elapsedMs);
}

/**
 * Uses a timestamp reference internally to be drift-proof.
 */
export function useStopwatch(initialElapsedMs = 0) {
  const [elapsed, setElapsed] = useState(initialElapsedMs);
  const [isRunning, setIsRunning] = useState(false);
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) {
      lastTickRef.current = null;
      return undefined;
    }

    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - (lastTickRef.current || now);
      lastTickRef.current = now;
      setElapsed((prev) => prev + delta);
    }, STOPWATCH_TICK_MS);

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
