import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { TimeOfPossessionStats } from '@/lib/teamStatsUtils';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
};

interface TimeOfPossessionSectionProps {
  topStats: TimeOfPossessionStats;
  team1Name: string;
  team2Name: string;
}

/**
 * Displays the Time of Possession subsection within the Team Performance card.
 * Returns null if no qualifying timed points exist.
 */
export default function TimeOfPossessionSection({
  topStats,
  team1Name,
  team2Name,
}: TimeOfPossessionSectionProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  if (!topStats.hasTopData) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header row: title + points count */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.textMuted }]}>TIME OF POSSESSION</Text>
        <Text style={[styles.pointsNote, { color: palette.textMuted }]}>
          {topStats.timedPointCount} pt{topStats.timedPointCount !== 1 ? 's' : ''} timed
        </Text>
      </View>

      {/* Possession bar */}
      <View style={styles.bar}>
        <View
          style={[
            styles.barTeam1,
            { flex: topStats.team1PossessionPct, backgroundColor: palette.accent },
          ]}
        />
        <View
          style={[
            styles.barTeam2,
            { flex: topStats.team2PossessionPct, backgroundColor: palette.overlay20 },
          ]}
        />
      </View>

      {/* Team labels with time and percentage */}
      <View style={styles.teamRow}>
        <View style={styles.teamLeft}>
          <Text style={[styles.teamName, { color: palette.accent }]} numberOfLines={1}>
            {team1Name}
          </Text>
          <Text style={[styles.teamDetail, { color: palette.accent }]}>
            {formatDuration(topStats.team1TotalPossessionMs)}
            {'  ·  '}
            {topStats.team1PossessionPct.toFixed(0)}%
          </Text>
        </View>

        <View style={styles.teamRight}>
          <Text
            style={[styles.teamName, { color: palette.textMuted }]}
            numberOfLines={1}
            textBreakStrategy="simple">
            {team2Name}
          </Text>
          <Text style={[styles.teamDetail, { color: palette.textMuted }]}>
            {topStats.team2PossessionPct.toFixed(0)}% ·{' '}
            {formatDuration(topStats.team2TotalPossessionMs)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  const sectionGap = scaleBySizeClass(8, sizeClass);
  const barHeight = scaleBySizeClass(10, sizeClass);
  const barRadius = scaleBySizeClass(5, sizeClass);
  const teamColumnPadding = scaleBySizeClass(8, sizeClass);
  const detailTopMargin = scaleBySizeClass(1, sizeClass);

  return StyleSheet.create({
    container: {
      marginTop: sectionGap,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: sectionGap,
    },
    title: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    pointsNote: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontWeight: '500',
    },
    bar: {
      flexDirection: 'row',
      height: barHeight,
      borderRadius: barRadius,
      overflow: 'hidden',
    },
    barTeam1: {
      borderTopLeftRadius: barRadius,
      borderBottomLeftRadius: barRadius,
    },
    barTeam2: {
      borderTopRightRadius: barRadius,
      borderBottomRightRadius: barRadius,
    },
    teamRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: sectionGap,
    },
    teamLeft: {
      flex: 1,
      alignItems: 'flex-start',
      paddingRight: teamColumnPadding,
    },
    teamRight: {
      flex: 1,
      alignItems: 'flex-end',
      paddingLeft: teamColumnPadding,
    },
    teamName: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '700',
    },
    teamDetail: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '500',
      marginTop: detailTopMargin,
    },
  });
}
