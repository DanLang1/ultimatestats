import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { PassModifier } from '@/lib/advancedTracking/types';
import { Fonts, Palette } from '@/theme/theme';

interface ModifierPromptProps {
  modifier: NonNullable<PassModifier>;
}

export const ModifierPrompt = ({ modifier }: ModifierPromptProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  let text = 'Tap other player at fault';
  if (modifier === 'goal') {
    text = 'Tap who scored';
  } else if (modifier === 'drop') {
    text = 'Tap who dropped it';
  } else if (modifier === 'callahan') {
    text = 'Tap player who got the Callahan';
  } else if (modifier === 'stall') {
    text = 'Tap player who got the stall';
  } else if (modifier === 'block') {
    text = 'Tap player who got the block';
  } else if (modifier === 'pressure') {
    text = 'Tap player who applied pressure';
  }

  const color = getModifierPromptColor(modifier, palette);

  return <ThemedText style={[styles.label, { color }]}>{text}</ThemedText>;
};

function getModifierPromptColor(modifier: NonNullable<PassModifier>, palette: Palette): string {
  if (modifier === 'fifty-fifty' || modifier === 'drop') return palette.danger;
  if (modifier === 'goal') return palette.success;
  return palette.textMuted;
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    label: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(12, sizeClass),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      flexShrink: 1,
    },
  });
}
