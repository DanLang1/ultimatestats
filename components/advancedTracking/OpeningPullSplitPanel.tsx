import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { AdvancedInitialPullWinBucket } from '@/lib/advancedTracking/advancedAggregateStatsUtils';
import { Fonts } from '@/theme/theme';

interface OpeningPullSplitPanelProps {
  bucket: AdvancedInitialPullWinBucket;
  label: string;
  accentColor: string;
}

export default function OpeningPullSplitPanel({
  bucket,
  label,
  accentColor,
}: OpeningPullSplitPanelProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const hasGames = bucket.games > 0;
  const winPctString =
    hasGames && bucket.winPercentage !== null ? `${Math.round(bucket.winPercentage * 100)}%` : '—';

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
      ]}>
      <View style={styles.panelHeader}>
        <ThemedText style={[styles.panelLabel, { color: palette.textInverse }]}>{label}</ThemedText>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statGroup}>
          <ThemedText
            style={[styles.winPctText, { color: hasGames ? accentColor : palette.textMuted }]}>
            {winPctString}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.textMuted }]}>WIN RATE</ThemedText>
        </View>

        <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />

        <View style={styles.statGroup}>
          <ThemedText style={[styles.recordText, { color: palette.textInverse }]}>
            {hasGames ? `${bucket.wins}-${bucket.losses}` : '0-0'}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.textMuted }]}>RECORD</ThemedText>
        </View>

        <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />

        <View style={styles.statGroup}>
          <ThemedText style={[styles.gamesText, { color: palette.textInverse }]}>
            {bucket.games}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.textMuted }]}>GAMES</ThemedText>
        </View>
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    panel: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      padding: 16,
    },
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    labelBlock: {
      flex: 1,
    },
    panelLabel: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    statGroup: {
      flex: 1,
      alignItems: 'center',
    },
    winPctText: {
      fontSize: scaleBySizeClass(22, sizeClass),
      fontFamily: Fonts.extraBold,
      lineHeight: scaleBySizeClass(26, sizeClass),
    },
    recordText: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
      lineHeight: scaleBySizeClass(22, sizeClass),
    },
    gamesText: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
      lineHeight: scaleBySizeClass(22, sizeClass),
    },
    statLabel: {
      fontSize: scaleBySizeClass(8, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 4,
      textAlign: 'center',
    },
    divider: {
      width: 1,
      height: 28,
    },
  });
}
