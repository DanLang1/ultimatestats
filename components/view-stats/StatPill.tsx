import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StatPillProps {
  value: number;
  label: string;
  type: 'positive' | 'negative';
  bgColor: string;
  textColor: string;
  sizeClass?: SizeClass;
}

export default function StatPill({
  value,
  label,
  bgColor,
  textColor,
  sizeClass = 'small',
}: StatPillProps) {
  const styles = createStyles(sizeClass);
  return (
    <View style={[styles.pill, { backgroundColor: bgColor }]}>
      <Text style={[styles.pillValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.pillLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
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
