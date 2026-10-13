import {
  ButtonMode,
  LastActionCardFrame,
} from '@/components/advancedTracking/bottomCard/LastActionCardFrame';
import { ModifierPrompt } from '@/components/advancedTracking/bottomCard/ModifierPrompt';
import { ThemedText } from '@/components/ThemedText';
import TutorialAnimatedArrow from '@/components/tutorial/TutorialAnimatedArrow';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

import type {
  TutorialAdvancedResult,
  TutorialAdvancedResultKind,
  TutorialArmedModifier,
} from './useTutorialAdvancedGameState';

interface TutorialAdvancedActionCardProps {
  result: TutorialAdvancedResult | null;
  holderName: string | null;
  oppHasDisc: boolean;
  armedModifier: TutorialArmedModifier | null;
  showMore: boolean;
  showMoreCue: boolean;
  onOpenMoreMenu: () => void;
  onCancelModifier: () => void;
}

function getAccentColor(
  result: TutorialAdvancedResultKind | null,
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
  if (result) return result.label;
  if (holderName) return `${holderName} has the disc`;
  if (oppHasDisc) return 'Opponent has the disc';
  return 'Point in progress';
}

export default function TutorialAdvancedActionCard({
  result,
  holderName,
  oppHasDisc,
  armedModifier,
  showMore,
  showMoreCue,
  onOpenMoreMenu,
  onCancelModifier,
}: TutorialAdvancedActionCardProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const accentColor = getAccentColor(result?.kind ?? null, palette);
  const cardText = getCardText({ result, holderName, oppHasDisc });

  let buttonMode: ButtonMode = { kind: 'none' };
  if (armedModifier != null) {
    buttonMode = { kind: 'cancel-only', onCancel: onCancelModifier };
  } else if (showMore) {
    buttonMode = { kind: 'more-only', onMore: onOpenMoreMenu };
  }

  return (
    <LastActionCardFrame
      accentColor={accentColor}
      buttonMode={buttonMode}
      moreAdornment={
        showMoreCue ? (
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
      {armedModifier != null ? (
        <ModifierPrompt modifier={armedModifier} />
      ) : (
        <ThemedText
          style={{
            color: result ? accentColor : palette.textMuted,
            fontFamily: result ? Fonts.black : Fonts.bold,
            fontSize: scaleBySizeClass(result ? 14 : 13, sizeClass),
            textTransform: result ? 'uppercase' : 'none',
          }}>
          {cardText}
        </ThemedText>
      )}
    </LastActionCardFrame>
  );
}
