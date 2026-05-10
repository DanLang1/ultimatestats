import { ThemedText } from '@/components/ThemedText';
import { TeamScoreBlock } from '@/components/advancedTracking/scoreBar/TeamScoreBlock';
import { useScoreBarData } from '@/components/advancedTracking/scoreBar/useScoreBarData';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatPointTime } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface ScoreBarMainRowProps {
  width: number;
  pointElapsedMs: number;
  onToggleExpanded: () => void;
}

export const ScoreBarMainRow = ({
  width,
  pointElapsedMs,
  onToggleExpanded,
}: ScoreBarMainRowProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const data = useScoreBarData();

  if (!data) return null;

  // ... (rest of the destructuring)
  const {
    focusSideName,
    focusScore,
    focusTimeouts,
    oppSideName,
    oppScore,
    oppTimeouts,
    showPointTimer,
    isPointTimerPaused,
    pointIsOver,
    handlePause,
  } = data;

  return (
    <View style={[styles.container, { width }]}>
      <TeamScoreBlock
        name={focusSideName}
        score={focusScore}
        timeouts={focusTimeouts}
        color={palette.accent}
        onTimeoutDotsPress={onToggleExpanded}
        timeoutDotsTestID="timeout-dots-focus"
      />

      <View style={[styles.centerCard, { backgroundColor: palette.primary }]}>
        <View style={styles.centerTimerRow}>
          {showPointTimer && !isPointTimerPaused && (
            <Pressable testID="scorebar-pause" onPress={handlePause} hitSlop={8}>
              <MaterialCommunityIcons
                name="pause"
                size={scaleBySizeClass(16, sizeClass)}
                color={palette.textMuted}
              />
            </Pressable>
          )}
          <ThemedText style={[styles.centerTimer, { color: palette.textInverse }]}>
            {showPointTimer || pointIsOver ? formatPointTime(pointElapsedMs) : '–:––'}
          </ThemedText>
        </View>
        {isPointTimerPaused && (
          <ThemedText style={[styles.pausedText, { color: palette.warning }]}>paused</ThemedText>
        )}
      </View>

      <TeamScoreBlock
        name={oppSideName}
        score={oppScore}
        timeouts={oppTimeouts}
        color={palette.success}
        onTimeoutDotsPress={onToggleExpanded}
        timeoutDotsTestID="timeout-dots-opp"
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
    centerCard: {
      width: scaleBySizeClass(106, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    centerTimerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    centerTimer: {
      fontSize: scaleBySizeClass(21, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 0,
      fontVariant: ['tabular-nums'],
      lineHeight: scaleBySizeClass(24, sizeClass),
    },
    pausedText: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
  });
}
