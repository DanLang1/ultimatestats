import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import StatRing from '@/components/view-stats/StatRing';
import StatsGrid from '@/components/view-stats/StatsGrid';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { AdvancedPlayerStats } from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import { Fonts } from '@/theme/theme';

interface AdvancedPlayingTimeSectionProps {
  stats: AdvancedPlayerStats;
}

export default function AdvancedPlayingTimeSection({ stats }: AdvancedPlayingTimeSectionProps) {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);

  const oEffPct = (stats.oEfficiency ?? 0) * 100;
  const dEffPct = (stats.dEfficiency ?? 0) * 100;

  const gridStats = [
    { label: 'Points Played', value: stats.pointsPlayed },
    { label: 'O-Points', value: stats.oPoints },
    { label: 'D-Points', value: stats.dPoints },
    ...(stats.playingTimePct != null
      ? [{ label: 'Playing Time', value: `${Math.round(stats.playingTimePct * 100)}%` }]
      : []),
    ...(stats.pointDurationMs != null
      ? [{ label: 'Min Played', value: (stats.pointDurationMs / 60000).toFixed(1) }]
      : []),
  ];

  const gridColumns = isLandscape ? Math.min(gridStats.length, 5) : Math.min(gridStats.length, 3);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
      ]}>
      <ThemedText style={[styles.title, { color: palette.textMuted }]}>PLAYING TIME</ThemedText>

      <View style={styles.ringRow}>
        <View style={styles.ringWrapper}>
          <StatRing
            percentage={stats.oPoints > 0 ? oEffPct : 0}
            label="O-Eff"
            sublabel={stats.oPoints > 0 ? `${stats.oPoints} O-pts` : 'No O-pts'}
            info={`How often your O-line scored when you were on the field.

Formula: Holds ÷ O-Points`}
            infoLabel="O Efficiency"
          />
        </View>
        <View style={styles.ringWrapper}>
          <StatRing
            percentage={stats.dPoints > 0 ? dEffPct : 0}
            label="D-Eff"
            sublabel={stats.dPoints > 0 ? `${stats.dPoints} D-pts` : 'No D-pts'}
            info={`How often your D-line converted when you were on the field.

Formula: Breaks ÷ D-Points`}
            infoLabel="D Efficiency"
          />
        </View>
      </View>

      <StatsGrid stats={gridStats} columns={gridColumns} />

      {stats.oPoints > 0 && stats.dPoints > 0 && (
        <View style={styles.balanceRow}>
          <ThemedText style={[styles.balanceLabel, { color: palette.textMuted }]}>
            O/D SPLIT
          </ThemedText>
          <View style={[styles.balanceTrack, { backgroundColor: palette.overlay10 }]}>
            <View
              style={[
                styles.balanceFillO,
                {
                  width: `${(stats.oPoints / stats.pointsPlayed) * 100}%`,
                  backgroundColor: palette.accent,
                },
              ]}
            />
          </View>
          <View style={styles.balanceLegend}>
            <ThemedText style={[styles.balanceStat, { color: palette.accent }]}>
              {Math.round((stats.oPoints / stats.pointsPlayed) * 100)}% O
            </ThemedText>
            <ThemedText style={[styles.balanceStat, { color: palette.success }]}>
              {Math.round((stats.dPoints / stats.pointsPlayed) * 100)}% D
            </ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      gap: 16,
    },
    title: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    ringRow: {
      flexDirection: 'row',
      justifyContent: isLandscape ? 'space-around' : 'center',
      gap: 32,
    },
    ringWrapper: {
      alignItems: 'center',
    },
    balanceRow: {
      gap: 6,
    },
    balanceLabel: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
    },
    balanceTrack: {
      height: scaleBySizeClass(10, sizeClass),
      borderRadius: 999,
      overflow: 'hidden',
    },
    balanceFillO: {
      height: '100%',
      borderRadius: 999,
    },
    balanceLegend: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    balanceStat: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
    },
  });
}
