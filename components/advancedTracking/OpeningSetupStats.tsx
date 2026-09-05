import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import StatsGrid, { type StatItem } from '@/components/view-stats/StatsGrid';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, type SizeClass, useLayout } from '@/hooks/useLayout';
import type {
  AdvancedFlipStats,
  AdvancedInitialPullWinStats,
} from '@/lib/advancedTracking/advancedAggregateStatsUtils';
import { Fonts, type Palette } from '@/theme/theme';

interface OpeningSetupStatsProps {
  flipStats?: AdvancedFlipStats;
  initialPullWinStats?: AdvancedInitialPullWinStats;
}

function formatWinRate(winPercentage: number | null): string {
  if (winPercentage === null) return '—';
  return `${Math.round(winPercentage * 100)}%`;
}

function formatRecord(wins: number, losses: number): string {
  return `${wins}-${losses} record`;
}

export default function OpeningSetupStats({
  flipStats,
  initialPullWinStats,
}: OpeningSetupStatsProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(palette, sizeClass);
  const choices = flipStats
    ? Object.entries(flipStats.byChoice).filter(([, bucket]) => bucket.games > 0)
    : [];

  const startingStats: StatItem[] = [];
  const receivingFirst = initialPullWinStats?.receivingFirst;
  const pullingFirst = initialPullWinStats?.pullingFirst;

  if (receivingFirst && receivingFirst.games > 0) {
    startingStats.push({
      label: 'Started on Offense',
      value: formatWinRate(receivingFirst.winPercentage),
      sublabel: formatRecord(receivingFirst.wins, receivingFirst.losses),
    });
  }

  if (pullingFirst && pullingFirst.games > 0) {
    startingStats.push({
      label: 'Started on Defense',
      value: formatWinRate(pullingFirst.winPercentage),
      sublabel: formatRecord(pullingFirst.wins, pullingFirst.losses),
    });
  }

  if (!flipStats && startingStats.length === 0) return null;

  return (
    <View testID="advanced-opening-results-card" style={styles.card}>
      {flipStats && (
        <View style={styles.flipHeader}>
          <View style={styles.flipLabel}>
            <ThemedText style={styles.title}>Flips Won</ThemedText>
            <ThemedText style={styles.detail}>
              {`${flipStats.wins} of ${flipStats.recorded} recorded`}
            </ThemedText>
          </View>
          <ThemedText style={styles.flipValue}>{formatWinRate(flipStats.winPercentage)}</ThemedText>
        </View>
      )}

      {startingStats.length > 0 && (
        <View style={styles.startingResults}>
          <ThemedText style={styles.caption}>Game win rate by start</ThemedText>
          <StatsGrid stats={startingStats} columns={startingStats.length} variant="summary" />
        </View>
      )}
      {choices.length > 0 && (
        <Pressable
          testID="advanced-opening-details-toggle"
          accessibilityRole="button"
          accessibilityLabel="Flip details"
          accessibilityState={{ expanded: detailsExpanded }}
          onPress={() => setDetailsExpanded((expanded) => !expanded)}
          style={({ pressed }) => [styles.detailsToggle, pressed && styles.detailsPressed]}>
          <ThemedText style={styles.detailsLabel}>
            {detailsExpanded ? 'Hide details' : 'Details'}
          </ThemedText>
          <MaterialCommunityIcons
            name={detailsExpanded ? 'chevron-up' : 'chevron-down'}
            size={scaleBySizeClass(22, sizeClass)}
            color={palette.accent}
          />
        </Pressable>
      )}
      {detailsExpanded && (
        <View style={styles.choices}>
          <ThemedText style={styles.caption}>After winning the flip</ThemedText>
          {choices.map(([choice, bucket]) => {
            const record = `${bucket.wins}W · ${bucket.losses}L`;
            const tieLabel =
              bucket.ties > 0 ? ` · ${bucket.ties} ${bucket.ties === 1 ? 'tie' : 'ties'}` : '';
            const winRate =
              bucket.winPercentage === null ? '—' : `${formatWinRate(bucket.winPercentage)} wins`;
            return (
              <View key={choice} style={styles.choiceRow}>
                <View style={styles.choiceLabel}>
                  <ThemedText style={styles.choiceTitle}>{`We chose ${choice}`}</ThemedText>
                  <ThemedText style={styles.detail}>{record + tieLabel}</ThemedText>
                </View>
                <ThemedText style={styles.choiceRate}>{winRate}</ThemedText>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function createStyles(palette: Palette, sizeClass: SizeClass) {
  return StyleSheet.create({
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.overlay10,
      backgroundColor: palette.statsCardBg,
      padding: 20,
      marginBottom: 16,
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 2,
    },
    flipHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: palette.statsHeaderBg,
      marginHorizontal: -20,
      marginTop: -20,
      padding: 20,
      borderTopLeftRadius: 15,
      borderTopRightRadius: 15,
    },
    flipLabel: { flex: 1 },
    title: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(18, sizeClass),
      color: palette.textInverse,
    },
    flipValue: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(28, sizeClass),
      color: palette.textInverse,
      fontVariant: ['tabular-nums'],
    },
    detail: { fontSize: scaleBySizeClass(13, sizeClass), color: palette.textMuted },
    caption: {
      fontFamily: Fonts.semiBold,
      fontSize: scaleBySizeClass(14, sizeClass),
      color: palette.textMuted,
      marginBottom: 8,
    },
    detailsToggle: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    detailsPressed: { opacity: 0.6 },
    detailsLabel: {
      fontFamily: Fonts.semiBold,
      fontSize: scaleBySizeClass(14, sizeClass),
      color: palette.accent,
    },
    choices: {
      marginTop: 16,
      paddingTop: 14,
    },
    choiceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    choiceLabel: { flex: 1 },
    choiceTitle: {
      fontFamily: Fonts.semiBold,
      fontSize: scaleBySizeClass(14, sizeClass),
      color: palette.textInverse,
    },
    choiceRate: {
      fontFamily: Fonts.semiBold,
      fontSize: scaleBySizeClass(14, sizeClass),
      color: palette.textInverse,
    },
    startingResults: {
      marginTop: 16,
      paddingTop: 14,
    },
  });
}
