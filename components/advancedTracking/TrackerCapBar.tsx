import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { useTimestampTimer } from '@/hooks/advancedTracking/useTimer';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { computeCapState } from '@/lib/advancedTracking/capUtils';
import {
  getActiveGameClockPause,
  getCompletedGameClockPauseMs,
  getGameClockElapsedMs,
  formatPointTime,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface TrackerCapBarProps {
  onMenuPress: () => void;
  game: AdvancedTrackedGame;
}

export const TrackerCapBar = ({ onMenuPress, game }: TrackerCapBarProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const activeGameClockPause = getActiveGameClockPause(game);
  const gameStartedAt = game.points[0]?.startedAt ?? null;
  const rawGameElapsedMs = useTimestampTimer({
    timestamp: gameStartedAt,
    mode: 'elapsed',
    intervalMs: 1000,
    enabled: gameStartedAt !== null && activeGameClockPause === null,
  });
  const completedGameClockPauseMs = getCompletedGameClockPauseMs(game);
  const gameElapsedMs =
    activeGameClockPause !== null
      ? getGameClockElapsedMs(game, Date.now())
      : Math.max(0, rawGameElapsedMs - completedGameClockPauseMs);
  const hardCapMins = useSettingsStore((state) => state.hardCapMins);
  const softCapMins = useSettingsStore((state) => state.softCapMins);
  const { capLabel, capProgress, capTimeLeftMs, capIsWarning } = computeCapState({
    gameElapsedMs,
    gameStarted: gameStartedAt !== null,
    gameLengthMinutes: hardCapMins,
    softCapMins,
  });
  const capDisplayLabel = activeGameClockPause !== null ? 'CAP PAUSED' : capLabel;
  const styles = createStyles(sizeClass);
  const capFillColor = capIsWarning ? palette.danger : palette.accent;
  const capTextColor = capIsWarning ? palette.danger : palette.textMuted;

  return (
    <View style={styles.container}>
      <Pressable
        testID="tracker-menu-button"
        onPress={onMenuPress}
        hitSlop={12}
        style={styles.menuBtn}>
        <MaterialCommunityIcons
          name="menu"
          size={scaleBySizeClass(28, sizeClass)}
          color={palette.textInverse}
        />
      </Pressable>
      <View style={styles.center}>
        <View style={styles.labelRow}>
          <ThemedText style={[styles.label, { color: capTextColor }]}>{capDisplayLabel}</ThemedText>
          <ThemedText style={[styles.timeLeft, { color: capTextColor }]}>
            {gameStartedAt !== null ? `${formatPointTime(capTimeLeftMs)} left` : '—'}
          </ThemedText>
        </View>
        <View style={[styles.barTrack, { backgroundColor: palette.overlay10 }]}>
          <View
            style={[
              styles.barFill,
              { width: `${capProgress * 100}%`, backgroundColor: capFillColor },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingTop: 6,
      paddingHorizontal: 14,
      paddingBottom: 4,
      gap: 10,
    },
    menuBtn: {
      minWidth: 30,
      minHeight: 30,
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: 2,
      paddingRight: 8,
    },
    center: {
      flex: 1,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    label: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 1.5,
    },
    timeLeft: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.black,
    },
    barTrack: {
      borderRadius: 999,
      overflow: 'hidden',
      height: 5,
    },
    barFill: {
      height: '100%',
      borderRadius: 999,
    },
  });
}
