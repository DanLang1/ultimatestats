import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { TimeOfPossessionStats } from '@/lib/basic/teamStatsUtils';
import { ensureContrast } from '@/lib/colorUtils';
import { Fonts } from '@/theme/theme';

const formatPossessionDuration = (ms: number): string => {
  if (ms < 10_000 && ms % 1000 !== 0) {
    return `${(ms / 1000).toFixed(1)}s`;
  }

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
  team1Color?: string;
  team2Color?: string;
}

/**
 * Displays the Time of Possession subsection within the Team Performance card.
 * Returns null if no qualifying timed points exist.
 */
export default function TimeOfPossessionSection({
  topStats,
  team1Name,
  team2Name,
  team1Color,
  team2Color,
}: TimeOfPossessionSectionProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  // palette.primary approximates the card background well enough for contrast checks
  const cardBg = palette.primary;
  // Bar: 3:1 contrast (WCAG minimum for UI elements)
  const t1BarColor = team1Color ? ensureContrast(team1Color, cardBg, 3) : palette.accent;
  const t2BarColor = team2Color ? ensureContrast(team2Color, cardBg, 3) : palette.overlay20;
  // Text: 4.5:1 contrast (WCAG AA for normal text)
  const t1TextColor = team1Color ? ensureContrast(team1Color, cardBg, 4.5) : palette.accent;
  const t2TextColor = team2Color ? ensureContrast(team2Color, cardBg, 4.5) : palette.textMuted;

  if (!topStats.hasTopData) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header row: title · points count */}
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: palette.textMuted }]}>
          TIME OF POSSESSION
          <ThemedText style={styles.pointsNote}>
            {' · '}
            {topStats.timedPointCount} pt{topStats.timedPointCount !== 1 ? 's' : ''} timed
          </ThemedText>
        </ThemedText>
      </View>

      {/* Possession bar */}
      <View style={styles.bar}>
        <View
          style={[
            styles.barTeam1,
            { flex: topStats.team1PossessionPct, backgroundColor: t1BarColor },
          ]}
        />
        <View
          style={[
            styles.barTeam2,
            { flex: topStats.team2PossessionPct, backgroundColor: t2BarColor },
          ]}
        />
      </View>

      {/* Team labels with time and percentage */}
      <View style={styles.teamRow}>
        <View style={styles.teamLeft}>
          <ThemedText style={[styles.teamName, { color: t1TextColor }]} numberOfLines={1}>
            {team1Name}
          </ThemedText>
          <ThemedText style={[styles.teamDetail, { color: t1TextColor }]}>
            {formatPossessionDuration(topStats.team1TotalPossessionMs)}
            {'  ·  '}
            {topStats.team1PossessionPct.toFixed(0)}%
          </ThemedText>
        </View>

        <View style={styles.teamRight}>
          <ThemedText
            style={[styles.teamName, { color: t2TextColor }]}
            numberOfLines={1}
            textBreakStrategy="simple">
            {team2Name}
          </ThemedText>
          <ThemedText style={[styles.teamDetail, { color: t2TextColor }]}>
            {topStats.team2PossessionPct.toFixed(0)}% ·{' '}
            {formatPossessionDuration(topStats.team2TotalPossessionMs)}
          </ThemedText>
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
      marginBottom: sectionGap,
    },
    title: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
    },
    pointsNote: {
      fontSize: scaleBySizeClass(9, sizeClass),
      letterSpacing: 0,
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
      fontFamily: Fonts.bold,
    },
    teamDetail: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
      marginTop: detailTopMargin,
    },
  });
}
