import {
  DEFAULT_HALFTIME_BREAK_SECONDS,
  MAX_HALFTIME_BREAK_SECONDS,
  MIN_HALFTIME_BREAK_SECONDS,
} from '@/lib/constants';
import {
  getAdjustedHalftimeTimerDuration,
  getDefaultHalftimeTimerState,
} from '../halftimeTimerUtils';

describe('halftimeTimerUtils', () => {
  it('returns the default halftime timer state', () => {
    expect(getDefaultHalftimeTimerState()).toEqual({
      halftimeTimerStartedAt: null,
      halftimeTimerDurationSeconds: DEFAULT_HALFTIME_BREAK_SECONDS,
    });
  });

  it('clamps adjusted halftime timer duration', () => {
    expect(getAdjustedHalftimeTimerDuration(30, -1)).toBe(MIN_HALFTIME_BREAK_SECONDS);
    expect(getAdjustedHalftimeTimerDuration(60, 1)).toBe(120);
    expect(getAdjustedHalftimeTimerDuration(MAX_HALFTIME_BREAK_SECONDS, 1)).toBe(
      MAX_HALFTIME_BREAK_SECONDS,
    );
  });
});
