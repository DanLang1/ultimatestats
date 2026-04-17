import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useTimestampTimer } from '@/hooks/advancedTracking/useTimer';
import {
  GoalInfo,
  PassChainEvent,
  TurnoverEventInfo,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import { Fonts, Palette } from '@/theme/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TrackerPassChain } from './TrackerPassChain';

const TIMEOUT_DURATION_S = 70;

interface TrackerStatusBarProps {
  pointIsOver: boolean;
  goalInfo: GoalInfo | null;
  stoppageActive: boolean;
  stoppageStartedAt: number | null;
  passChainEvents: { events: PassChainEvent[]; truncated: boolean };
  turnoverEvent: TurnoverEventInfo | null;
  isLandscape?: boolean;
}

export const TrackerStatusBar = ({
  pointIsOver,
  goalInfo,
  stoppageActive,
  stoppageStartedAt,
  passChainEvents,
  turnoverEvent,
  isLandscape = false,
}: TrackerStatusBarProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass, isLandscape, palette);

  const secondsLeft = useTimestampTimer({
    timestamp: stoppageStartedAt,
    mode: 'countdown',
    durationSeconds: TIMEOUT_DURATION_S,
    intervalMs: 250,
    enabled: stoppageActive,
  });

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const timerColor =
    secondsLeft <= 10 ? palette.danger : secondsLeft <= 20 ? palette.warning : palette.success;

  const scorerLabel = goalInfo?.isCallahan ? 'CALLAHAN' : 'GOAL';

  return (
    <View style={styles.statusBar}>
      {stoppageActive ? (
        <View
          style={[
            styles.timeoutBanner,
            { backgroundColor: palette.overlay05, borderColor: palette.overlay15 },
          ]}>
          <ThemedText style={[styles.timeoutLabel, { color: palette.textMuted }]}>
            TIMEOUT
          </ThemedText>
          <ThemedText style={[styles.timeoutTimer, { color: timerColor }]}>
            {formatTime(secondsLeft)}
          </ThemedText>
        </View>
      ) : pointIsOver ? (
        goalInfo?.isFocusGoal ? (
          <View style={styles.goalChain}>
            {goalInfo.assisterName && (
              <>
                <View style={[styles.goalChip, { backgroundColor: palette.success }]}>
                  <ThemedText
                    numberOfLines={1}
                    style={[styles.goalChipName, { color: palette.textOnAccent }]}>
                    {goalInfo.assisterName}
                  </ThemedText>
                  <ThemedText style={[styles.goalChipSep, { color: palette.textOnAccentMuted }]}>
                    ·
                  </ThemedText>
                  <ThemedText style={[styles.goalChipLabel, { color: palette.textOnAccentMuted }]}>
                    ASSIST
                  </ThemedText>
                </View>
                <ThemedText style={[styles.goalArrow, { color: palette.textMuted }]}>+</ThemedText>
              </>
            )}
            <View style={[styles.goalChip, { backgroundColor: palette.success }]}>
              {goalInfo.scorerName && (
                <>
                  <ThemedText
                    numberOfLines={1}
                    style={[styles.goalChipName, { color: palette.textOnAccent }]}>
                    {goalInfo.scorerName}
                  </ThemedText>
                  <ThemedText style={[styles.goalChipSep, { color: palette.textOnAccentMuted }]}>
                    ·
                  </ThemedText>
                </>
              )}
              <ThemedText
                style={[
                  styles.goalChipLabel,
                  { color: goalInfo.scorerName ? palette.textOnAccentMuted : palette.textOnAccent },
                ]}>
                {scorerLabel}
              </ThemedText>
            </View>
          </View>
        ) : (
          <ThemedText style={[styles.passChainText, { color: palette.danger }]}>
            {goalInfo ? 'OPP SCORED' : 'POINT OVER'}
          </ThemedText>
        )
      ) : turnoverEvent || passChainEvents.events.length > 0 ? (
        <TrackerPassChain
          events={passChainEvents.events}
          truncated={passChainEvents.truncated}
          turnoverEvent={turnoverEvent}
          isLandscape={isLandscape}
        />
      ) : null}
    </View>
  );
};

function createStyles(sizeClass: SizeClass, isLandscape: boolean, palette: Palette) {
  const chipFontSize = scaleBySizeClass(isLandscape ? 11 : 12, sizeClass);
  const chipLineHeight = isLandscape ? 14 : 15;

  return StyleSheet.create({
    statusBar: {
      minHeight: isLandscape ? 40 : 64,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: isLandscape ? 12 : 24,
      paddingVertical: isLandscape ? 4 : 8,
    },
    passChainText: {
      fontSize: scaleBySizeClass(isLandscape ? 11 : 14, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    goalChain: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    goalChip: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      minWidth: 0,
      gap: 3,
      paddingHorizontal: isLandscape ? 6 : 8,
      paddingVertical: isLandscape ? 3 : 5,
      borderRadius: 16,
      borderCurve: 'continuous',
    },
    goalChipName: {
      flexShrink: 1,
      fontSize: chipFontSize,
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      lineHeight: chipLineHeight,
    },
    goalChipSep: {
      flexShrink: 0,
      fontSize: scaleBySizeClass(isLandscape ? 10 : 11, sizeClass),
      fontFamily: Fonts.bold,
      lineHeight: chipLineHeight,
    },
    goalChipLabel: {
      flexShrink: 0,
      fontSize: scaleBySizeClass(isLandscape ? 10 : 11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      lineHeight: chipLineHeight,
    },
    goalArrow: {
      flexShrink: 0,
      fontSize: chipFontSize,
      fontFamily: Fonts.black,
      marginHorizontal: 2,
    },
    timeoutBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isLandscape ? 8 : 16,
      paddingHorizontal: isLandscape ? 12 : 24,
      paddingVertical: isLandscape ? 6 : 10,
      borderRadius: 20,
      borderCurve: 'continuous',
      borderWidth: 1,
    },
    timeoutLabel: {
      fontSize: scaleBySizeClass(isLandscape ? 10 : 12, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 2,
    },
    timeoutTimer: {
      fontSize: scaleBySizeClass(isLandscape ? 18 : 28, sizeClass),
      fontFamily: Fonts.black,
      fontVariant: ['tabular-nums'],
      letterSpacing: 1,
    },
  });
}
