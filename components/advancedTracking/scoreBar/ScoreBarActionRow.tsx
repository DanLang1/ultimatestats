import { ThemedText } from '@/components/ThemedText';
import { TimeoutButton } from '@/components/advancedTracking/scoreBar/TimeoutButton';
import { useScoreBarData } from '@/components/advancedTracking/scoreBar/useScoreBarData';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';
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
  const { mmpColor, fmpColor } = useSettingsStore();

  if (!data) return null;

  const {
    focusSideId,
    oppSideId,
    focusSideName,
    focusTimeouts,
    oppSideName,
    oppTimeouts,
    ratioLabel,
    gameTo,
    stoppageActive,
    handleTimeout,
  } = data;

  const isFmp = ratioLabel?.startsWith('F');
  const isMmp = ratioLabel?.startsWith('M');
  let ratioColor = palette.border;
  if (isFmp) {
    ratioColor = fmpColor;
  } else if (isMmp) {
    ratioColor = mmpColor;
  }

  return (
    <View style={[styles.container, { width }]}>
      <TimeoutButton
        testID="timeout-button-home"
        teamName={focusSideName}
        state={focusTimeouts}
        color={palette.accent}
        onPress={() => handleTimeout(focusSideId)}
        stoppageActive={stoppageActive}
      />

      <View style={styles.centerInfoCard}>
        {ratioLabel && (
          <View
            style={[
              styles.ratioChip,
              { backgroundColor: ratioColor + '15', borderColor: ratioColor },
            ]}>
            <ThemedText style={[styles.ratioText, { color: ratioColor }]}>{ratioLabel}</ThemedText>
          </View>
        )}
        <ThemedText style={[styles.gameToText, { color: palette.textInverse }]} numberOfLines={1}>
          {`Game to ${gameTo}`}
        </ThemedText>
      </View>

      <TimeoutButton
        testID="timeout-button-away"
        teamName={oppSideName}
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
      gap: 6,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 10,
    },
    centerInfoCard: {
      width: scaleBySizeClass(106, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 2,
    },
    ratioChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1.5,
      borderCurve: 'continuous',
    },
    ratioText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 0.5,
    },
    gameToText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 0.2,
      textAlign: 'center',
    },
  });
}
