import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { useTimestampTimer } from '@/hooks/advancedTracking/useTimer';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { MIN_HALFTIME_BREAK_SECONDS } from '@/lib/constants';
import { formatTimerSeconds } from '@/lib/utils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';

const TIMER_MAX_WIDTH: Record<SizeClass, number> = { small: 340, medium: 560, large: 760 };

/**
 * Halftime countdown with its own ticking state. Isolated from the surrounding halftime
 * display so the one-second interval re-renders only this subtree.
 */
export const HalftimeTimer = () => {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(sizeClass, isLandscape);

  const {
    adjustHalftimeTimer,
    halftimeTimerDurationSeconds,
    halftimeTimerStartedAt,
    pauseHalftimeTimer,
    startHalftimeTimer,
  } = useAdvancedTrackingStore();

  const timeLeft = useTimestampTimer({
    timestamp: halftimeTimerStartedAt,
    mode: 'countdown',
    durationSeconds: halftimeTimerDurationSeconds,
    intervalMs: 1000,
    enabled: halftimeTimerStartedAt !== null,
    allowNegative: true,
  });
  const timerIsRunning = halftimeTimerStartedAt !== null;
  const isOvertime = timeLeft < 0;

  let timerColor = palette.textInverse;
  if (isOvertime) {
    timerColor = palette.danger;
  } else if (timeLeft === 0) {
    timerColor = palette.success;
  }

  const handleToggleTimer = () => {
    if (halftimeTimerStartedAt === null) {
      startHalftimeTimer();
      return;
    }

    pauseHalftimeTimer(timeLeft);
  };
  const handleAdjustTimer = (deltaMinutes: number) => {
    adjustHalftimeTimer(timeLeft, deltaMinutes);
  };

  return (
    <View style={styles.timerBlock}>
      <View style={styles.iconRow}>
        <ThemedText style={[styles.label, { color: palette.accent }]}>HALFTIME</ThemedText>
      </View>

      <View style={[styles.timerRow, { backgroundColor: palette.overlay05 }]}>
        <Pressable
          onPress={() => handleAdjustTimer(-1)}
          disabled={timeLeft <= MIN_HALFTIME_BREAK_SECONDS}
          style={styles.timerButton}
          hitSlop={8}>
          <MaterialCommunityIcons
            name="minus"
            size={scaleBySizeClass(18, sizeClass)}
            color={timeLeft <= MIN_HALFTIME_BREAK_SECONDS ? palette.textMuted : palette.textInverse}
          />
        </Pressable>

        <Pressable
          testID="halftime-between-point-timer-toggle"
          onPress={handleToggleTimer}
          style={styles.timerDisplay}>
          <ThemedText style={[styles.timerValue, { color: timerColor }]}>
            {formatTimerSeconds(timeLeft)}
          </ThemedText>
          <ThemedText style={[styles.timerState, { color: palette.textMuted }]}>
            {timerIsRunning ? 'PAUSE' : 'START'}
          </ThemedText>
        </Pressable>

        <Pressable onPress={() => handleAdjustTimer(1)} style={styles.timerButton} hitSlop={8}>
          <MaterialCommunityIcons
            name="plus"
            size={scaleBySizeClass(18, sizeClass)}
            color={palette.textInverse}
          />
        </Pressable>
      </View>
    </View>
  );
};

function createStyles(sizeClass: SizeClass, isLandscape: boolean) {
  const densitySizeClass = isLandscape ? 'small' : sizeClass;

  return StyleSheet.create({
    timerBlock: {
      alignItems: 'center',
      gap: scaleBySizeClass(isLandscape ? 6 : 13, densitySizeClass),
      maxWidth: getSizeClassValue(TIMER_MAX_WIDTH, sizeClass),
      width: '100%',
    },
    iconRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: scaleBySizeClass(8, densitySizeClass),
      justifyContent: 'center',
    },
    label: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(20, densitySizeClass),
      letterSpacing: 3,
    },
    timerRow: {
      alignItems: 'center',
      borderRadius: scaleBySizeClass(8, densitySizeClass),
      borderCurve: 'continuous',
      flexDirection: 'row',
      justifyContent: 'space-between',
      maxWidth: scaleBySizeClass(320, densitySizeClass),
      minHeight: scaleBySizeClass(86, densitySizeClass),
      paddingHorizontal: scaleBySizeClass(8, densitySizeClass),
      width: '100%',
    },
    timerButton: {
      alignItems: 'center',
      height: scaleBySizeClass(48, densitySizeClass),
      justifyContent: 'center',
      width: scaleBySizeClass(48, densitySizeClass),
    },
    timerDisplay: {
      alignItems: 'center',
      flex: 1,
      gap: scaleBySizeClass(2, densitySizeClass),
      justifyContent: 'center',
    },
    timerValue: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(42, densitySizeClass),
      fontVariant: ['tabular-nums'],
      letterSpacing: 0,
    },
    timerState: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(10, densitySizeClass),
      letterSpacing: 1.5,
    },
  });
}
