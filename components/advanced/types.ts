export type TurnoverSheetState =
  | null
  | { stage: 'type' }
  | { stage: 'receiver'; resultType: 'drop' | 'fifty-fifty' };

export type TurnoverType = 'throwaway' | 'drop' | 'block' | 'interception' | 'fifty-fifty';
