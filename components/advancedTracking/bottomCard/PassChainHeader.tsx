import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { PassChainEvent } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface PassChainHeaderProps {
  events: PassChainEvent[];
}

export const PassChainHeader = ({ events }: PassChainHeaderProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const lastTwo = events.slice(-2);

  if (lastTwo.length === 2) {
    return (
      <View style={styles.row}>
        <ThemedText numberOfLines={1} style={[styles.label, { color: palette.textMuted }]}>
          {lastTwo[0].name}
        </ThemedText>
        <ThemedText style={[styles.sep, { color: palette.textMuted }]}>→</ThemedText>
        <ThemedText numberOfLines={1} style={[styles.bold, { color: palette.inputText }]}>
          {lastTwo[1].name}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <ThemedText numberOfLines={1} style={[styles.bold, { color: palette.inputText }]}>
        {lastTwo[0].name}
      </ThemedText>
      <ThemedText style={[styles.sep, { color: palette.textMuted }]}>·</ThemedText>
      <ThemedText style={[styles.label, { color: palette.textMuted }]}>HAS DISC</ThemedText>
    </View>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 1,
    },
    bold: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(13, sizeClass),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      flexShrink: 1,
    },
    label: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(12, sizeClass),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      flexShrink: 1,
    },
    sep: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(12, sizeClass),
    },
  });
}
