import { StyleSheet, View } from 'react-native';

import AdvancedSectionCard from '@/components/advancedTracking/AdvancedSectionCard';
import { ThemedText } from '@/components/ThemedText';
import StatsGrid, { type StatItem } from '@/components/view-stats/StatsGrid';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, type SizeClass, useLayout } from '@/hooks/useLayout';
import type { AdvancedThrowTypeStats } from '@/lib/advancedTracking/advancedThrowTypeStatsUtils';
import { pluralize } from '@/lib/utils';
import { Fonts } from '@/theme/theme';

interface AdvancedThrowTypesCardProps {
  throwTypes: AdvancedThrowTypeStats;
}

function buildTurnoverStats(entries: [string, string, number][]): StatItem[] {
  return entries
    .filter(([, , value]) => value > 0)
    .map(([singular, plural, value]) => ({ label: pluralize(value, singular, plural), value }));
}

function buildThrowTypeStats(throwTypes: AdvancedThrowTypeStats): {
  huckCompletionPct: number | null;
  huckTurnoverStats: StatItem[];
  resetTurnoverStats: StatItem[];
} {
  return {
    huckCompletionPct: throwTypes.huckAttempts > 0 ? throwTypes.huckCompletionPct : null,
    huckTurnoverStats: buildTurnoverStats([
      ['Throwaway', 'Throwaways', throwTypes.huckThrowaways],
      ['Drop', 'Drops', throwTypes.huckDrops],
      ['Blocked', 'Blocked', throwTypes.huckBlocks],
      ['Pressured', 'Pressured', throwTypes.huckPressures],
    ]),
    resetTurnoverStats: buildTurnoverStats([
      ['Throwaway', 'Throwaways', throwTypes.resetThrowaways],
      ['Drop', 'Drops', throwTypes.resetDrops],
      ['Blocked', 'Blocked', throwTypes.resetBlocks],
      ['Pressured', 'Pressured', throwTypes.resetPressures],
    ]),
  };
}

export default function AdvancedThrowTypesCard({ throwTypes }: AdvancedThrowTypesCardProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  if (throwTypes.huckAttempts + throwTypes.resetTurnovers === 0) return null;

  const { huckCompletionPct, huckTurnoverStats, resetTurnoverStats } =
    buildThrowTypeStats(throwTypes);

  return (
    <AdvancedSectionCard
      title="THROW TYPES"
      testID="advanced-throw-types-card"
      info={{
        accessibilityLabel: 'About throw classifications',
        title: 'Throw Classifications',
        message: 'Classifications are optional, so this data may not be fully accurate.',
      }}>
      {throwTypes.huckAttempts > 0 && (
        <View style={styles.subsectionFirst}>
          <ThemedText style={[styles.subsectionTitle, { color: palette.textMuted }]}>
            HUCKS
          </ThemedText>
          <StatsGrid
            stats={[
              {
                label: 'Completion',
                value: huckCompletionPct == null ? '-' : `${Math.round(huckCompletionPct * 100)}%`,
                sublabel: `${throwTypes.huckCompletions}/${throwTypes.huckAttempts}`,
              },
              { label: 'Attempts', value: throwTypes.huckAttempts },
              { label: 'Completions', value: throwTypes.huckCompletions },
              {
                label: pluralize(throwTypes.huckTurnovers, 'Turnover', 'Turnovers'),
                value: throwTypes.huckTurnovers,
              },
              ...huckTurnoverStats,
            ]}
            columns={isLandscape ? 4 : 2}
            variant="summary"
          />
        </View>
      )}
      {throwTypes.resetTurnovers > 0 && (
        <View style={styles.subsection}>
          <ThemedText style={[styles.subsectionTitle, { color: palette.textMuted }]}>
            BACKFIELD RESETS
          </ThemedText>
          <StatsGrid
            stats={[
              {
                label: pluralize(throwTypes.resetTurnovers, 'Turnover', 'Turnovers'),
                value: throwTypes.resetTurnovers,
              },
              ...resetTurnoverStats,
            ]}
            columns={isLandscape ? 4 : 2}
            variant="summary"
          />
        </View>
      )}
    </AdvancedSectionCard>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    subsection: {
      marginTop: 14,
      paddingTop: 14,
    },
    subsectionFirst: {
      marginTop: 0,
    },
    subsectionTitle: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
      marginBottom: 8,
    },
  });
}
