import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { useTimestampTimer } from '@/hooks/advancedTracking/useTimer';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { computeAdvancedPlayerStats } from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import { computeAdvancedTeamStats } from '@/lib/advancedTracking/advancedTeamStatsUtils';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import { getSideScore } from '@/lib/advancedTracking/trackingUtils';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { MIN_HALFTIME_BREAK_SECONDS } from '@/lib/constants';
import { formatTimerSeconds } from '@/lib/utils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface HalftimeBetweenPointDisplayProps {
  game: AdvancedTrackedGame;
  onStartNextPoint: () => void;
}

const TIMER_MAX_WIDTH: Record<SizeClass, number> = { small: 340, medium: 560, large: 760 };
const STATS_MAX_WIDTH: Record<SizeClass, number> = { small: 340, medium: 560, large: 760 };
const ACTION_ROW_MAX_WIDTH: Record<SizeClass, number> = { small: 340, medium: 560, large: 760 };

export const HalftimeBetweenPointDisplay = ({
  game,
  onStartNextPoint,
}: HalftimeBetweenPointDisplayProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const {
    adjustHalftimeTimer,
    halftimeTimerDurationSeconds,
    halftimeTimerStartedAt,
    pauseHalftimeTimer,
    startHalftimeTimer,
    undoLastOperation,
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

  const focusSide = game.sides.find((side) => side.id === game.focusSideId);
  const oppSide = game.sides.find((side) => side.id !== game.focusSideId);
  const focusScore = getSideScore(game, game.focusSideId);
  const oppScore = oppSide ? getSideScore(game, oppSide.id) : 0;
  const analyticsGame = buildAnalyticsGame(game);
  const teamStats = computeAdvancedTeamStats(analyticsGame, game.focusSideId);
  const playerStats = computeAdvancedPlayerStats(analyticsGame, game.focusSideId);
  const topPerformers = [...playerStats]
    .sort((a, b) => b.plusMinus - a.plusMinus)
    .slice(0, 3)
    .map((player) => ({
      participantId: player.participantId,
      name:
        game.participants.find((participant) => participant.id === player.participantId)?.name ??
        player.participantId,
      plusMinus: player.plusMinus,
    }));

  let timerColor = palette.textInverse;
  if (isOvertime) {
    timerColor = palette.danger;
  } else if (timeLeft === 0) {
    timerColor = palette.success;
  }

  const handleStartSecondHalf = () => {
    onStartNextPoint();
  };
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
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.timerBlock}>
          <View style={styles.iconRow}>
            <ThemedText style={[styles.label, { color: palette.accent }]}>HALFTIME</ThemedText>
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.scoreGroup}>
              <ThemedText
                style={[styles.teamLabel, { color: palette.textMuted }]}
                numberOfLines={1}>
                {focusSide?.label ?? 'Us'}
              </ThemedText>
              <ThemedText style={[styles.score, { color: palette.textInverse }]}>
                {focusScore}
              </ThemedText>
            </View>
            <ThemedText style={[styles.scoreDivider, { color: palette.textMuted }]}>-</ThemedText>
            <View style={styles.scoreGroup}>
              <ThemedText
                style={[styles.teamLabel, { color: palette.textMuted }]}
                numberOfLines={1}>
                {oppSide?.label ?? 'Opponent'}
              </ThemedText>
              <ThemedText style={[styles.score, { color: palette.textInverse }]}>
                {oppScore}
              </ThemedText>
            </View>
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
                color={
                  timeLeft <= MIN_HALFTIME_BREAK_SECONDS ? palette.textMuted : palette.textInverse
                }
              />
            </Pressable>

            <Pressable onPress={handleToggleTimer} style={styles.timerDisplay}>
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

          <View style={styles.statsSection}>
            <View style={styles.statCardRow}>
              <View style={[styles.statCard, { backgroundColor: palette.accentOverlay10 }]}>
                <ThemedText style={[styles.statValue, { color: palette.textInverse }]}>
                  {teamStats.holds}/{teamStats.oPoints}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.textMuted }]}>
                  HOLD
                </ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: palette.successOverlay10 }]}>
                <ThemedText style={[styles.statValue, { color: palette.textInverse }]}>
                  {teamStats.breaks}/{teamStats.dPoints}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.textMuted }]}>
                  BREAK
                </ThemedText>
              </View>
            </View>

            <View style={styles.performersList}>
              {topPerformers.map((performer, index) => (
                <View
                  key={performer.participantId}
                  style={[styles.performerRow, { backgroundColor: palette.overlay05 }]}>
                  <ThemedText style={[styles.performerRank, { color: palette.accent }]}>
                    {index + 1}
                  </ThemedText>
                  <ThemedText
                    style={[styles.performerName, { color: palette.textInverse }]}
                    numberOfLines={1}>
                    {performer.name}
                  </ThemedText>
                  <View
                    style={[
                      styles.performerBadge,
                      {
                        backgroundColor:
                          performer.plusMinus >= 0
                            ? palette.successOverlay10
                            : palette.dangerOverlay10,
                      },
                    ]}>
                    <ThemedText
                      style={[
                        styles.performerStat,
                        { color: performer.plusMinus >= 0 ? palette.success : palette.danger },
                      ]}>
                      {performer.plusMinus > 0 ? '+' : ''}
                      {performer.plusMinus}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.bottomActions}>
        <View style={styles.buttonRow}>
          <Pressable
            testID="halftime-between-point-undo"
            style={({ pressed }) => [
              styles.iconButton,
              { borderColor: palette.overlay20, backgroundColor: palette.overlay05 },
              pressed && { opacity: 0.7 },
            ]}
            onPress={undoLastOperation}>
            <MaterialCommunityIcons
              name="undo"
              size={scaleBySizeClass(22, sizeClass)}
              color={palette.textInverse}
            />
          </Pressable>
          <Pressable
            testID="halftime-between-point-start-next"
            style={({ pressed }) => [
              styles.actionButton,
              { borderColor: palette.accent, backgroundColor: palette.accentOverlay10 },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleStartSecondHalf}>
            <ThemedText style={[styles.actionButtonText, { color: palette.accent }]}>
              START SECOND HALF
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'space-between' },
    content: {
      alignItems: 'center',
      flex: 1,
      paddingHorizontal: scaleBySizeClass(24, sizeClass),
      paddingTop: scaleBySizeClass(24, sizeClass),
      width: '100%',
    },
    timerBlock: {
      alignItems: 'center',
      gap: scaleBySizeClass(13, sizeClass),
      maxWidth: getSizeClassValue(TIMER_MAX_WIDTH, sizeClass),
      width: '100%',
    },
    iconRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: scaleBySizeClass(8, sizeClass),
      justifyContent: 'center',
    },
    label: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(20, sizeClass),
      letterSpacing: 3,
    },
    scoreRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: scaleBySizeClass(14, sizeClass),
      justifyContent: 'center',
      width: '100%',
    },
    scoreGroup: {
      alignItems: 'center',
      flex: 1,
      gap: scaleBySizeClass(2, sizeClass),
      maxWidth: scaleBySizeClass(150, sizeClass),
    },
    teamLabel: {
      fontFamily: Fonts.extraBold,
      fontSize: scaleBySizeClass(11, sizeClass),
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    score: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(46, sizeClass),
      fontVariant: ['tabular-nums'],
    },
    scoreDivider: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(32, sizeClass),
    },
    timerRow: {
      alignItems: 'center',
      borderRadius: scaleBySizeClass(8, sizeClass),
      borderCurve: 'continuous',
      flexDirection: 'row',
      justifyContent: 'space-between',
      maxWidth: scaleBySizeClass(320, sizeClass),
      minHeight: scaleBySizeClass(86, sizeClass),
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
      width: '100%',
    },
    statsSection: {
      gap: scaleBySizeClass(10, sizeClass),
      maxWidth: getSizeClassValue(STATS_MAX_WIDTH, sizeClass),
      width: '100%',
    },
    statCardRow: {
      flexDirection: 'row',
      gap: scaleBySizeClass(10, sizeClass),
      width: '100%',
    },
    statCard: {
      alignItems: 'center',
      borderRadius: scaleBySizeClass(8, sizeClass),
      borderCurve: 'continuous',
      flex: 1,
      gap: scaleBySizeClass(3, sizeClass),
      justifyContent: 'center',
      minHeight: scaleBySizeClass(58, sizeClass),
    },
    statValue: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(21, sizeClass),
      fontVariant: ['tabular-nums'],
      letterSpacing: 0,
    },
    statLabel: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(10, sizeClass),
      letterSpacing: 1.2,
    },
    performersList: {
      gap: scaleBySizeClass(6, sizeClass),
      width: '100%',
    },
    performerRow: {
      alignItems: 'center',
      borderRadius: scaleBySizeClass(8, sizeClass),
      borderCurve: 'continuous',
      flexDirection: 'row',
      gap: scaleBySizeClass(10, sizeClass),
      minHeight: scaleBySizeClass(38, sizeClass),
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
    },
    performerRank: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(13, sizeClass),
      width: scaleBySizeClass(18, sizeClass),
    },
    performerName: {
      flex: 1,
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(13, sizeClass),
    },
    performerBadge: {
      alignItems: 'center',
      borderRadius: scaleBySizeClass(6, sizeClass),
      minWidth: scaleBySizeClass(44, sizeClass),
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
      paddingVertical: scaleBySizeClass(4, sizeClass),
    },
    performerStat: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(12, sizeClass),
      fontVariant: ['tabular-nums'],
      letterSpacing: 0,
    },
    timerButton: {
      alignItems: 'center',
      height: scaleBySizeClass(48, sizeClass),
      justifyContent: 'center',
      width: scaleBySizeClass(48, sizeClass),
    },
    timerDisplay: {
      alignItems: 'center',
      flex: 1,
      gap: scaleBySizeClass(2, sizeClass),
      justifyContent: 'center',
    },
    timerValue: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(42, sizeClass),
      fontVariant: ['tabular-nums'],
      letterSpacing: 0,
    },
    timerState: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(10, sizeClass),
      letterSpacing: 1.5,
    },
    bottomActions: {
      alignItems: 'center',
      paddingBottom: scaleBySizeClass(12, sizeClass),
      paddingHorizontal: scaleBySizeClass(24, sizeClass),
      width: '100%',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: scaleBySizeClass(12, sizeClass),
      maxWidth: getSizeClassValue(ACTION_ROW_MAX_WIDTH, sizeClass),
      width: '100%',
    },
    iconButton: {
      alignItems: 'center',
      borderRadius: scaleBySizeClass(8, sizeClass),
      borderWidth: 1,
      height: scaleBySizeClass(54, sizeClass),
      justifyContent: 'center',
      width: scaleBySizeClass(58, sizeClass),
    },
    actionButton: {
      alignItems: 'center',
      borderRadius: scaleBySizeClass(8, sizeClass),
      borderWidth: 1,
      flex: 1,
      height: scaleBySizeClass(54, sizeClass),
      justifyContent: 'center',
    },
    actionButtonText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(13, sizeClass),
      letterSpacing: 1,
    },
  });
}
