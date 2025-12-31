import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
            <Text style={[styles.value, { color: palette.textInverse }]}>{stat.value}</Text>
            <Text style={[styles.label, { color: palette.textMuted }]}>{stat.label}</Text>
            {stat.sublabel && (
              <Text style={[styles.sublabel, { color: palette.textSecondary }]}>
                {stat.sublabel}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 2,
  },
  sublabel: {
    fontSize: 9,
    marginTop: 2,
  },
});
