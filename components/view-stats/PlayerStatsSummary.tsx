import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { PlayerStats as PlayerStatsType } from '@/lib/statsUtils';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PlayerStatsSummaryProps {
  stats: PlayerStatsType;
  variant?: 'horizontal' | 'vertical';
}

// Helper for singular/plural labels
const pluralize = (count: number, singular: string, plural: string) =>
  count === 1 ? singular : plural;

interface StatPillProps {
  value: number;
  label: string;
  type: 'positive' | 'negative';
  bgColor: string;
  textColor: string;
  styles: ReturnType<typeof createStyles>;
}

function StatPill({ value, label, bgColor, textColor, styles }: StatPillProps) {
  return (
    <View style={[styles.pill, { backgroundColor: bgColor }]}>
      <Text style={[styles.pillValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.pillLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

export default function PlayerStatsSummary({
  stats,
  variant = 'horizontal',
}: PlayerStatsSummaryProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
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
        styles={styles}
      />
      <StatPill
        value={stats.assists}
        label={pluralize(stats.assists, 'Assist', 'Assists')}
        type="positive"
        bgColor={positiveBg}
        textColor={positiveText}
        styles={styles}
      />
      <StatPill
        value={stats.blocks}
        label={pluralize(stats.blocks, 'Block', 'Blocks')}
        type="positive"
        bgColor={positiveBg}
        textColor={positiveText}
        styles={styles}
      />

      <StatPill
        value={stats.throwaways}
        label={pluralize(stats.throwaways, 'Throwaway', 'Throwaways')}
        type="negative"
        bgColor={negativeBg}
        textColor={negativeText}
        styles={styles}
      />
      <StatPill
        value={stats.drops}
        label={pluralize(stats.drops, 'Drop', 'Drops')}
        type="negative"
        bgColor={negativeBg}
        textColor={negativeText}
        styles={styles}
      />
      <StatPill
        value={stats.throwaways + stats.drops}
        label={pluralize(stats.throwaways + stats.drops, 'Total Turn', 'Total Turns')}
        type="negative"
        bgColor={negativeBg}
        textColor={negativeText}
        styles={styles}
      />
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
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
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 4,
    },
    pillValue: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '800',
    },
    pillLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '600',
    },
  });
}
