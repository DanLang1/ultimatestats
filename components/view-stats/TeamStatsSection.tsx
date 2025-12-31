import { useTheme } from '@/context/ThemeContext';
import { GameEvent } from '@/lib/storage';
import { computeTeamStats } from '@/lib/teamStatsUtils';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import StatRing from './StatRing';
import StatsGrid from './StatsGrid';

interface TeamStatsSectionProps {
  events: GameEvent[];
  startingPossession: 'team1' | 'team2' | null;
  gameTo: number;
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
}: TeamStatsSectionProps) {
  const { palette } = useTheme();

  const stats = computeTeamStats(events, startingPossession, gameTo);

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
          <StatRing
            key={index}
            percentage={stat.percentage}
            label={stat.label}
            sublabel={stat.sublabel}
            info={stat.info}
            infoLabel={stat.infoLabel}
          />
        ))}
      </View>

      {/* Primary Stats Grid */}
      <StatsGrid stats={secondaryStats} columns={4} />

      {/* Game Flow Section */}
      <View style={styles.subsectionContainer}>
        <Text style={[styles.subsectionTitle, { color: palette.textMuted }]}>GAME FLOW</Text>
        <StatsGrid stats={gameFlowStats} columns={3} />
      </View>

      {/* Efficiency Section */}
      <View style={styles.subsectionContainer}>
        <Text style={[styles.subsectionTitle, { color: palette.textMuted }]}>EFFICIENCY</Text>
        <StatsGrid stats={efficiencyStats} columns={4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  ringRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  subsectionContainer: {
    marginTop: 8,
  },
  subsectionTitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
});
