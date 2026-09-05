import { StyleSheet, View, type DimensionValue } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

export interface StatItem {
  label: string;
  value: string | number;
  sublabel?: string;
}

export type StatsGridVariant = 'card' | 'summary';

export interface StatsGridProps {
  stats: StatItem[];
  columns?: number;
  variant?: StatsGridVariant;
}

function getStatCardWidth(
  columns: number,
  isCard: boolean,
  index: number,
  totalStats: number,
): DimensionValue {
  if (isCard) return `${100 / columns - 2}%`;

  const rowStart = Math.floor(index / columns) * columns;
  const itemsInRow = Math.min(columns, totalStats - rowStart);
  return `${100 / itemsInRow}%`;
}

function getCardPadding(variant: StatsGridVariant) {
  switch (variant) {
    case 'summary':
      return { vertical: 10, horizontal: 4 };
    case 'card':
    default:
      return { vertical: 12, horizontal: 8 };
  }
}

/**
 * Grid of stat cards displaying secondary statistics.
 */
export default function StatsGrid({ stats, columns = 4, variant = 'card' }: StatsGridProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const isCard = variant === 'card';
  const styles = createStyles(sizeClass, variant);

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {stats.map((stat, index) => {
          const width = getStatCardWidth(columns, isCard, index, stats.length);

          return (
            <View
              key={index}
              style={[
                styles.statCard,
                isCard && {
                  backgroundColor: palette.overlay05,
                  borderColor: palette.overlay10,
                },
                { width },
              ]}>
              <ThemedText style={[styles.value, { color: palette.textInverse }]}>
                {stat.value}
              </ThemedText>
              <ThemedText style={[styles.label, { color: palette.textMuted }]}>
                {stat.label}
              </ThemedText>
              {stat.sublabel && (
                <ThemedText style={[styles.sublabel, { color: palette.textMuted }]}>
                  {stat.sublabel}
                </ThemedText>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass, variant: StatsGridVariant) {
  const isCard = variant === 'card';
  const padding = getCardPadding(variant);
  const isSummary = variant === 'summary';
  const baseValueSize = isCard ? 18 : 20;
  const valueSize = isSummary ? 26 : baseValueSize;

  return StyleSheet.create({
    container: {
      width: '100%',
    },
    grid: {
      flexDirection: 'row',
      justifyContent: isCard ? 'space-between' : 'flex-start',
      flexWrap: 'wrap',
    },
    statCard: {
      paddingVertical: padding.vertical,
      paddingHorizontal: padding.horizontal,
      borderRadius: isCard ? 10 : 0,
      borderWidth: isCard ? 1 : 0,
      alignItems: isSummary ? 'flex-start' : 'center',
      justifyContent: isSummary ? 'flex-start' : 'center',
      marginBottom: variant === 'summary' ? 0 : 8,
    },
    value: {
      fontSize: scaleBySizeClass(valueSize, sizeClass),
      fontFamily: Fonts.bold,
    },
    label: {
      fontSize: scaleBySizeClass(isSummary ? 13 : 9, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: isSummary ? 'none' : 'uppercase',
      letterSpacing: isSummary ? 0 : 0.5,
      textAlign: isSummary ? 'left' : 'center',
      marginTop: 2,
    },
    sublabel: {
      fontSize: scaleBySizeClass(isSummary ? 13 : 9, sizeClass),
      marginTop: 2,
    },
  });
}
