import { LastActionCardFrame } from '@/components/advancedTracking/bottomCard/LastActionCardFrame';
import { ThemedText } from '@/components/ThemedText';
import TutorialAnimatedArrow from '@/components/tutorial/TutorialAnimatedArrow';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';
import type { TutorialAdvancedResult, TutorialAdvancedStep } from './useTutorialAdvancedGameState';

interface TutorialAdvancedActionCardProps {
  step: TutorialAdvancedStep;
  result: TutorialAdvancedResult | null;
  awaitingConfirmation: boolean;
  holderName: string | null;
  oppHasDisc: boolean;
  onMore: () => void;
}

const RESULT_LABELS: Record<TutorialAdvancedResult, string> = {
  drop: 'Carl · Drop',
  stall: 'Carl · Stall',
  throwaway: 'Carl · Throwaway',
  block: 'Blair · Block',
  goal: 'Blair + Carl · Goal',
};

function getButtonMode({ step, onMore }: Pick<TutorialAdvancedActionCardProps, 'step' | 'onMore'>) {
  if (step === 'open-rare') return { kind: 'more-only' as const, onMore };
  return { kind: 'none' as const };
}

function getAccentColor(
  result: TutorialAdvancedResult | null,
  colors: { success: string; danger: string; neutral: string },
) {
  if (result === 'goal' || result === 'block' || result === 'stall') return colors.success;
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

export default function TutorialAdvancedActionCard(props: TutorialAdvancedActionCardProps) {
  const { step, result, holderName, oppHasDisc } = props;
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const buttonMode = getButtonMode(props);
  const accentColor = getAccentColor(result, palette);
  const cardText = getCardText({ result, holderName, oppHasDisc });

  return (
    <LastActionCardFrame
      accentColor={accentColor}
      buttonMode={buttonMode}
      moreAdornment={
        step === 'open-rare' && !props.awaitingConfirmation ? (
          <TutorialAnimatedArrow
            direction="right"
            color={palette.accent}
            size={scaleBySizeClass(22, sizeClass)}
            style={{
              position: 'absolute',
              right: '100%',
              top: scaleBySizeClass(10, sizeClass),
              marginRight: scaleBySizeClass(8, sizeClass),
            }}
          />
        ) : undefined
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
