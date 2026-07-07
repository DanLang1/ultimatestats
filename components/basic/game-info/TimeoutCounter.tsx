import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';

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
        <ThemedText style={[styles.timeoutNumber, { color: palette.success }]}>{count}</ThemedText>
        {floaterEnabled && (
          <View style={styles.floaterBadge}>
            <ThemedText
              style={[
                styles.floaterText,
                { color: hasFloater ? palette.success : palette.textMuted },
              ]}>
              (
            </ThemedText>
            <MaterialCommunityIcons
              name={hasFloater ? 'rhombus' : 'rhombus-outline'}
              size={floaterIconSize}
              color={hasFloater ? palette.success : palette.textMuted}
            />
            <ThemedText
              style={[
                styles.floaterText,
                { color: hasFloater ? palette.success : palette.textMuted },
              ]}>
              {hasFloater ? '+1' : '0'})
            </ThemedText>
          </View>
        )}
      </View>
      {floaterEnabled && (
        <ThemedText style={[styles.floaterLabel, { color: palette.textMuted }]}>
          {hasFloater ? 'floater available' : 'floater used'}
        </ThemedText>
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
      fontFamily: Fonts.bold,
    },
    floaterBadge: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    floaterText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    floaterLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
