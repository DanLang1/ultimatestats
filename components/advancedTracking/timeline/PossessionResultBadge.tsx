import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout, type SizeClass } from '@/hooks/useLayout';
import type { AdvancedTimelinePossession } from '@/lib/advancedTracking/advancedTimelineUtils';
import { Fonts } from '@/theme/theme';

interface PossessionResultBadgeProps {
  possession: AdvancedTimelinePossession;
}

export default function PossessionResultBadge({ possession }: PossessionResultBadgeProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const { label, color, bg } = (() => {
    switch (possession.result) {
      case 'scored':
        return { label: 'Scored', color: palette.success, bg: palette.successOverlay10 };
      case 'turned_over':
        return {
          label: possession.turnoverType ?? 'Turnover',
          color: palette.danger,
          bg: palette.dangerOverlay10,
        };
      case 'in_progress':
        return { label: 'In Progress', color: palette.accent, bg: palette.accentOverlay10 };
      case 'terminated':
        return { label: 'Terminated', color: palette.textMuted, bg: palette.overlay08 };
    }

    throw new Error('Unsupported possession result');
  })();

  return (
    <View style={[styles.resultBadge, { backgroundColor: bg }]}>
      <ThemedText style={[styles.resultBadgeText, { color }]}>{label}</ThemedText>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    resultBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2.5,
      borderRadius: 4,
    },
    resultBadgeText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
  });
}
