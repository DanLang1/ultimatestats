import { CAP_WARNING_THRESHOLD_MS } from '@/lib/constants';
import type { AdvancedTrackedGame } from './types';

export type CapLabel = 'SOFT CAP' | 'SOFT CAP ACTIVE' | 'HARD CAP';

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
  /** Elapsed game-clock minute at which soft cap fires. */
  softCapAtMinutes?: number;
  /** Elapsed game-clock minute at which hard cap fires. */
  hardCapAtMinutes?: number;
}

export interface CapTimingSettings {
  softCapAtMinutes: number;
  hardCapAtMinutes: number;
}

export function getCapThresholdMinutes(
  game: AdvancedTrackedGame,
  settings: CapTimingSettings,
): {
  softCapAtMinutes?: number;
  hardCapAtMinutes?: number;
} {
  const format = game.settings.format;
  const softCapEnabled = format?.softCapEnabled !== false;
  const hardCapEnabled = format?.hardCapEnabled !== false;

  return {
    softCapAtMinutes: softCapEnabled ? settings.softCapAtMinutes : undefined,
    hardCapAtMinutes: hardCapEnabled ? settings.hardCapAtMinutes : undefined,
  };
}

/**
 * Derives the progress-bar state for the soft/hard cap countdown.
 *
 * Counts down toward the soft cap first. Once crossed, switches to counting
 * down toward the hard cap — progress restarts within the soft→hard window.
 *
 * Pre-game (gameStarted=false): progress is 0, time-left equals the first
 * enabled cap threshold, and warning is never active.
 */
export function computeCapState(input: CapInput): CapState | null {
  const { gameElapsedMs, gameStarted, softCapAtMinutes, hardCapAtMinutes } = input;

  const softCapMs = softCapAtMinutes == null ? null : Math.max(0, softCapAtMinutes * 60 * 1000);
  const hardCapMs = hardCapAtMinutes == null ? null : Math.max(0, hardCapAtMinutes * 60 * 1000);

  if (softCapMs == null && hardCapMs == null) {
    return null;
  }

  const pastSoftCap = softCapMs != null && gameStarted && gameElapsedMs >= softCapMs;

  let capLabel: CapLabel;
  let capTargetMs: number;
  let capWindowStartMs: number;

  if (softCapMs == null) {
    capLabel = 'HARD CAP';
    capTargetMs = hardCapMs ?? 0;
    capWindowStartMs = 0;
  } else if (hardCapMs == null && pastSoftCap) {
    capLabel = 'SOFT CAP ACTIVE';
    capTargetMs = softCapMs;
    capWindowStartMs = 0;
  } else if (pastSoftCap) {
    capLabel = 'HARD CAP';
    capTargetMs = Math.max(softCapMs, hardCapMs ?? softCapMs);
    capWindowStartMs = softCapMs;
  } else {
    capLabel = 'SOFT CAP';
    capTargetMs = softCapMs;
    capWindowStartMs = 0;
  }

  const capWindowMs = Math.max(1, capTargetMs - capWindowStartMs);

  const capProgress = getCapProgress({
    capLabel,
    gameStarted,
    gameElapsedMs,
    capWindowStartMs,
    capWindowMs,
  });
  const capTimeLeftMs = gameStarted
    ? Math.max(0, capTargetMs - gameElapsedMs)
    : Math.max(0, capTargetMs);
  const capIsWarning =
    capLabel !== 'SOFT CAP ACTIVE' && gameStarted && capTimeLeftMs < CAP_WARNING_THRESHOLD_MS;

  return {
    capLabel,
    pastSoftCap,
    capTargetMs,
    capProgress,
    capTimeLeftMs,
    capIsWarning,
  };
}

function getCapProgress(input: {
  capLabel: CapLabel;
  gameStarted: boolean;
  gameElapsedMs: number;
  capWindowStartMs: number;
  capWindowMs: number;
}): number {
  if (input.capLabel === 'SOFT CAP ACTIVE') {
    return 1;
  }
  if (!input.gameStarted) {
    return 0;
  }
  return Math.min(
    1,
    Math.max(0, (input.gameElapsedMs - input.capWindowStartMs) / input.capWindowMs),
  );
}
