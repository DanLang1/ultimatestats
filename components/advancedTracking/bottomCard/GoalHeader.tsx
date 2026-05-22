import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { GoalInfo } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface GoalHeaderProps {
  goalInfo: GoalInfo;
}

export const GoalHeader = ({ goalInfo }: GoalHeaderProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  if (goalInfo.isFocusGoal) {
    return (
      <View style={styles.row}>
        {goalInfo.assisterName && (
          <>
            <ThemedText numberOfLines={1} style={[styles.bold, { color: palette.textInverse }]}>
              {goalInfo.assisterName}
            </ThemedText>
            <ThemedText style={[styles.sep, { color: palette.textMuted }]}>+</ThemedText>
          </>
        )}
        {goalInfo.scorerName && (
          <ThemedText numberOfLines={1} style={[styles.bold, { color: palette.textInverse }]}>
            {goalInfo.scorerName}
          </ThemedText>
        )}
        <ThemedText style={[styles.sep, { color: palette.textMuted }]}>·</ThemedText>
        <ThemedText style={[styles.label, { color: palette.textInverse }]}>
          {goalInfo.isCallahan ? 'CALLAHAN' : 'GOAL'}
        </ThemedText>
      </View>
    );
  }

  return <ThemedText style={[styles.bold, { color: palette.danger }]}>OPP GOAL</ThemedText>;
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 1,
    },
    bold: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(14, sizeClass),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      flexShrink: 1,
    },
    label: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(13, sizeClass),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      flexShrink: 1,
    },
    sep: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(13, sizeClass),
    },
  });
}
