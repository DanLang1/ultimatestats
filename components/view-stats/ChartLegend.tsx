import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';

const SWATCH_SIZE = 7;

export interface ChartLegendItem {
  label: string;
  color: string;
}

interface ChartLegendProps {
  items: ChartLegendItem[];
  /** Matches the chart's marks: a dot for point markers, a square for bars. */
  swatch: 'dot' | 'square';
}

/** One line of colored swatches naming what a chart's colors mean. */
export default function ChartLegend({ items, swatch }: ChartLegendProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const swatchRadius = swatch === 'dot' ? SWATCH_SIZE / 2 : 2;

  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          <View
            style={[styles.swatch, { backgroundColor: item.color, borderRadius: swatchRadius }]}
          />
          <ThemedText style={[styles.label, { color: palette.textMuted }]}>{item.label}</ThemedText>
        </View>
      ))}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 16,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    swatch: {
      width: SWATCH_SIZE,
      height: SWATCH_SIZE,
    },
    label: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
  });
}
