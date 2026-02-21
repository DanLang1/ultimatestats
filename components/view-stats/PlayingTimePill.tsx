import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PlayingTimePillProps {
  label: string;
  value: string | number;
  color?: string;
  sizeClass?: SizeClass;
}

export default function PlayingTimePill({
  label,
  value,
  color,
  sizeClass = 'small',
}: PlayingTimePillProps) {
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  return (
    <View style={[styles.statPill, { backgroundColor: palette.overlay05 }]}>
      <Text style={[styles.statValue, { color: color ?? palette.textInverse }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.textMuted }]}>{label}</Text>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    statPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      alignItems: 'center',
      minWidth: 55,
    },
    statValue: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '700',
    },
    statLabel: {
      fontSize: scaleBySizeClass(8, sizeClass),
      fontWeight: '600',
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
  });
}
