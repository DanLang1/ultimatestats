import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import StatsGrid, { type StatItem } from '@/components/view-stats/StatsGrid';
import StatsSectionCard from '@/components/view-stats/StatsSectionCard';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, type SizeClass, useLayout } from '@/hooks/useLayout';
import type { AdvancedTeamStats } from '@/lib/advancedTracking/advancedTeamStatsUtils';
import { formatNullablePercent, pluralize } from '@/lib/utils';
import { Fonts } from '@/theme/theme';

interface AdvancedRedZoneCardProps {
  teamStats: AdvancedTeamStats;
}

function buildRedZoneStats(teamStats: AdvancedTeamStats): StatItem[] {
  const scoreDurationMs = teamStats.averageRedZoneTimeToScoreMs;
  const turnoverDurationMs = teamStats.averageRedZoneTimeToTurnoverMs;
  const turns = teamStats.resolvedRedZonePossessions - teamStats.scoredRedZonePossessions;
  return [
    {
      label: 'Conversion',
      value: formatNullablePercent(teamStats.redZoneConversionPct),
      sublabel: `${teamStats.scoredRedZonePossessions}/${teamStats.resolvedRedZonePossessions}`,
    },
    {
      label: pluralize(turns, 'Red Zone Turn', 'Red Zone Turns'),
      value: turns,
    },
    {
      label: 'Avg Time to Score',
      value: scoreDurationMs == null ? '—' : `${Math.round(scoreDurationMs / 1000)}s`,
    },
    {
      label: 'Avg Time to Turn',
      value: turnoverDurationMs == null ? '—' : `${Math.round(turnoverDurationMs / 1000)}s`,
    },
  ];
}

function buildRedZoneDefenseStats(teamStats: AdvancedTeamStats): StatItem[] {
  const opponentGoalDurationMs = teamStats.averageRedZoneTimeToOpponentGoalMs;
  const opponentTurnoverDurationMs = teamStats.averageRedZoneTimeToOpponentTurnoverMs;
  return [
    {
      label: 'Stop Rate',
      value: formatNullablePercent(teamStats.redZoneStopPct),
      sublabel: `${teamStats.redZoneStops}/${teamStats.resolvedOpponentRedZonePossessions}`,
    },
    {
      label: pluralize(teamStats.redZoneStops, 'Red Zone Stop', 'Red Zone Stops'),
      value: teamStats.redZoneStops,
    },
    {
      label: 'Avg Time to Opp Goal',
      value: opponentGoalDurationMs == null ? '—' : `${Math.round(opponentGoalDurationMs / 1000)}s`,
    },
    {
      label: 'Avg Time to Opp Turn',
      value:
        opponentTurnoverDurationMs == null
          ? '—'
          : `${Math.round(opponentTurnoverDurationMs / 1000)}s`,
    },
  ];
}

export default function AdvancedRedZoneCard({ teamStats }: AdvancedRedZoneCardProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const hasRedZoneEntries = teamStats.redZoneEntries > 0;
  const hasOpponentRedZoneEntries = teamStats.opponentRedZoneEntries > 0;
  if (!hasRedZoneEntries && !hasOpponentRedZoneEntries) return null;

  return (
    <StatsSectionCard title="RED ZONE" testID="advanced-red-zone-summary-card">
      {hasRedZoneEntries && (
        <View testID="advanced-red-zone-card" style={styles.subsectionFirst}>
          <ThemedText style={[styles.subsectionTitle, { color: palette.textMuted }]}>
            OFFENSE
          </ThemedText>
          <StatsGrid
            stats={buildRedZoneStats(teamStats)}
            columns={isLandscape ? 4 : 2}
            variant="summary"
          />
        </View>
      )}

      {hasOpponentRedZoneEntries && (
        <View
          testID="advanced-red-zone-defense-card"
          style={hasRedZoneEntries ? styles.subsection : styles.subsectionFirst}>
          <ThemedText style={[styles.subsectionTitle, { color: palette.textMuted }]}>
            DEFENSE
          </ThemedText>
          <StatsGrid
            stats={buildRedZoneDefenseStats(teamStats)}
            columns={isLandscape ? 4 : 2}
            variant="summary"
          />
        </View>
      )}
    </StatsSectionCard>
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
