import { palette } from '@/theme/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TimeoutCounterProps {
  count: number;
  hasFloater: boolean;
}

export function TimeoutCounter({ count, hasFloater }: TimeoutCounterProps) {
  return (
    <View style={styles.timeoutContainer}>
      <Text style={styles.timeoutNumber}>{count}</Text>
      <Text style={styles.timeoutLabel}>left</Text>
      {hasFloater && (
        <View style={styles.floaterChip}>
          <Text style={styles.floaterText}>+1</Text>
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
    color: palette.success,
  },
  timeoutLabel: {
    fontSize: 14,
    color: palette.textMuted,
    fontWeight: '500',
  },
  floaterChip: {
    backgroundColor: palette.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  floaterText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.primary,
  },
});
