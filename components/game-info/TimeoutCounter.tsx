import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TimeoutCounterProps {
  count: number;
  hasFloater: boolean;
}

export function TimeoutCounter({ count, hasFloater }: TimeoutCounterProps) {
  const { palette } = useTheme();

  return (
    <View style={styles.timeoutContainer}>
      <Text style={[styles.timeoutNumber, { color: palette.success }]}>{count}</Text>
      <Text style={[styles.timeoutLabel, { color: palette.textMuted }]}>left</Text>
      {hasFloater && (
        <View style={[styles.floaterChip, { backgroundColor: palette.success }]}>
          <Text style={[styles.floaterText, { color: palette.primary }]}>+1</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  timeoutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeoutNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  timeoutLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  floaterChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  floaterText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
