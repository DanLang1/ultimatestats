import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  computePerPointStats,
  computePlayingTimeStats,
  computeRates,
  formatMinutesPlayed,
} from '@/lib/playingTimeStatsUtils';
import { GameEvent, PointLineRecord } from '@/lib/storage';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PlayingTimeSectionProps {
  playerId: string; // Player ID for stats lookup
  events: GameEvent[];
  pointLines?: PointLineRecord[] | null;
  startingPossession?: 'team1' | 'team2' | null;
  gameTo?: number;
  // Basic stats for per-point calculations
  goals?: number;
  assists?: number;
  blocks?: number;
  turnovers?: number;
  throwaways?: number;
  drops?: number;
}

export default function PlayingTimeSection({
  playerId,
  events,
  pointLines,
  startingPossession,
  gameTo = 15,
  goals = 0,
  assists = 0,
  blocks = 0,
  turnovers = 0,
  throwaways = 0,
  drops = 0,
}: PlayingTimeSectionProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  // Don't render if no pointLines data
  if (!pointLines?.length) {
    return null;
  }

  // Compute stats
  const playingTimeStats = computePlayingTimeStats(
    pointLines,
    events,
    startingPossession ?? null,
    gameTo,
  );

  // Lookup by player ID since computePlayingTimeStats now keys by ID
  const stats = playingTimeStats.get(playerId);
  if (!stats) {
    return null;
  }

  const rates = computeRates(stats);

  // Per-point stats
  const {
    goalsPerPoint,
    assistsPerPoint,
    blocksPerPoint,
    turnoversPerPoint,
    throwawaysPerPoint,
    dropsPerPoint,
  } = computePerPointStats(
    stats.pointsPlayed,
    goals,
    assists,
    blocks,
    turnovers,
    throwaways,
    drops,
  );

  const renderStatPill = (label: string, value: string | number, color?: string) => (
    <View style={[styles.statPill, { backgroundColor: palette.overlay05 }]}>
      <Text style={[styles.statValue, { color: color ?? palette.textInverse }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.textMuted }]}>{label}</Text>
    </View>
  );

  const renderRatePill = (label: string, value: number) => {
    const color =
      value >= 60 ? palette.success : value <= 40 ? palette.danger : palette.textInverse;
    return renderStatPill(label, `${value.toFixed(0)}%`, color);
  };

  // O-Eff color: >= 0.6 green, <= 0.4 red
  const getOEfficiencyColor = (value: number) =>
    value >= 0.6 ? palette.success : value <= 0.4 ? palette.danger : undefined;

  // D-Eff color: >= 0.25 green, < 0.25 red (breaks are rare)
  const getDEfficiencyColor = (value: number) => (value >= 0.25 ? palette.success : palette.danger);

  // Format rate as percentage
  const formatEfficiencyLocal = (value: number) => `${Math.round(value * 100)}%`;

  // Check if timing data is available
  const hasTiming = stats.minutesPlayed !== undefined && stats.minutesPlayed > 0;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
      ]}>
      <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>PLAYING TIME</Text>

      {/* Main stats row - horizontal layout for landscape */}
      <View style={styles.mainRow}>
        {/* Point Breakdown Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>POINTS</Text>
          <View style={styles.pillRow}>
            {renderStatPill('Played', stats.pointsPlayed)}
            {renderStatPill('O-Line', stats.oPoints)}
            {renderStatPill('D-Line', stats.dPoints)}
            {renderStatPill(stats.oLineHolds === 1 ? 'Hold' : 'Holds', stats.oLineHolds)}
            {renderStatPill(stats.dLineBreaks === 1 ? 'Break' : 'Breaks', stats.dLineBreaks)}
          </View>
        </View>

        {/* Efficiency Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>EFFICIENCY</Text>
          <View style={styles.pillRow}>
            {renderRatePill('Win', rates.pointWinRate)}
            {stats.oPoints > 0 &&
              renderStatPill(
                'Offense',
                formatEfficiencyLocal(stats.oEfficiency),
                getOEfficiencyColor(stats.oEfficiency),
              )}
            {stats.dPoints > 0 &&
              renderStatPill(
                'Defense',
                formatEfficiencyLocal(stats.dEfficiency),
                getDEfficiencyColor(stats.dEfficiency),
              )}
          </View>
        </View>

        {/* Per-Point Stats Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>PER POINT</Text>
          <View style={styles.pillRow}>
            {renderStatPill('Goals', goalsPerPoint.toFixed(2))}
            {renderStatPill('Assists', assistsPerPoint.toFixed(2))}
            {renderStatPill('Blocks', blocksPerPoint.toFixed(2))}
            {renderStatPill('TO', turnoversPerPoint.toFixed(2))}
            {renderStatPill('TA', throwawaysPerPoint.toFixed(2))}
            {renderStatPill('Drops', dropsPerPoint.toFixed(2))}
          </View>
        </View>

        {/* Timing Stats Section (if available) */}
        {hasTiming && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>TIMING</Text>
            <View style={styles.pillRow}>
              {renderStatPill('Total PT', formatMinutesPlayed(stats.minutesPlayed!))}
              {stats.avgPointDurationMs !== undefined &&
                renderStatPill('Avg Per Point', `${(stats.avgPointDurationMs / 1000).toFixed(0)}s`)}
              {stats.playingTimePercent !== undefined &&
                renderStatPill('Total PP', `${stats.playingTimePercent.toFixed(0)}%`)}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginTop: 16,
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '700',
      letterSpacing: 1,
      marginBottom: 12,
    },
    mainRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    section: {
      flex: 1,
      minWidth: 140,
    },
    sectionLabel: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontWeight: '600',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    pillRow: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
    },
    statPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      alignItems: 'center',
      minWidth: 55,
    },
    statValue: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '700',
    },
    statLabel: {
      fontSize: scaleBySizeClass(8, sizeClass),
      fontWeight: '600',
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
  });
}
