import { MAX_HALFTIME_BREAK_SECONDS, MIN_HALFTIME_BREAK_SECONDS } from '@/lib/constants';

import { getAdjustedHalftimeTimerDuration } from '../halftimeTimerUtils';

describe('halftimeTimerUtils', () => {
  it('clamps adjusted halftime timer duration', () => {
    expect(getAdjustedHalftimeTimerDuration(30, -1)).toBe(MIN_HALFTIME_BREAK_SECONDS);
    expect(getAdjustedHalftimeTimerDuration(60, 1)).toBe(120);
    expect(getAdjustedHalftimeTimerDuration(MAX_HALFTIME_BREAK_SECONDS, 1)).toBe(
      MAX_HALFTIME_BREAK_SECONDS,
    );
  });
});
