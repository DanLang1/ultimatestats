import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { PlayerStats as PlayerStatsType } from '@/lib/basic/statsUtils';

import StatPill from './StatPill';

interface PlayerStatsSummaryProps {
  stats: PlayerStatsType;
  variant?: 'horizontal' | 'vertical';
}

// Helper for singular/plural labels
const pluralize = (count: number, singular: string, plural: string) =>
  count === 1 ? singular : plural;

export default function PlayerStatsSummary({
  stats,
  variant = 'horizontal',
}: PlayerStatsSummaryProps) {
  const { palette } = useTheme();
  const styles = createStyles();
  const isVertical = variant === 'vertical';

  const positiveBg = palette.successOverlay15;
  const positiveText = palette.success;
  const negativeBg = palette.dangerOverlay15;
  const negativeText = palette.danger;

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
        bgColor={positiveBg}
        textColor={positiveText}
      />
      <StatPill
        value={stats.assists}
        label={pluralize(stats.assists, 'Assist', 'Assists')}
        type="positive"
        bgColor={positiveBg}
        textColor={positiveText}
      />
      <StatPill
        value={stats.blocks}
        label={pluralize(stats.blocks, 'Block', 'Blocks')}
        type="positive"
        bgColor={positiveBg}
        textColor={positiveText}
      />

      <StatPill
        value={stats.throwaways}
        label={pluralize(stats.throwaways, 'Throwaway', 'Throwaways')}
        type="negative"
        bgColor={negativeBg}
        textColor={negativeText}
      />
      <StatPill
        value={stats.drops}
        label={pluralize(stats.drops, 'Drop', 'Drops')}
        type="negative"
        bgColor={negativeBg}
        textColor={negativeText}
      />
      <StatPill
        value={stats.throwaways + stats.drops}
        label={pluralize(stats.throwaways + stats.drops, 'Total Turn', 'Total Turns')}
        type="negative"
        bgColor={negativeBg}
        textColor={negativeText}
      />
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
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
  });
}
