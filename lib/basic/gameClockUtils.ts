import { getSecondsUntil } from '@/lib/utils';

/** The persisted game-clock fields on the basic game store. */
export interface GameClockState {
  /** Absolute deadline while the clock is running; null while paused, reset, or expired. */
  timerEndTime: number | null;
  /** Seconds left when the clock last started, paused, reset, or expired. Stale while running. */
  timerTimeLeft: number;
}

/**
 * Whole seconds left on the game clock at `now`: live from the deadline while running, the
 * stored remainder otherwise. Never negative, so `0` always means the hard cap has been reached,
 * even before the expiry effect has written it to the store.
 */
export function getGameClockSecondsLeft(state: GameClockState, now: number): number {
  if (state.timerEndTime === null) return state.timerTimeLeft;
  return Math.max(0, getSecondsUntil(state.timerEndTime, now));
}

/**
 * Seconds left as the store last recorded them, for render-time checks that must stay pure and
 * must not tick. While running this is the remainder at the last start or pause, so it reports the
 * hard cap only once `useGameTimer`'s expiry effect has written it, which happens within one tick
 * wherever the clock is displayed. Store actions and event handlers use
 * `getGameClockSecondsLeft(state, Date.now())` instead, which closes that gap.
 */
export function getRecordedGameClockSecondsLeft(
  state: Pick<GameClockState, 'timerTimeLeft'>,
): number {
  return state.timerTimeLeft;
}
