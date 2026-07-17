import React from 'react';
import { StyleSheet, View } from 'react-native';

import { TimeoutButton } from '@/components/advancedTracking/scoreBar/TimeoutButton';
import { useScoreBarData } from '@/components/advancedTracking/scoreBar/useScoreBarData';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';

interface ScoreBarActionRowProps {
  width: number;
}

const CENTER_CARD_WIDTH: Record<SizeClass, number> = { small: 106, medium: 150, large: 190 };
const RATIO_FONT_SIZE: Record<SizeClass, number> = { small: 12, medium: 15, large: 18 };
const GAME_TO_FONT_SIZE: Record<SizeClass, number> = { small: 14, medium: 18, large: 22 };
const ROW_GAP: Record<SizeClass, number> = { small: 6, medium: 10, large: 14 };
const ROW_HORIZONTAL_PADDING: Record<SizeClass, number> = { small: 12, medium: 18, large: 24 };
const ROW_VERTICAL_PADDING: Record<SizeClass, number> = { small: 10, medium: 14, large: 18 };

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
      gap: getSizeClassValue(ROW_GAP, sizeClass),
      paddingHorizontal: getSizeClassValue(ROW_HORIZONTAL_PADDING, sizeClass),
      paddingTop: getSizeClassValue(ROW_VERTICAL_PADDING, sizeClass),
      paddingBottom: getSizeClassValue(ROW_VERTICAL_PADDING, sizeClass),
    },
    centerInfoCard: {
      width: getSizeClassValue(CENTER_CARD_WIDTH, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
      gap: scaleBySizeClass(6, sizeClass),
      paddingHorizontal: 2,
    },
    ratioChip: {
      paddingHorizontal: scaleBySizeClass(10, sizeClass),
      paddingVertical: scaleBySizeClass(4, sizeClass),
      borderRadius: 8,
      borderWidth: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
      borderCurve: 'continuous',
    },
    ratioText: {
      fontSize: getSizeClassValue(RATIO_FONT_SIZE, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 0.5,
    },
    gameToText: {
      fontSize: getSizeClassValue(GAME_TO_FONT_SIZE, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 0.2,
      textAlign: 'center',
    },
  });
}
