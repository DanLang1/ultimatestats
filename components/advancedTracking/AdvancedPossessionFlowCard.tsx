import { StyleSheet, View } from 'react-native';

import AdvancedSectionCard from '@/components/advancedTracking/AdvancedSectionCard';
import { ThemedText } from '@/components/ThemedText';
import StatsGrid, { type StatItem } from '@/components/view-stats/StatsGrid';
import TimeOfPossessionSection from '@/components/view-stats/TimeOfPossessionSection';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, type SizeClass, useLayout } from '@/hooks/useLayout';
import { formatDecimal, formatPercent } from '@/lib/advancedTracking/advancedStatFormatUtils';
import type { AdvancedTeamStats } from '@/lib/advancedTracking/advancedTeamStatsUtils';
import type { TimeOfPossessionStats } from '@/lib/timeOfPossessionTypes';
import { Fonts } from '@/theme/theme';

interface AdvancedPossessionFlowCardProps {
  teamStats: AdvancedTeamStats;
  topStats: TimeOfPossessionStats | null;
  team1Name: string;
  team2Name: string;
}

function buildPossessionFlowStats(teamStats: AdvancedTeamStats): StatItem[] {
  const stats: StatItem[] = [];
  if (teamStats.possessionsPerPoint != null) {
    stats.push({ label: 'Avg Poss/Pt', value: teamStats.possessionsPerPoint.toFixed(1) });
  }
  if (teamStats.multiPossessionPointPct != null) {
    stats.push({
      label: 'Multi-Turn Pts',
      value: formatPercent(teamStats.multiPossessionPointPct),
      sublabel: `${teamStats.multiPossessionPoints}/${teamStats.completedPoints}`,
    });
  }
  if (teamStats.completedPassesPerPoint != null) {
    stats.push({ label: 'Passes/Point', value: formatDecimal(teamStats.completedPassesPerPoint) });
  }
  if (teamStats.completedPassesPerPossession != null) {
    stats.push({
      label: 'Passes/Poss',
      value: formatDecimal(teamStats.completedPassesPerPossession),
    });
  }
  return stats;
}

export default function AdvancedPossessionFlowCard({
  teamStats,
  topStats,
  team1Name,
  team2Name,
}: AdvancedPossessionFlowCardProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <AdvancedSectionCard title="POSSESSION & GAME FLOW" testID="advanced-possession-flow-card">
      <View style={styles.subsectionFirst}>
        <ThemedText style={[styles.subsectionTitle, { color: palette.textMuted }]}>
          MOMENTUM
        </ThemedText>
        <StatsGrid
          stats={[
            { label: 'Run', value: teamStats.longestScoringRun, sublabel: 'Longest' },
            { label: 'Drought', value: teamStats.longestDrought, sublabel: 'Longest' },
          ]}
          columns={2}
          variant="summary"
        />
      </View>

      <View style={styles.subsection}>
        <ThemedText style={[styles.subsectionTitle, { color: palette.textMuted }]}>
          POSSESSION FLOW
        </ThemedText>
        <StatsGrid stats={buildPossessionFlowStats(teamStats)} columns={2} variant="summary" />
      </View>

      {topStats && (
        <TimeOfPossessionSection topStats={topStats} team1Name={team1Name} team2Name={team2Name} />
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
