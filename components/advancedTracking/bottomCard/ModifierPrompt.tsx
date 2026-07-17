import React from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { PassModifier } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';

interface ModifierPromptProps {
  modifier: NonNullable<PassModifier>;
}

export const ModifierPrompt = ({ modifier }: ModifierPromptProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  let text = 'Tap other player at fault';
  if (modifier === 'callahan') {
    text = 'Tap player who got the Callahan';
  } else if (modifier === 'stall') {
    text = 'Tap player who got the stall';
  } else if (modifier === 'pressure') {
    text = 'Tap player who applied pressure';
  }

  const isFiftyFifty = modifier === 'fifty-fifty';
  const color = isFiftyFifty ? palette.danger : palette.textMuted;

  return <ThemedText style={[styles.label, { color }]}>{text}</ThemedText>;
};

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
