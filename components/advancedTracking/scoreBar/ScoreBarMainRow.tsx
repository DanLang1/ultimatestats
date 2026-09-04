import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { PointTimerText } from '@/components/advancedTracking/scoreBar/PointTimerText';
import { RedZoneButton } from '@/components/advancedTracking/scoreBar/RedZoneButton';
import { TeamScoreBlock } from '@/components/advancedTracking/scoreBar/TeamScoreBlock';
import { useScoreBarData } from '@/components/advancedTracking/scoreBar/useScoreBarData';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface ScoreBarMainRowProps {
  width: number;
  onToggleExpanded: () => void;
  pointTimerAdjustedTimestamp: number | null;
  pointTimerPausedAt: number | null;
  hideRedZoneControl: boolean;
}

export const ScoreBarMainRow = ({
  width,
  onToggleExpanded,
  pointTimerAdjustedTimestamp,
  pointTimerPausedAt,
  hideRedZoneControl,
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
    activeSideName,
    canToggleRedZone,
    redZoneSelected,
    handleRedZoneToggle,
  } = data;
  const showRedZoneControl = canToggleRedZone && !hideRedZoneControl;

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
          <PointTimerText
            pointTimerAdjustedTimestamp={pointTimerAdjustedTimestamp}
            pointTimerPausedAt={pointTimerPausedAt}
            showPointTimer={showPointTimer}
            pointIsOver={pointIsOver}
            isPointTimerPaused={isPointTimerPaused}
            style={[styles.centerTimer, { color: palette.textInverse }]}
          />
        </View>
        {isPointTimerPaused && (
          <ThemedText style={[styles.pausedText, { color: palette.warning }]}>paused</ThemedText>
        )}
        {showRedZoneControl && (
          <RedZoneButton
            activeSideName={activeSideName}
            selected={redZoneSelected}
            onPress={handleRedZoneToggle}
          />
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
      gap: scaleBySizeClass(8, sizeClass),
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
