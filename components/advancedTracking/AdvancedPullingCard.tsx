import StatsGrid from '@/components/view-stats/StatsGrid';
import StatsSectionCard from '@/components/view-stats/StatsSectionCard';
import { getInboundPullCount, type PullStats } from '@/lib/advancedTracking/advancedPullStatsUtils';

interface AdvancedPullingCardProps {
  pullStats: PullStats;
}

export default function AdvancedPullingCard({ pullStats }: AdvancedPullingCardProps) {
  if (pullStats.totalPulls === 0) return null;

  const inboundPullCount = getInboundPullCount(pullStats);

  return (
    <StatsSectionCard title="PULLING">
      <StatsGrid
        stats={[
          {
            label: 'Inbound',
            value: `${Math.round((inboundPullCount / pullStats.totalPulls) * 100)}%`,
            sublabel: `${inboundPullCount}/${pullStats.totalPulls}`,
          },
          ...(pullStats.avgHangTimeMs != null
            ? [
                {
                  label: 'Avg Hang',
                  value: `${(pullStats.avgHangTimeMs / 1000).toFixed(1)}s`,
                },
              ]
            : []),
        ]}
        columns={pullStats.avgHangTimeMs != null ? 2 : 1}
        variant="summary"
      />
    </StatsSectionCard>
  );
}
