import { CAP_WARNING_THRESHOLD_MS } from '@/lib/constants';

export type CapLabel = 'SOFT CAP' | 'HARD CAP';

export interface CapState {
  /** Which cap we're currently counting down to. */
  capLabel: CapLabel;
  /** True once the game clock has crossed the soft-cap threshold. */
  pastSoftCap: boolean;
  /** Elapsed-time threshold for the cap we're counting down to (ms). */
  capTargetMs: number;
  /** Progress within the current cap window, clamped to [0, 1]. */
  capProgress: number;
  /** Time remaining until `capTargetMs`, clamped to >= 0 (ms). */
  capTimeLeftMs: number;
  /** True when time left is below the warning threshold. */
  capIsWarning: boolean;
}

export interface CapInput {
  /** Milliseconds since the game started (first pull). */
  gameElapsedMs: number;
  /** Whether the game clock has started — if false, state is "pre-game". */
  gameStarted: boolean;
  /** Total game length in minutes — hard cap fires at this elapsed time. */
  gameLengthMinutes: number;
  /** Minutes before hard cap when soft cap fires. */
  softCapMins: number;
}

/**
 * Derives the progress-bar state for the soft/hard cap countdown.
 *
 * Counts down toward the soft cap first. Once crossed, switches to counting
 * down toward the hard cap — progress restarts within the soft→hard window.
 *
 * Pre-game (gameStarted=false): label is SOFT CAP, progress 0, time-left equals
 * the soft-cap threshold, warning is never active.
 */
export function computeCapState(input: CapInput): CapState {
  const { gameElapsedMs, gameStarted, gameLengthMinutes, softCapMins } = input;

  const softCapMs = Math.max(0, (gameLengthMinutes - softCapMins) * 60 * 1000);
  const hardCapMs = Math.max(softCapMs, gameLengthMinutes * 60 * 1000);

  const pastSoftCap = gameStarted && gameElapsedMs >= softCapMs;
  const capTargetMs = pastSoftCap ? hardCapMs : softCapMs;
  const capWindowStartMs = pastSoftCap ? softCapMs : 0;
  const capWindowMs = Math.max(1, capTargetMs - capWindowStartMs);

  const capProgress = gameStarted
    ? Math.min(1, Math.max(0, (gameElapsedMs - capWindowStartMs) / capWindowMs))
    : 0;
  const capTimeLeftMs = gameStarted
    ? Math.max(0, capTargetMs - gameElapsedMs)
    : Math.max(0, capTargetMs);
  const capIsWarning = gameStarted && capTimeLeftMs < CAP_WARNING_THRESHOLD_MS;

  return {
    capLabel: pastSoftCap ? 'HARD CAP' : 'SOFT CAP',
    pastSoftCap,
    capTargetMs,
    capProgress,
    capTimeLeftMs,
    capIsWarning,
  };
}
