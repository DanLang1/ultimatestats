import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { GameEvent } from '@/lib/storage';
import {
  computeTeamStats,
  computeTimingStats,
  computeTimeOfPossessionStats,
} from '@/lib/teamStatsUtils';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import StatRing from './StatRing';
import StatsGrid from './StatsGrid';
import TimeOfPossessionSection from './TimeOfPossessionSection';

// Format milliseconds to "Xm Ys" or just "Xs" for short durations
const formatDuration = (ms: number): string => {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
};

interface TeamStatsSectionProps {
  events: GameEvent[];
  startingPossession: 'team1' | 'team2' | null;
  gameTo: number;
  team1Name: string;
  team2Name: string;
  team1Color?: string;
  team2Color?: string;
}

/**
 * Standalone team stats section component.
 * Displays team-level performance metrics with arc gauges and stat grids.
 * Designed to be easily migrated to its own route if needed.
 */
export default function TeamStatsSection({
  events,
  startingPossession,
  gameTo,
  team1Name,
  team2Name,
  team1Color,
  team2Color,
}: TeamStatsSectionProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);

  const stats = computeTeamStats(events, startingPossession, gameTo);
  const timingStats = computeTimingStats(events, startingPossession, gameTo);
  const topStats = computeTimeOfPossessionStats(events, startingPossession, gameTo);

  // Don't render if no events
  if (events.length === 0) {
    return null;
  }

  // Format values for display
  const formatDecimal = (value: number) => {
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(1);
  };

  // Primary stats for ring gauges
  const primaryStats = [
    {
      percentage: stats.holdPercentage,
      label: 'Hold',
      sublabel: `${stats.holds}/${stats.offensivePoints}`,
      info: 'How often you score when starting on offense.\n\nFormula: Holds ÷ O-Points',
      infoLabel: 'Hold',
    },
    {
      percentage: stats.breakEfficiency,
      label: 'Break Eff',
      sublabel: `${stats.breaks}/${stats.dPointsWithTurnover}`,
      info: 'When you force a turnover, how often do you convert it to a score?\n\nFormula: Breaks ÷ D-Points with Forced Turn',
      infoLabel: 'Break Efficiency',
    },
    {
      percentage: stats.dEfficiency,
      label: 'D-Eff',
      sublabel: `${stats.breaks}/${stats.defensivePoints}`,
      info: 'How often you score when starting on defense.\n\nFormula: Breaks ÷ D-Points',
      infoLabel: 'Defensive Efficiency',
    },
    {
      percentage: stats.conversionRate,
      label: 'Conversion',
      sublabel: `${stats.holds + stats.breaks}/${stats.offensivePoints + stats.opponentTurnovers}`,
      info: 'How often you score when you have the disc.\n\nFormula: Goals ÷ Possessions\n\nPossessions = O-Points + Opponent Turnovers',
      infoLabel: 'Conversion Rate',
    },
  ];

  // Secondary stats grid
  const secondaryStats = [
    { label: 'Clean Holds', value: stats.cleanHolds },
    { label: 'Dirty Holds', value: stats.dirtyHolds },
    { label: 'Breaks', value: stats.breaks },
    { label: 'Times Broken ', value: stats.timesBroken },
  ];

  // Game flow stats
  const gameFlowStats = [
    { label: 'Run', value: stats.longestScoringRun, sublabel: 'Longest' },
    { label: 'Drought', value: stats.longestDrought, sublabel: 'Longest' },
    { label: 'TO/Pt', value: formatDecimal(stats.turnoversPerPoint) },
  ];

  // Efficiency stats
  const efficiencyStats = [
    { label: 'Pts/Turn', value: formatDecimal(stats.pointsPerTurnover) },
    { label: 'Blk/D-Pt', value: formatDecimal(stats.blocksPerDPoint) },
    { label: 'Turnover(s)', value: stats.totalTurnovers },
    { label: 'Block(s)', value: stats.totalBlocks },
  ];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
      ]}>
      {/* Section Header */}
      <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>TEAM PERFORMANCE</Text>

      {/* Ring Gauges */}
      <View style={styles.ringRow}>
        {primaryStats.map((stat, index) => (
          <View key={index} style={styles.ringWrapper}>
            <StatRing
              percentage={stat.percentage}
              label={stat.label}
              sublabel={stat.sublabel}
              info={stat.info}
              infoLabel={stat.infoLabel}
            />
          </View>
        ))}
      </View>

      {/* Primary Stats Grid */}
      <StatsGrid stats={secondaryStats} columns={isLandscape ? 4 : 2} />

      {/* Game Flow Section */}
      <View style={styles.subsectionContainer}>
        <Text style={[styles.subsectionTitle, { color: palette.textMuted }]}>GAME FLOW</Text>
        <StatsGrid stats={gameFlowStats} columns={3} />
      </View>

      {/* Efficiency Section */}
      <View style={styles.subsectionContainer}>
        <Text style={[styles.subsectionTitle, { color: palette.textMuted }]}>EFFICIENCY</Text>
        <StatsGrid stats={efficiencyStats} columns={isLandscape ? 4 : 2} />
      </View>

      {/* Timing Section - only show if timing data exists */}
      {timingStats.hasTimingData && (
        <View style={styles.subsectionContainer}>
          <Text style={[styles.subsectionTitle, { color: palette.textMuted }]}>POINT LENGTH</Text>
          <StatsGrid
            stats={[
              { label: 'Avg Pt', value: formatDuration(timingStats.avgPointDurationMs) },
              { label: 'Avg O-Pt', value: formatDuration(timingStats.avgOPointDurationMs) },
              { label: 'Avg D-Pt', value: formatDuration(timingStats.avgDPointDurationMs) },
              { label: 'Longest', value: formatDuration(timingStats.longestPointDurationMs) },
              { label: 'Shortest', value: formatDuration(timingStats.shortestPointDurationMs) },
            ]}
            columns={isLandscape ? 5 : 3}
          />
        </View>
      )}

      <TimeOfPossessionSection
        topStats={topStats}
        team1Name={team1Name}
        team2Name={team2Name}
        team1Color={team1Color}
        team2Color={team2Color}
      />
    </View>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '700',
      letterSpacing: 1,
      marginBottom: 16,
      textTransform: 'uppercase',
    },
    ringRow: {
      flexDirection: 'row',
      justifyContent: isLandscape ? 'space-around' : 'center',
      marginBottom: 20,
      flexWrap: isLandscape ? 'nowrap' : 'wrap',
      rowGap: 16,
    },
    ringWrapper: {
      width: isLandscape ? undefined : '50%',
      alignItems: 'center',
    },
    subsectionContainer: {
      marginTop: 8,
    },
    subsectionTitle: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontWeight: '700',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
  });
}
