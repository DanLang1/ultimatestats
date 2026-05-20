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
    gameTo,
    stoppageActive,
    handleTimeout,
  } = data;
  const pointLabel = getPointLabel(ratioLabel, gameTo);

  return (
    <View style={[styles.container, { width }]}>
      <View
        style={[
          styles.contextPanel,
          { backgroundColor: palette.cardBgAlt, borderColor: palette.borderLight },
        ]}>
        <View style={[styles.contextIcon, { backgroundColor: palette.primary }]}>
          <MaterialCommunityIcons
            name="flag-outline"
            size={scaleBySizeClass(17, sizeClass)}
            color={palette.textMuted}
          />
        </View>
        <View style={styles.contextText}>
          <ThemedText style={[styles.contextEyebrow, { color: palette.textMuted }]}>
            POINT INFO
          </ThemedText>
          <ThemedText
            style={[styles.centerLabel, { color: palette.textInverse }]}
            numberOfLines={1}>
            {pointLabel}
          </ThemedText>
        </View>
      </View>

      <View style={styles.timeoutRow}>
        <TimeoutButton
          testID="timeout-button-home"
          teamName={focusSideName}
          state={focusTimeouts}
          color={palette.accent}
          onPress={() => handleTimeout(focusSideId)}
          stoppageActive={stoppageActive}
        />

        <TimeoutButton
          testID="timeout-button-away"
          teamName={oppSideName}
          state={oppTimeouts}
          color={palette.success}
          onPress={() => handleTimeout(oppSideId)}
          stoppageActive={stoppageActive}
        />
      </View>
    </View>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
      gap: 8,
      minHeight: 116,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 10,
    },
    contextPanel: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderRadius: 16,
      borderCurve: 'continuous',
    },
    contextIcon: {
      width: scaleBySizeClass(32, sizeClass),
      height: scaleBySizeClass(32, sizeClass),
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contextText: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    contextEyebrow: {
      fontSize: scaleBySizeClass(8, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 1.2,
    },
    timeoutRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 10,
    },
    centerLabel: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.extraBold,
      letterSpacing: 0,
    },
  });
}

function getPointLabel(ratioLabel: string | null, gameTo: number) {
  const gameToLabel = `Game to ${gameTo}`;

  if (ratioLabel) {
    return `${ratioLabel} · ${gameToLabel}`;
  }

  return gameToLabel;
}
