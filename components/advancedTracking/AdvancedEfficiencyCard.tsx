import AdvancedSectionCard from '@/components/advancedTracking/AdvancedSectionCard';
import StatsGrid, { type StatItem } from '@/components/view-stats/StatsGrid';
import { useLayout } from '@/hooks/useLayout';
import {
  formatDecimal,
  formatNullablePercent,
  formatPercent,
} from '@/lib/advancedTracking/advancedStatFormatUtils';
import type { AdvancedTeamStats } from '@/lib/advancedTracking/advancedTeamStatsUtils';
import { pluralize } from '@/lib/utils';

interface AdvancedEfficiencyCardProps {
  teamStats: AdvancedTeamStats;
}

function buildEfficiencyStats(teamStats: AdvancedTeamStats): StatItem[] {
  const stats: StatItem[] = [
    {
      label: 'D-Efficiency',
      value: formatNullablePercent(teamStats.dEfficiency),
      sublabel: `${teamStats.breaks}/${teamStats.breaks + teamStats.oppHolds}`,
    },
    {
      label: 'Overall Conversion',
      value: formatNullablePercent(teamStats.possessionConversionPct),
      sublabel: `${teamStats.totalGoals}/${teamStats.totalPossessions}`,
    },
  ];
  if (teamStats.completionPct != null) {
    stats.push({
      label: 'Completion',
      value: formatPercent(teamStats.completionPct),
      sublabel: `${teamStats.totalCompletedPasses}/${teamStats.totalThrowAttempts}`,
    });
  }
  stats.push(
    {
      label: pluralize(teamStats.totalCompletedPasses, 'Pass', 'Passes'),
      value: teamStats.totalCompletedPasses,
    },
    { label: 'Blk/D-Pt', value: formatDecimal(teamStats.blocksPerDPoint) },
    { label: 'Prs/D-Pt', value: formatDecimal(teamStats.pressuresPerDPoint) },
    {
      label: pluralize(teamStats.totalTurnovers, 'Turnover', 'Turnovers'),
      value: teamStats.totalTurnovers,
    },
    { label: pluralize(teamStats.totalBlocks, 'Block', 'Blocks'), value: teamStats.totalBlocks },
    {
      label: pluralize(teamStats.totalPressures, 'Pressure', 'Pressures'),
      value: teamStats.totalPressures,
    },
  );
  return stats;
}

export default function AdvancedEfficiencyCard({ teamStats }: AdvancedEfficiencyCardProps) {
  const { isLandscape } = useLayout();

  return (
    <AdvancedSectionCard
      title="EFFICIENCY"
      info={{
        accessibilityLabel: 'About efficiency stats',
        title: 'Efficiency Stats',
        message:
          'D-Efficiency: breaks ÷ all completed D-points.\n\nOverall Conversion: scoring possessions ÷ all possessions.',
      }}>
      <StatsGrid
        stats={buildEfficiencyStats(teamStats)}
        columns={isLandscape ? 4 : 2}
        variant="summary"
      />
    </AdvancedSectionCard>
  );
}
