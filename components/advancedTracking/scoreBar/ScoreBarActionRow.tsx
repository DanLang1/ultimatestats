import { ThemedText } from '@/components/ThemedText';
import { TimeoutButton } from '@/components/advancedTracking/scoreBar/TimeoutButton';
import { useScoreBarData } from '@/components/advancedTracking/scoreBar/useScoreBarData';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface ScoreBarActionRowProps {
  width: number;
}

export const ScoreBarActionRow = ({ width }: ScoreBarActionRowProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const data = useScoreBarData();

  if (!data) return null;

  // ... (rest of the destructuring)
  const {
    focusSideId,
    oppSideId,
    focusSideName,
    focusTimeouts,
    oppSideName,
    oppTimeouts,
    ratioLabel,
    currentPointNumber,
    stoppageActive,
    handleTimeout,
  } = data;

  return (
    <View style={[styles.container, { width }]}>
      <TimeoutButton
        testID="timeout-button-home"
        label={`${focusSideName} TO`}
        state={focusTimeouts}
        color={palette.accent}
        onPress={() => handleTimeout(focusSideId)}
        stoppageActive={stoppageActive}
      />

      <View
        style={[
          styles.actionCenter,
          { borderLeftWidth: 1, borderLeftColor: palette.border },
          { borderRightWidth: 1, borderRightColor: palette.border },
        ]}>
        <MaterialCommunityIcons
          name="flag-outline"
          size={scaleBySizeClass(22, sizeClass)}
          color={palette.textMuted}
        />
        <ThemedText style={[styles.centerLabel, { color: palette.textInverse }]}>
          {ratioLabel
            ? `${ratioLabel} · Point ${currentPointNumber}`
            : `Point ${currentPointNumber}`}
        </ThemedText>
      </View>

      <TimeoutButton
        testID="timeout-button-away"
        label={`${oppSideName} TO`}
        state={oppTimeouts}
        color={palette.success}
        onPress={() => handleTimeout(oppSideId)}
        stoppageActive={stoppageActive}
      />
    </View>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      minHeight: 96,
    },
    actionCenter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 14,
    },
    centerLabel: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: 0.5,
      textAlign: 'center',
    },
  });
}
