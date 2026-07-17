import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface StatItem {
  label: string;
  value: string | number;
  sublabel?: string;
}

interface StatsGridProps {
  stats: StatItem[];
  columns?: number;
}

/**
 * Grid of stat cards displaying secondary statistics.
 */
export default function StatsGrid({ stats, columns = 4 }: StatsGridProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View style={[styles.container, { gap: 8 }]}>
      <View style={[styles.grid, { flexWrap: 'wrap' }]}>
        {stats.map((stat, index) => (
          <View
            key={index}
            style={[
              styles.statCard,
              {
                backgroundColor: palette.overlay05,
                borderColor: palette.overlay10,
                width: `${100 / columns - 2}%`,
              },
            ]}>
            <ThemedText style={[styles.value, { color: palette.textInverse }]}>
              {stat.value}
            </ThemedText>
            <ThemedText style={[styles.label, { color: palette.textMuted }]}>
              {stat.label}
            </ThemedText>
            {stat.sublabel && (
              <ThemedText style={[styles.sublabel, { color: palette.textSecondary }]}>
                {stat.sublabel}
              </ThemedText>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      width: '100%',
    },
    grid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statCard: {
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      marginBottom: 8,
    },
    value: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
    },
    label: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      textAlign: 'center',
      marginTop: 2,
    },
    sublabel: {
      fontSize: scaleBySizeClass(9, sizeClass),
      marginTop: 2,
    },
  });
}
