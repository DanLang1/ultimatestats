import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { PlayerChip } from '@/components/ui/PlayerChip';
import { useTheme } from '@/context/ThemeContext';
import { useTimestampTimer } from '@/hooks/advancedTracking/useTimer';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { computeAdvancedPlayerStats } from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import { computeAdvancedTeamStats } from '@/lib/advancedTracking/advancedTeamStatsUtils';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import { areBothSidesFullyTracked } from '@/lib/advancedTracking/trackingModeUtils';
import type { AdvancedTrackedGame, Participant } from '@/lib/advancedTracking/types';
import { MIN_HALFTIME_BREAK_SECONDS, ULTIMATE_LINE_SIZE } from '@/lib/constants';
import { formatTimerSeconds } from '@/lib/utils';
import {
  getCurrentPendingNextPointLineSelection,
  resolvePendingNextPointLines,
} from '@/store/advancedTracking/pendingLineSelection';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';

import { PointNoteButton } from './PointNoteButton';

interface HalftimeBetweenPointDisplayProps {
  game: AdvancedTrackedGame;
  onPrepareNextLine: () => void;
  onStartNextPoint: () => void;
  onPointNote: () => void;
}

const TIMER_MAX_WIDTH: Record<SizeClass, number> = { small: 340, medium: 560, large: 760 };
const STATS_MAX_WIDTH: Record<SizeClass, number> = { small: 340, medium: 560, large: 760 };
const ACTION_ROW_MAX_WIDTH: Record<SizeClass, number> = { small: 340, medium: 560, large: 760 };

export const HalftimeBetweenPointDisplay = ({
  game,
  onPrepareNextLine,
  onStartNextPoint,
  onPointNote,
}: HalftimeBetweenPointDisplayProps) => {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(sizeClass, isLandscape);
  const {
    adjustHalftimeTimer,
    halftimeTimerDurationSeconds,
    halftimeTimerStartedAt,
    pauseHalftimeTimer,
    pendingNextPointLineSelection,
    startHalftimeTimer,
    undoLastOperation,
    undoStack,
  } = useAdvancedTrackingStore();
  const lastUndoEntry = undoStack.at(-1);
  const showStandaloneUndo = lastUndoEntry != null && lastUndoEntry.kind !== 'action';

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

  const currentPendingSelection = getCurrentPendingNextPointLineSelection(
    game,
    pendingNextPointLineSelection,
  );
  const isDualTracked = areBothSidesFullyTracked(game);
  const oppSideId = isDualTracked
    ? game.sides.find((side) => side.id !== game.focusSideId)?.id
    : undefined;
  const focusLineCount =
    currentPendingSelection?.participantIdsBySide[game.focusSideId]?.length ?? 0;
  const oppLineCount = oppSideId
    ? (currentPendingSelection?.participantIdsBySide[oppSideId]?.length ?? 0)
    : 0;
  const isLineReady = resolvePendingNextPointLines(game, pendingNextPointLineSelection) != null;
  const hasAnyLinePrepared = focusLineCount > 0 || oppLineCount > 0;

  const focusSideParticipantIds =
    currentPendingSelection?.participantIdsBySide[game.focusSideId] ?? [];
  const selectedFocusParticipants = focusSideParticipantIds
    .map((id) => game.participants.find((p) => p.id === id))
    .filter((p): p is Participant => p != null);

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
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}>
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
                color={
                  timeLeft <= MIN_HALFTIME_BREAK_SECONDS ? palette.textMuted : palette.textInverse
                }
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

            {topPerformers.length > 0 && (
              <View style={styles.performerGrid}>
                {topPerformers.map((performer, index) => {
                  let statColor = palette.textMuted;
                  if (performer.plusMinus > 0) {
                    statColor = palette.success;
                  } else if (performer.plusMinus < 0) {
                    statColor = palette.danger;
                  }
                  return (
                    <View
                      key={performer.participantId}
                      style={[styles.performerCard, { backgroundColor: palette.overlay05 }]}>
                      <View style={styles.performerHeader}>
                        <ThemedText style={[styles.performerRank, { color: palette.accent }]}>
                          {index + 1}
                        </ThemedText>
                        <ThemedText
                          style={[styles.performerName, { color: palette.textInverse }]}
                          numberOfLines={1}>
                          {performer.name}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.performerValue, { color: statColor }]}>
                        {performer.plusMinus > 0
                          ? `+${performer.plusMinus}`
                          : `${performer.plusMinus}`}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.lineSection}>
              <View style={styles.lineHeaderRow}>
                <View style={styles.lineHeaderLeft}>
                  <MaterialCommunityIcons
                    name="account-group-outline"
                    size={scaleBySizeClass(16, sizeClass)}
                    color={palette.textMuted}
                  />
                  <ThemedText style={[styles.lineSectionTitle, { color: palette.textMuted }]}>
                    2ND HALF LINE
                  </ThemedText>
                  {hasAnyLinePrepared && (
                    <ThemedText
                      style={[
                        styles.lineCountBadge,
                        { color: isLineReady ? palette.success : palette.accent },
                      ]}>
                      ({focusLineCount}/{ULTIMATE_LINE_SIZE})
                    </ThemedText>
                  )}
                </View>
                <Pressable
                  testID="halftime-between-point-set-line"
                  style={({ pressed }) => [styles.lineEditAction, pressed && { opacity: 0.7 }]}
                  onPress={onPrepareNextLine}
                  hitSlop={8}>
                  <ThemedText style={[styles.lineEditText, { color: palette.accent }]}>
                    {hasAnyLinePrepared ? 'EDIT LINE' : 'SET LINE'}
                  </ThemedText>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={scaleBySizeClass(16, sizeClass)}
                    color={palette.accent}
                  />
                </Pressable>
              </View>

              {selectedFocusParticipants.length > 0 ? (
                <Pressable style={styles.chipGrid} onPress={onPrepareNextLine}>
                  {selectedFocusParticipants.map((player) => (
                    <PlayerChip
                      key={player.id}
                      name={player.name}
                      number={player.number}
                      matchingType={player.matchingType}
                      compact={sizeClass === 'small' || isLandscape}
                      onPress={onPrepareNextLine}
                    />
                  ))}
                </Pressable>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.emptyLineButton,
                    { borderColor: palette.overlay20, backgroundColor: palette.overlay05 },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={onPrepareNextLine}>
                  <MaterialCommunityIcons
                    name="account-plus-outline"
                    size={scaleBySizeClass(18, sizeClass)}
                    color={palette.textMuted}
                  />
                  <ThemedText style={[styles.emptyLineText, { color: palette.textMuted }]}>
                    Select {ULTIMATE_LINE_SIZE} players for 2nd half
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomActions}>
        <View style={styles.buttonRow}>
          {showStandaloneUndo && (
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
          )}
          <PointNoteButton
            hasNote={Boolean(game.points.at(-1)?.note)}
            onPress={onPointNote}
            buttonStyle={styles.iconButton}
            testID="halftime-between-point-note"
          />
          <Pressable
            testID="halftime-between-point-start-next"
            style={({ pressed }) => [
              styles.actionButton,
              { borderColor: palette.accent, backgroundColor: palette.accentOverlay10 },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleStartSecondHalf}>
            <ThemedText style={[styles.actionButtonText, { color: palette.accent }]}>
              START 2ND HALF
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

function createStyles(sizeClass: SizeClass, isLandscape: boolean) {
  const densitySizeClass = isLandscape ? 'small' : sizeClass;

  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'space-between' },
    contentScroll: {
      flex: 1,
      width: '100%',
    },
    content: {
      alignItems: 'center',
      flexGrow: 1,
      paddingBottom: scaleBySizeClass(16, densitySizeClass),
      paddingHorizontal: scaleBySizeClass(24, densitySizeClass),
      paddingTop: scaleBySizeClass(isLandscape ? 4 : 24, densitySizeClass),
      width: '100%',
    },
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
    statsSection: {
      gap: scaleBySizeClass(10, densitySizeClass),
      maxWidth: getSizeClassValue(STATS_MAX_WIDTH, sizeClass),
      width: '100%',
    },
    statCardRow: {
      flexDirection: 'row',
      gap: scaleBySizeClass(10, densitySizeClass),
      width: '100%',
    },
    statCard: {
      alignItems: 'center',
      borderRadius: scaleBySizeClass(8, densitySizeClass),
      borderCurve: 'continuous',
      flex: 1,
      gap: scaleBySizeClass(3, densitySizeClass),
      justifyContent: 'center',
      minHeight: scaleBySizeClass(58, densitySizeClass),
    },
    statValue: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(21, densitySizeClass),
      fontVariant: ['tabular-nums'],
      letterSpacing: 0,
    },
    statLabel: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(10, densitySizeClass),
      letterSpacing: 1.2,
    },
    performerGrid: {
      flexDirection: 'row',
      gap: scaleBySizeClass(8, densitySizeClass),
      width: '100%',
    },
    performerCard: {
      alignItems: 'center',
      borderRadius: scaleBySizeClass(8, densitySizeClass),
      borderCurve: 'continuous',
      flex: 1,
      gap: scaleBySizeClass(3, densitySizeClass),
      justifyContent: 'center',
      minHeight: scaleBySizeClass(54, densitySizeClass),
      paddingHorizontal: scaleBySizeClass(6, densitySizeClass),
      paddingVertical: scaleBySizeClass(8, densitySizeClass),
    },
    performerHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: scaleBySizeClass(4, densitySizeClass),
      maxWidth: '100%',
    },
    performerRank: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(11, densitySizeClass),
    },
    performerName: {
      flexShrink: 1,
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(12, densitySizeClass),
    },
    performerValue: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(18, densitySizeClass),
      fontVariant: ['tabular-nums'],
      letterSpacing: 0,
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
    lineSection: {
      gap: scaleBySizeClass(8, densitySizeClass),
      marginTop: scaleBySizeClass(4, densitySizeClass),
      width: '100%',
    },
    lineHeaderRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: scaleBySizeClass(2, densitySizeClass),
      width: '100%',
    },
    lineHeaderLeft: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: scaleBySizeClass(6, densitySizeClass),
    },
    lineSectionTitle: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(11, densitySizeClass),
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    lineCountBadge: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(11, densitySizeClass),
    },
    lineEditAction: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: scaleBySizeClass(2, densitySizeClass),
    },
    lineEditText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(11, densitySizeClass),
      letterSpacing: 0.8,
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: scaleBySizeClass(6, densitySizeClass),
      justifyContent: 'center',
      width: '100%',
    },
    emptyLineButton: {
      alignItems: 'center',
      borderCurve: 'continuous',
      borderRadius: scaleBySizeClass(8, densitySizeClass),
      borderStyle: 'dashed',
      borderWidth: 1,
      flexDirection: 'row',
      gap: scaleBySizeClass(8, densitySizeClass),
      justifyContent: 'center',
      paddingVertical: scaleBySizeClass(14, densitySizeClass),
      width: '100%',
    },
    emptyLineText: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(12, densitySizeClass),
      letterSpacing: 0.4,
    },
    bottomActions: {
      alignItems: 'center',
      paddingBottom: scaleBySizeClass(12, densitySizeClass),
      paddingHorizontal: scaleBySizeClass(24, densitySizeClass),
      width: '100%',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: scaleBySizeClass(12, densitySizeClass),
      maxWidth: getSizeClassValue(ACTION_ROW_MAX_WIDTH, sizeClass),
      width: '100%',
    },
    iconButton: {
      alignItems: 'center',
      borderRadius: scaleBySizeClass(8, densitySizeClass),
      borderWidth: 1,
      height: scaleBySizeClass(54, densitySizeClass),
      justifyContent: 'center',
      width: scaleBySizeClass(58, densitySizeClass),
    },
    actionButton: {
      alignItems: 'center',
      borderRadius: scaleBySizeClass(8, densitySizeClass),
      borderWidth: 1,
      flex: 1,
      height: scaleBySizeClass(54, densitySizeClass),
      justifyContent: 'center',
    },
    actionButtonText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(13, densitySizeClass),
      letterSpacing: 1,
    },
  });
}
