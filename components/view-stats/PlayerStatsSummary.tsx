import { PlayerStats as PlayerStatsType } from '@/lib/statsUtils';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PlayerStatsSummaryProps {
  stats: PlayerStatsType;
  palette: any;
}

// Helper for singular/plural labels
const pluralize = (count: number, singular: string, plural: string) =>
  count === 1 ? singular : plural;

export default function PlayerStatsSummary({ stats, palette }: PlayerStatsSummaryProps) {
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
      ]}>
      <View style={styles.statCell}>
        <Text style={[styles.statValue, { color: palette.success }]}>{stats.goals}</Text>
        <Text style={[styles.statLabel, { color: palette.textMuted }]}>
          {pluralize(stats.goals, 'Goal', 'Goals')}
        </Text>
      </View>
      <View style={styles.statCell}>
        <Text style={[styles.statValue, { color: palette.success }]}>{stats.assists}</Text>
        <Text style={[styles.statLabel, { color: palette.textMuted }]}>
          {pluralize(stats.assists, 'Assist', 'Assists')}
        </Text>
      </View>
      <View style={styles.statCell}>
        <Text style={[styles.statValue, { color: palette.success }]}>{stats.blocks}</Text>
        <Text style={[styles.statLabel, { color: palette.textMuted }]}>
          {pluralize(stats.blocks, 'Block', 'Blocks')}
        </Text>
      </View>
      <View style={styles.statCell}>
        <Text style={[styles.statValue, { color: palette.danger }]}>{stats.throwaways}</Text>
        <Text style={[styles.statLabel, { color: palette.textMuted }]}>
          {pluralize(stats.throwaways, 'Throwaway', 'Throwaways')}
        </Text>
      </View>
      <View style={styles.statCell}>
        <Text style={[styles.statValue, { color: palette.danger }]}>{stats.drops}</Text>
        <Text style={[styles.statLabel, { color: palette.textMuted }]}>
          {pluralize(stats.drops, 'Drop', 'Drops')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  statCell: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
