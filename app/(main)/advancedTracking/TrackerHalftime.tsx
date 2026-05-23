import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { computeAdvancedPlayerStats } from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import { computeAdvancedTeamStats } from '@/lib/advancedTracking/advancedTeamStatsUtils';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import { getSideScore } from '@/lib/advancedTracking/trackingUtils';
import { useTimestampTimer } from '@/hooks/advancedTracking/useTimer';
import { formatTimerSeconds } from '@/lib/utils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

const HALFTIME_DEFAULT_SECONDS = 10 * 60;
const MIN_SECONDS = 0;
const MAX_SECONDS = 15 * 60;

export default function TrackerHalftimeScreen() {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();

  const {
    currentGame: game,
    isHalftimeBreakActive,
    clearHalftimeBreak,
    undoLastOperation,
  } = useAdvancedTrackingStore();

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [duration, setDuration] = useState(HALFTIME_DEFAULT_SECONDS);

  const isRunning = startedAt !== null;
  const timeLeft = useTimestampTimer({
    timestamp: startedAt,
    mode: 'countdown',
    durationSeconds: duration,
    intervalMs: 500,
  });
  const isComplete = timeLeft === 0;
  const isOvertime = isRunning && isComplete;

  if (!game) {
    return <Redirect href="/Dashboard" />;
  }

  if (!isHalftimeBreakActive) {
    return <Redirect href="/advancedTracking/Tracker" />;
  }

  const styles = createStyles(isLandscape, sizeClass);

  const focusSide = game.sides.find((s) => s.id === game.focusSideId);
  const oppSide = game.sides.find((s) => s.id !== game.focusSideId);
  const focusScore = getSideScore(game, game.focusSideId);
  const oppScore = oppSide ? getSideScore(game, oppSide.id) : 0;

  const analyticsGame = buildAnalyticsGame(game);
  const teamStats = computeAdvancedTeamStats(analyticsGame, game.focusSideId);
  const playerStats = computeAdvancedPlayerStats(analyticsGame, game.focusSideId);
  const sortedPlayers = [...playerStats].sort((a, b) => b.plusMinus - a.plusMinus);
  const topPerformers = sortedPlayers.slice(0, 3).map((p) => ({
    name: game.participants.find((part) => part.id === p.participantId)?.name ?? p.participantId,
    plusMinus: p.plusMinus,
  }));

  const hasStats = playerStats.length > 0;

  const toggleTimer = () => {
    if (!isRunning) {
      setStartedAt(Date.now());
    } else {
      setDuration(timeLeft);
      setStartedAt(null);
    }
  };

  const adjustTimer = (deltaMinutes: number) => {
    const newDuration = Math.max(MIN_SECONDS, Math.min(MAX_SECONDS, timeLeft + deltaMinutes * 60));
    setDuration(newDuration);
    if (isRunning) {
      setStartedAt(Date.now());
    }
  };

  const handleContinue = () => {
    clearHalftimeBreak();
  };

  const handleUndo = () => {
    undoLastOperation();
  };

  let timerValueColor: string;
  if (isOvertime) {
    timerValueColor = palette.danger;
  } else if (isComplete) {
    timerValueColor = palette.success;
  } else {
    timerValueColor = palette.textInverse;
  }

  return (
    <ThemedView style={[styles.screen, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader title="HALFTIME" titleColor={palette.textMuted} />

      <ScrollView
        contentContainerStyle={[styles.content, !hasStats && styles.contentCompact]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.row, !hasStats && styles.rowCompact]}>
          {/* Score + Timer */}
          <View style={[styles.leftColumn, !hasStats && styles.leftColumnCompact]}>
            <View style={styles.scoreRow}>
              <View style={styles.scoreGroup}>
                <ThemedText
                  style={[styles.teamLabel, { color: palette.textMuted }]}
                  numberOfLines={1}>
                  {focusSide?.label ?? 'US'}
                </ThemedText>
                <ThemedText style={[styles.scoreNumber, { color: palette.textInverse }]}>
                  {focusScore}
                </ThemedText>
              </View>
              <ThemedText style={[styles.scoreDivider, { color: palette.textMuted }]}>-</ThemedText>
              <View style={styles.scoreGroup}>
                <ThemedText
                  style={[styles.teamLabel, { color: palette.textMuted }]}
                  numberOfLines={1}>
                  {oppSide?.label ?? 'THEM'}
                </ThemedText>
                <ThemedText style={[styles.scoreNumber, { color: palette.textInverse }]}>
                  {oppScore}
                </ThemedText>
              </View>
            </View>

            <View style={[styles.timerRow, { backgroundColor: palette.overlay05 }]}>
              <Pressable
                onPress={() => adjustTimer(-1)}
                disabled={timeLeft <= MIN_SECONDS}
                style={styles.timerBtn}
                hitSlop={8}>
                <MaterialCommunityIcons
                  name="minus"
                  size={scaleBySizeClass(16, sizeClass)}
                  color={timeLeft <= MIN_SECONDS ? palette.textMuted : palette.textInverse}
                />
              </Pressable>

              <Pressable onPress={toggleTimer} style={styles.timerDisplay}>
                <ThemedText style={[styles.timerValue, { color: timerValueColor }]}>
                  {formatTimerSeconds(timeLeft)}
                </ThemedText>
                <ThemedText style={[styles.timerState, { color: palette.textMuted }]}>
                  {isRunning ? 'PAUSE' : 'START'}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => adjustTimer(1)}
                disabled={timeLeft >= MAX_SECONDS}
                style={styles.timerBtn}
                hitSlop={8}>
                <MaterialCommunityIcons
                  name="plus"
                  size={scaleBySizeClass(16, sizeClass)}
                  color={timeLeft >= MAX_SECONDS ? palette.textMuted : palette.textInverse}
                />
              </Pressable>
            </View>

            {!hasStats && (
              <View style={styles.actionRow}>
                <Pressable
                  testID="halftime-undo"
                  onPress={handleUndo}
                  style={({ pressed }) => [
                    styles.undoBtn,
                    { backgroundColor: palette.overlay05, borderColor: palette.overlay15 },
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  ]}>
                  <MaterialCommunityIcons
                    name="undo"
                    size={scaleBySizeClass(16, sizeClass)}
                    color={palette.textInverse}
                  />
                  <ThemedText style={[styles.undoBtnText, { color: palette.textInverse }]}>
                    UNDO
                  </ThemedText>
                </Pressable>

                <Pressable
                  testID="halftime-continue"
                  onPress={handleContinue}
                  style={({ pressed }) => [
                    styles.continueBtn,
                    { backgroundColor: palette.accent },
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  ]}>
                  <ThemedText style={[styles.continueBtnText, { color: palette.textOnAccent }]}>
                    CONTINUE
                  </ThemedText>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={scaleBySizeClass(16, sizeClass)}
                    color={palette.textOnAccent}
                  />
                </Pressable>
              </View>
            )}
          </View>

          {hasStats && (
            <>
              {isLandscape && (
                <View style={[styles.divider, { backgroundColor: palette.overlay10 }]} />
              )}

              {/* Stats */}
              <View style={styles.rightColumn}>
                <View style={styles.statsRow}>
                  <View style={[styles.statCard, { backgroundColor: palette.overlay05 }]}>
                    <ThemedText style={[styles.statValue, { color: palette.textInverse }]}>
                      {teamStats.holds}/{teamStats.oPoints}
                    </ThemedText>
                    <ThemedText style={[styles.statLabel, { color: palette.textMuted }]}>
                      HOLD
                    </ThemedText>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: palette.overlay05 }]}>
                    <ThemedText style={[styles.statValue, { color: palette.textInverse }]}>
                      {teamStats.breaks}/{teamStats.dPoints}
                    </ThemedText>
                    <ThemedText style={[styles.statLabel, { color: palette.textMuted }]}>
                      BREAK
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.performersList}>
                  {topPerformers.map((p, i) => (
                    <View key={p.name} style={styles.performerRow}>
                      <ThemedText style={[styles.performerRank, { color: palette.accent }]}>
                        {i + 1}
                      </ThemedText>
                      <ThemedText
                        style={[styles.performerName, { color: palette.textInverse }]}
                        numberOfLines={1}>
                        {p.name}
                      </ThemedText>
                      <View
                        style={[
                          styles.performerBadge,
                          {
                            backgroundColor:
                              p.plusMinus >= 0 ? palette.success + '20' : palette.danger + '20',
                          },
                        ]}>
                        <ThemedText
                          style={[
                            styles.performerStat,
                            { color: p.plusMinus >= 0 ? palette.success : palette.danger },
                          ]}>
                          {p.plusMinus > 0 ? '+' : ''}
                          {p.plusMinus}
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.actionRow}>
                  <Pressable
                    testID="halftime-undo"
                    onPress={handleUndo}
                    style={({ pressed }) => [
                      styles.undoBtn,
                      { backgroundColor: palette.overlay05, borderColor: palette.overlay15 },
                      pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                    ]}>
                    <MaterialCommunityIcons
                      name="undo"
                      size={scaleBySizeClass(16, sizeClass)}
                      color={palette.textInverse}
                    />
                    <ThemedText style={[styles.undoBtnText, { color: palette.textInverse }]}>
                      UNDO
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    testID="halftime-continue"
                    onPress={handleContinue}
                    style={({ pressed }) => [
                      styles.continueBtn,
                      { backgroundColor: palette.accent },
                      pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                    ]}>
                    <ThemedText style={[styles.continueBtnText, { color: palette.textOnAccent }]}>
                      CONTINUE
                    </ThemedText>
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={scaleBySizeClass(16, sizeClass)}
                      color={palette.textOnAccent}
                    />
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      paddingHorizontal: scaleBySizeClass(20, sizeClass),
      paddingBottom: scaleBySizeClass(28, sizeClass),
    },
    contentCompact: {
      flex: 1,
      justifyContent: 'center',
    },
    row: {
      flexDirection: isLandscape ? 'row' : 'column',
      gap: scaleBySizeClass(24, sizeClass),
    },
    rowCompact: {
      alignItems: 'center',
    },
    leftColumn: {
      flex: isLandscape ? 1 : 0,
      alignItems: 'center',
      gap: scaleBySizeClass(20, sizeClass),
      paddingVertical: scaleBySizeClass(isLandscape ? 0 : 20, sizeClass),
    },
    leftColumnCompact: {
      width: '100%',
      maxWidth: 340,
    },
    rightColumn: {
      flex: isLandscape ? 1.1 : 0,
      gap: scaleBySizeClass(16, sizeClass),
      paddingVertical: scaleBySizeClass(isLandscape ? 0 : 4, sizeClass),
    },
    divider: {
      width: 1,
      alignSelf: 'stretch',
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(12, sizeClass),
    },
    scoreGroup: {
      alignItems: 'center',
    },
    teamLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: -4,
      maxWidth: 100,
    },
    scoreNumber: {
      fontSize: scaleBySizeClass(64, sizeClass),
      fontFamily: Fonts.black,
      fontVariant: ['tabular-nums'],
      lineHeight: scaleBySizeClass(70, sizeClass),
    },
    scoreDivider: {
      fontSize: scaleBySizeClass(32, sizeClass),
      marginBottom: 8,
      marginHorizontal: 8,
    },
    timerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 6,
      paddingHorizontal: 12,
      borderRadius: 24,
    },
    timerBtn: {
      padding: 8,
    },
    timerDisplay: {
      alignItems: 'center',
      minWidth: 90,
    },
    timerValue: {
      fontSize: scaleBySizeClass(36, sizeClass),
      fontFamily: Fonts.extraBold,
      fontVariant: ['tabular-nums'],
    },
    timerState: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statCard: {
      flex: 1,
      padding: 8,
      borderRadius: 12,
      alignItems: 'center',
    },
    statValue: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.extraBold,
    },
    statLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      marginTop: 2,
      letterSpacing: 0.5,
    },
    performersList: {
      gap: 4,
      maxWidth: 220,
      alignSelf: isLandscape ? 'flex-start' : 'center',
      width: '100%',
    },
    performerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      paddingVertical: 2,
    },
    performerRank: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.extraBold,
      width: 16,
    },
    performerName: {
      flex: 1,
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    performerBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
      minWidth: 28,
      alignItems: 'center',
    },
    performerStat: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.extraBold,
      fontVariant: ['tabular-nums'],
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      width: '100%',
    },
    undoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: scaleBySizeClass(12, sizeClass),
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
    },
    continueBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: scaleBySizeClass(12, sizeClass),
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    undoBtnText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.extraBold,
      letterSpacing: 1,
    },
    continueBtnText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.extraBold,
      letterSpacing: 1,
    },
  });
}
