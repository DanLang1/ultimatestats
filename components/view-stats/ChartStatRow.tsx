import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

export interface ChartStat {
  label: string;
  display: string;
}

interface ChartStatRowProps {
  stats: ChartStat[];
}

/** The key numbers under a chart, each value above its label in equal columns. */
export default function ChartStatRow({ stats }: ChartStatRowProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View style={styles.row}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.stat}>
          <ThemedText style={[styles.value, { color: palette.textInverse }]}>
            {stat.display}
          </ThemedText>
          <ThemedText style={[styles.label, { color: palette.textMuted }]}>{stat.label}</ThemedText>
        </View>
      ))}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      marginTop: 12,
    },
    stat: {
      flex: 1,
    },
    value: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
      fontVariant: ['tabular-nums'],
    },
    label: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
  });
}
