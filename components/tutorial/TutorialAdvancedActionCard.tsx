import { LastActionCardFrame } from '@/components/advancedTracking/bottomCard/LastActionCardFrame';
import { ThemedText } from '@/components/ThemedText';
import TutorialAnimatedArrow from '@/components/tutorial/TutorialAnimatedArrow';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

import type { TutorialAdvancedResult } from './useTutorialAdvancedGameState';

interface TutorialAdvancedActionCardProps {
  result: TutorialAdvancedResult | null;
  holderName: string | null;
  oppHasDisc: boolean;
  pressureArmed: boolean;
  isPressureStep: boolean;
  onOpenPressureMenu: () => void;
}

const RESULT_LABELS: Record<TutorialAdvancedResult, string> = {
  drop: 'Jules · Drop',
  throwaway: 'Mark · Throwaway',
  block: 'Rachel · Block',
  pressure: 'Harper · Pressure',
  goal: 'Mark + Kelly · Goal',
};

function getAccentColor(
  result: TutorialAdvancedResult | null,
  colors: { success: string; danger: string; neutral: string },
) {
  if (result === 'goal' || result === 'block' || result === 'pressure') return colors.success;
  if (result) return colors.danger;
  return colors.neutral;
}

function getCardText({
  result,
  holderName,
  oppHasDisc,
}: Pick<TutorialAdvancedActionCardProps, 'result' | 'holderName' | 'oppHasDisc'>) {
  if (result) return RESULT_LABELS[result];
  if (holderName) return `${holderName} has the disc`;
  if (oppHasDisc) return 'Opponent has the disc';
  return 'Point in progress';
}

export default function TutorialAdvancedActionCard({
  result,
  holderName,
  oppHasDisc,
  pressureArmed,
  isPressureStep,
  onOpenPressureMenu,
}: TutorialAdvancedActionCardProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const accentColor = getAccentColor(result, palette);
  const cardText = getCardText({ result, holderName, oppHasDisc });
  const showPressureActions = isPressureStep && !pressureArmed;

  return (
    <LastActionCardFrame
      accentColor={accentColor}
      buttonMode={
        showPressureActions ? { kind: 'more-only', onMore: onOpenPressureMenu } : { kind: 'none' }
      }
      moreAdornment={
        showPressureActions ? (
          <TutorialAnimatedArrow
            direction="right"
            color={palette.accent}
            size={scaleBySizeClass(24, sizeClass)}
            style={{
              position: 'absolute',
              right: '100%',
              top: scaleBySizeClass(10, sizeClass),
              marginRight: scaleBySizeClass(8, sizeClass),
            }}
          />
        ) : null
      }>
      <ThemedText
        style={{
          color: result ? accentColor : palette.textMuted,
          fontFamily: result ? Fonts.black : Fonts.bold,
          fontSize: scaleBySizeClass(result ? 14 : 13, sizeClass),
          textTransform: result ? 'uppercase' : 'none',
        }}>
        {cardText}
      </ThemedText>
    </LastActionCardFrame>
  );
}
