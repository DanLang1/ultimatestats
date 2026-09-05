import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { PlayerStats as PlayerStatsType } from '@/lib/basic/statsUtils';
import { pluralize } from '@/lib/utils';

import StatPill from './StatPill';

interface PlayerStatsSummaryProps {
  stats: PlayerStatsType;
  variant?: 'horizontal' | 'vertical';
}

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
        bgColor={positiveBg}
        textColor={positiveText}
      />
      <StatPill
        value={stats.assists}
        label={pluralize(stats.assists, 'Assist', 'Assists')}
        bgColor={positiveBg}
        textColor={positiveText}
      />
      <StatPill
        value={stats.blocks}
        label={pluralize(stats.blocks, 'Block', 'Blocks')}
        bgColor={positiveBg}
        textColor={positiveText}
      />

      <StatPill
        value={stats.throwaways}
        label={pluralize(stats.throwaways, 'Throwaway', 'Throwaways')}
        bgColor={negativeBg}
        textColor={negativeText}
      />
      <StatPill
        value={stats.drops}
        label={pluralize(stats.drops, 'Drop', 'Drops')}
        bgColor={negativeBg}
        textColor={negativeText}
      />
      <StatPill
        value={stats.throwaways + stats.drops}
        label={pluralize(stats.throwaways + stats.drops, 'Total Turn', 'Total Turns')}
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
