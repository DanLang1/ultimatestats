import { useTheme } from '@/context/ThemeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TimeoutCounterProps {
  count: number;
  hasFloater: boolean;
  floaterEnabled: boolean;
}

export function TimeoutCounter({ count, hasFloater, floaterEnabled }: TimeoutCounterProps) {
  const { palette } = useTheme();

  return (
    <View style={styles.timeoutContainer}>
      <View style={styles.countRow}>
        <Text style={[styles.timeoutNumber, { color: palette.success }]}>{count}</Text>
        {floaterEnabled && (
          <View style={styles.floaterBadge}>
            <Text
              style={[
                styles.floaterText,
                { color: hasFloater ? palette.success : palette.textMuted },
              ]}>
              (
            </Text>
            <MaterialCommunityIcons
              name={hasFloater ? 'rhombus' : 'rhombus-outline'}
              size={14}
              color={hasFloater ? palette.success : palette.textMuted}
            />
            <Text
              style={[
                styles.floaterText,
                { color: hasFloater ? palette.success : palette.textMuted },
              ]}>
              {hasFloater ? '+1' : '0'})
            </Text>
          </View>
        )}
      </View>
      {floaterEnabled && (
        <Text style={[styles.floaterLabel, { color: palette.textMuted }]}>
          {hasFloater ? 'floater available' : 'floater used'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  timeoutContainer: {
    alignItems: 'center',
    gap: 4,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeoutNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  floaterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floaterText: {
    fontSize: 16,
    fontWeight: '600',
  },
  floaterLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});
