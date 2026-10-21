import type { ArmedPassModifier } from '@/lib/advancedTracking/types';

export { ArmedPassModifier, PassModifier } from '@/lib/advancedTracking/types';

/** Card and prompt accent; player chips draw `'neutral'` as success because tapping credits that player. */
export type PassModifierTone = 'danger' | 'success' | 'neutral';

/** Accent for an armed modifier: errors are danger, scores success, defensive credits neutral. */
export const PASS_MODIFIER_TONES: Record<ArmedPassModifier, PassModifierTone> = {
  'fifty-fifty': 'danger',
  drop: 'danger',
  goal: 'success',
  callahan: 'neutral',
  stall: 'neutral',
  block: 'neutral',
  pressure: 'neutral',
};
