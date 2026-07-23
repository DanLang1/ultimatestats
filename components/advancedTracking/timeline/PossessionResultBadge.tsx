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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function PossessionResultBadge({ possession }: PossessionResultBadgeProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const { label, color } = (() => {
    switch (possession.result) {
      case 'scored':
        return { label: 'Scored', color: palette.success };
      case 'turned_over':
        return {
          label: possession.turnoverType ? capitalize(possession.turnoverType) : 'Turnover',
          color: palette.danger,
        };
      case 'in_progress':
        return { label: 'In Progress', color: palette.accent };
      case 'terminated':
        return { label: 'Terminated', color: palette.textMuted };
    }

    throw new Error('Unsupported possession result');
  })();

  return (
    <View style={[styles.resultBadge, { backgroundColor: palette.overlay08 }]}>
      <ThemedText style={[styles.resultBadgeText, { color }]}>{label}</ThemedText>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    resultBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    resultBadgeText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.3,
    },
  });
}
