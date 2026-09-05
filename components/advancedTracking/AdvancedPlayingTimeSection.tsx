import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import PlayingTimeGauge from '@/components/view-stats/playing-time/PlayingTimeGauge';
import RoleBalanceBar from '@/components/view-stats/playing-time/RoleBalanceBar';
import StatsGrid from '@/components/view-stats/StatsGrid';
import StatsSectionCard from '@/components/view-stats/StatsSectionCard';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, type SizeClass, useLayout } from '@/hooks/useLayout';
import type { AdvancedPlayerStats } from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import { Fonts } from '@/theme/theme';

interface AdvancedPlayingTimeSectionProps {
  stats: AdvancedPlayerStats;
}

export default function AdvancedPlayingTimeSection({ stats }: AdvancedPlayingTimeSectionProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const participationLabel =
    stats.playingTimePct == null
      ? 'Point timing unavailable'
      : `${Math.round(stats.playingTimePct * 100)}% of recorded point time`;
  const timeSeconds =
    stats.pointDurationMs == null ? null : Math.round(stats.pointDurationMs / 1000);
  const timeLabel =
    timeSeconds == null
      ? '—'
      : `${Math.floor(timeSeconds / 60)}:${String(timeSeconds % 60).padStart(2, '0')}`;
  const perPointStats = [
    { label: 'Goals', count: stats.goals },
    { label: 'Assists', count: stats.assists },
    { label: 'Blocks', count: stats.blocks },
    { label: 'Turnovers', count: stats.throwaways + stats.drops + stats.stallsConceded },
    { label: 'Throwaways', count: stats.throwaways },
    { label: 'Drops', count: stats.drops },
  ].map(({ label, count }) => ({
    label,
    value: stats.pointsPlayed > 0 ? (count / stats.pointsPlayed).toFixed(2) : '—',
  }));

  return (
    <StatsSectionCard title="Playing time">
      <View style={styles.content}>
        <View style={styles.overviewRow}>
          <PlayingTimeGauge
            percentage={(stats.playingTimePct ?? 0) * 100}
            centerLabel={String(stats.pointsPlayed)}
            centerSubLabel="Points"
            color={palette.accent}
          />
          <ThemedText style={[styles.participation, { color: palette.textMuted }]}>
            {participationLabel}
          </ThemedText>
        </View>
        <StatsGrid
          variant="summary"
          columns={2}
          stats={[
            { label: 'Recorded point time', value: timeLabel, sublabel: 'min:sec' },
            {
              label: 'O/D point split',
              value: `${stats.oPoints} / ${stats.dPoints}`,
              sublabel:
                stats.pointsPlayed > 0
                  ? `${Math.round((stats.oPoints / stats.pointsPlayed) * 100)}% O · ${Math.round((stats.dPoints / stats.pointsPlayed) * 100)}% D`
                  : 'No points played',
            },
          ]}
        />
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
            O/D performance
          </ThemedText>
          <RoleBalanceBar
            oPoints={stats.oPoints}
            dPoints={stats.dPoints}
            oEfficiency={stats.oEfficiency}
            dEfficiency={stats.dEfficiency}
          />
        </View>
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
            Per point
          </ThemedText>
          <StatsGrid variant="summary" columns={3} stats={perPointStats} />
        </View>
      </View>
    </StatsSectionCard>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    content: { gap: 16 },
    overviewRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    participation: {
      flex: 1,
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    section: { gap: 8 },
    sectionTitle: { fontSize: scaleBySizeClass(15, sizeClass), fontFamily: Fonts.semiBold },
  });
}
