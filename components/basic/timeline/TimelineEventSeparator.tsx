import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatSplitDuration } from '@/lib/basic/timelineUtils';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';

interface TimelineEventSeparatorProps {
  splitMs?: number;
  timingEnabled: boolean;
  showSplitSeparators: boolean;
}

export default function TimelineEventSeparator({
  splitMs,
  timingEnabled,
  showSplitSeparators,
}: TimelineEventSeparatorProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  if (timingEnabled && showSplitSeparators && splitMs !== undefined && splitMs >= 0) {
    return (
      <View style={styles.separatorWithSplit}>
        <ThemedText style={[styles.split, { color: palette.textMuted }]}>
          {formatSplitDuration(splitMs)}
        </ThemedText>
        <MaterialCommunityIcons
          name="arrow-right"
          size={scaleBySizeClass(14, sizeClass)}
          color={palette.textMuted}
          style={styles.separatorIcon}
        />
      </View>
    );
  }

  return (
    <View style={styles.separatorArrowOnly}>
      <MaterialCommunityIcons
        name="arrow-right"
        size={scaleBySizeClass(14, sizeClass)}
        color={palette.textMuted}
        style={styles.separatorIcon}
      />
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    split: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
      opacity: 0.78,
    },
    separatorWithSplit: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      minHeight: scaleBySizeClass(24, sizeClass),
      alignSelf: 'center',
    },
    separatorArrowOnly: {
      minHeight: scaleBySizeClass(24, sizeClass),
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
    },
    separatorIcon: {
      opacity: 0.75,
    },
  });
}
