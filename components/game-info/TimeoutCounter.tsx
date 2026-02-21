import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TimeoutCounterProps {
  count: number;
  hasFloater: boolean;
  floaterEnabled: boolean;
  sizeClass?: SizeClass;
}

export function TimeoutCounter({
  count,
  hasFloater,
  floaterEnabled,
  sizeClass = 'small',
}: TimeoutCounterProps) {
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const floaterIconSize = scaleBySizeClass(14, sizeClass);

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
              size={floaterIconSize}
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

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
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
      fontSize: scaleBySizeClass(28, sizeClass),
      fontWeight: '700',
    },
    floaterBadge: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    floaterText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontWeight: '600',
    },
    floaterLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '500',
    },
  });
}
