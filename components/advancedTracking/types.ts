import { PassModifier } from '@/lib/advancedTracking/types';

export type TurnoverSheetState =
  | null
  | { stage: 'type' }
  | { stage: 'receiver'; resultType: 'fifty-fifty' };

export type TurnoverType = 'throwaway' | 'drop' | 'block' | 'fifty-fifty';

export { PassModifier };
