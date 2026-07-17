import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface PlayingTimePillProps {
  label: string;
  value: string | number;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  align?: 'center' | 'left';
  compact?: boolean;
}

export default function PlayingTimePill({
  label,
  value,
  color,
  backgroundColor,
  borderColor,
  align = 'center',
  compact = false,
}: PlayingTimePillProps) {
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  return (
    <View
      style={[
        styles.statPill,
        compact && styles.statPillCompact,
        align === 'left' && styles.statPillLeft,
        {
          backgroundColor: backgroundColor ?? palette.overlay05,
          borderColor: borderColor ?? palette.overlay10,
        },
      ]}>
      <ThemedText style={[styles.statValue, { color: color ?? palette.textInverse }]}>
        {value}
      </ThemedText>
      <ThemedText style={[styles.statLabel, { color: palette.textMuted }]}>{label}</ThemedText>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    statPill: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 55,
    },
    statPillCompact: {
      minWidth: scaleBySizeClass(78, sizeClass),
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    statPillLeft: {
      alignItems: 'flex-start',
    },
    statValue: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
    },
    statLabel: {
      fontSize: scaleBySizeClass(8, sizeClass),
      fontFamily: Fonts.semiBold,
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
  });
}
