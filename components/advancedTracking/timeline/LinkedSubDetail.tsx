import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { AdvancedTimelineSub } from '@/lib/advancedTracking/advancedTimelineUtils';
import { hasItems } from '@/lib/utils';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface LinkedSubDetailProps {
  subs: AdvancedTimelineSub[];
  stoppageActionId: string;
}

export default function LinkedSubDetail({ subs, stoppageActionId }: LinkedSubDetailProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const sub = subs.find((s) => s.stoppageActionId === stoppageActionId);
  if (!sub) return null;

  return (
    <View style={styles.subDetail}>
      {hasItems(sub.inNames) && (
        <ThemedText style={[styles.subText, { color: palette.textSecondary }]}>
          In: {sub.inNames.join(', ')}
        </ThemedText>
      )}
      {hasItems(sub.outNames) && (
        <ThemedText style={[styles.subText, { color: palette.danger }]}>
          Out: {sub.outNames.join(', ')}
        </ThemedText>
      )}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    subDetail: {
      paddingLeft: 10,
      gap: 2,
    },
    subText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
