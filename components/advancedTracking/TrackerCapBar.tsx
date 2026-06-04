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
  /** Compact layout for landscape side panel. */
  compact: boolean;
  onMenuPress: () => void;
  game: AdvancedTrackedGame;
}

export const TrackerCapBar = ({ compact, onMenuPress, game }: TrackerCapBarProps) => {
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
  const styles = createStyles(sizeClass, compact);
  const capFillColor = capIsWarning ? palette.danger : palette.accent;
  const capTextColor = capIsWarning ? palette.danger : palette.textMuted;

  return (
    <View style={styles.container}>
      <Pressable
        testID="tracker-menu-button"
        onPress={onMenuPress}
        hitSlop={12}
        style={[styles.menuBtn, compact && styles.menuBtnCompact]}>
        <MaterialCommunityIcons
          name="menu"
          size={scaleBySizeClass(compact ? 24 : 28, sizeClass)}
          color={palette.textInverse}
        />
      </Pressable>
      <View style={compact ? styles.centerCompact : styles.center}>
        {compact ? (
          <ThemedText style={[styles.labelCompact, { color: capTextColor }]} numberOfLines={1}>
            {capDisplayLabel}
          </ThemedText>
        ) : (
          <View style={styles.labelRow}>
            <ThemedText style={[styles.label, { color: capTextColor }]}>
              {capDisplayLabel}
            </ThemedText>
            <ThemedText style={[styles.timeLeft, { color: capTextColor }]}>
              {gameStartedAt !== null ? `${formatPointTime(capTimeLeftMs)} left` : '—'}
            </ThemedText>
          </View>
        )}
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

function createStyles(sizeClass: SizeClass, compact: boolean) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: compact ? 'center' : 'flex-start',
      paddingLeft: compact ? 12 : 0,
      paddingTop: compact ? 2 : 6,
      paddingHorizontal: compact ? 0 : 14,
      paddingBottom: 4,
      gap: compact ? 6 : 10,
    },
    menuBtn: {
      minWidth: 30,
      minHeight: 30,
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: compact ? 4 : 2,
      paddingRight: 8,
    },
    menuBtnCompact: {
      minWidth: 30,
      minHeight: 30,
    },
    center: {
      flex: 1,
    },
    centerCompact: {
      flex: 1,
      minWidth: 0,
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
    labelCompact: {
      fontSize: scaleBySizeClass(8, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 1,
      marginBottom: 2,
    },
    timeLeft: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.black,
    },
    barTrack: {
      borderRadius: 999,
      overflow: 'hidden',
      height: compact ? 4 : 5,
    },
    barFill: {
      height: '100%',
      borderRadius: 999,
    },
  });
}
