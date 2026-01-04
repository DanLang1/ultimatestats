import { PlayerStats as PlayerStatsType } from '@/lib/statsUtils';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PlayerStatsSummaryProps {
  stats: PlayerStatsType;
  palette: any;
  variant?: 'horizontal' | 'vertical';
}

// Helper for singular/plural labels
const pluralize = (count: number, singular: string, plural: string) =>
  count === 1 ? singular : plural;

interface StatPillProps {
  value: number;
  label: string;
  type: 'positive' | 'negative';
  palette: any;
}

function StatPill({ value, label, type, palette }: StatPillProps) {
  const bgColor = type === 'positive' ? palette.successOverlay15 : palette.dangerOverlay15;
  const textColor = type === 'positive' ? palette.success : palette.danger;

  return (
    <View style={[styles.pill, { backgroundColor: bgColor }]}>
      <Text style={[styles.pillValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.pillLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

export default function PlayerStatsSummary({
  stats,
  palette,
  variant = 'horizontal',
}: PlayerStatsSummaryProps) {
  const isVertical = variant === 'vertical';

  return (
    <View
      style={[
        isVertical ? styles.containerVertical : styles.container,
        !isVertical && { backgroundColor: palette.overlay02, borderColor: palette.overlay05 },
      ]}>
      <StatPill
        value={stats.goals}
        label={pluralize(stats.goals, 'Goal', 'Goals')}
        type="positive"
        palette={palette}
      />
      <StatPill
        value={stats.assists}
        label={pluralize(stats.assists, 'Assist', 'Assists')}
        type="positive"
        palette={palette}
      />
      <StatPill
        value={stats.blocks}
        label={pluralize(stats.blocks, 'Block', 'Blocks')}
        type="positive"
        palette={palette}
      />
      <StatPill
        value={stats.throwaways}
        label={pluralize(stats.throwaways, 'Throwaway', 'Throwaways')}
        type="negative"
        palette={palette}
      />
      <StatPill
        value={stats.drops}
        label={pluralize(stats.drops, 'Drop', 'Drops')}
        type="negative"
        palette={palette}
      />
      <StatPill
        value={stats.throwaways + stats.drops}
        label={pluralize(stats.throwaways + stats.drops, 'Turn', 'Turns')}
        type="negative"
        palette={palette}
      />
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
    gap: 8,
  },
  containerVertical: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  pillValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
