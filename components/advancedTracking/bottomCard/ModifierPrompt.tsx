import { StyleSheet } from 'react-native';

import { PASS_MODIFIER_TONES } from '@/components/advancedTracking/types';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { ArmedPassModifier } from '@/lib/advancedTracking/types';
import { Fonts, Palette } from '@/theme/theme';

interface ModifierPromptProps {
  modifier: ArmedPassModifier;
}

const PROMPTS: Record<ArmedPassModifier, string> = {
  'fifty-fifty': 'Tap other player at fault',
  goal: 'Tap who scored',
  drop: 'Tap who dropped it',
  callahan: 'Tap player who got the Callahan',
  stall: 'Tap player who got the stall',
  block: 'Tap player who got the block',
  pressure: 'Tap player who applied pressure',
};

export const ModifierPrompt = ({ modifier }: ModifierPromptProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const color = getModifierPromptColor(modifier, palette);

  return <ThemedText style={[styles.label, { color }]}>{PROMPTS[modifier]}</ThemedText>;
};

function getModifierPromptColor(modifier: ArmedPassModifier, palette: Palette): string {
  const tone = PASS_MODIFIER_TONES[modifier];
  return tone === 'neutral' ? palette.textMuted : palette[tone];
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
