import {
  DEFAULT_HALFTIME_BREAK_SECONDS,
  MAX_HALFTIME_BREAK_SECONDS,
  MIN_HALFTIME_BREAK_SECONDS,
} from '@/lib/constants';

export interface HalftimeTimerState {
  halftimeTimerStartedAt: number | null;
  halftimeTimerDurationSeconds: number;
}

export function getDefaultHalftimeTimerState(): HalftimeTimerState {
  return {
    halftimeTimerStartedAt: null,
    halftimeTimerDurationSeconds: DEFAULT_HALFTIME_BREAK_SECONDS,
  };
}

export function getAdjustedHalftimeTimerDuration(
  timeLeftSeconds: number,
  deltaMinutes: number,
): number {
  return Math.max(
    MIN_HALFTIME_BREAK_SECONDS,
    Math.min(MAX_HALFTIME_BREAK_SECONDS, timeLeftSeconds + deltaMinutes * 60),
  );
}
