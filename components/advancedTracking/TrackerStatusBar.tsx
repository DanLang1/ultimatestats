import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  formatPointTime,
  getActiveSideId,
  getGoalInfo,
  getLastTurnoverEvent,
  getPassChainEvents,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  getCurrentPoint,
  getCurrentPossession,
  hasPointEnded,
} from '@/lib/advancedTracking/trackingUtils';
import { formatRatio, getExpectedRatio, getSequenceNumber } from '@/lib/genderRatioUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TrackerPassChain } from './TrackerPassChain';

interface TrackerStatusBarProps {
  pointElapsedMs: number;
}

export const TrackerStatusBar = ({ pointElapsedMs }: TrackerStatusBarProps) => {
  const { palette } = useTheme();
  const { sizeClass, isLandscape } = useLayout();
  const styles = createStyles(sizeClass, isLandscape);

  const { currentGameId, savedGames, recordStoppage } = useAdvancedTrackingStore();
  const { genderRatioEnabled, firstPointRatio } = useSettingsStore();
  const game = savedGames.find((g) => g.id === currentGameId);
  if (!game) return null;

  const currentPointNumber = game.points.length;
  const ratioLabel =
    genderRatioEnabled && firstPointRatio && currentPointNumber > 0
      ? formatRatio(
          getExpectedRatio(currentPointNumber, firstPointRatio),
          getSequenceNumber(currentPointNumber),
        )
      : null;

  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  const pointIsOver = hasPointEnded(point);
  const activeSideId = getActiveSideId(possession, game);
  const oppHasDisc = !pointIsOver && activeSideId !== game.focusSideId;

  const lastFocusPossession =
    point?.possessions.filter((p) => p.sideId === game.focusSideId).at(-1) ?? null;
  const lastOppPossession =
    point?.possessions.filter((p) => p.sideId !== game.focusSideId).at(-1) ?? null;

  // True only once we have an active focus possession with at least one action (disc pickup).
  // When opp just turned it over, `possession` is their (now-over) possession — not ours.
  const focusHasStarted =
    !!possession && possession.sideId === game.focusSideId && possession.actions.length > 0;

  let turnoverEvent: ReturnType<typeof getLastTurnoverEvent>;
  if (oppHasDisc) {
    turnoverEvent = getLastTurnoverEvent(lastFocusPossession, true, game.participants);
  } else if (!focusHasStarted) {
    turnoverEvent = getLastTurnoverEvent(lastOppPossession, false, game.participants);
  } else {
    turnoverEvent = null;
  }

  const passChainEvents = getPassChainEvents(
    oppHasDisc ? lastFocusPossession : possession,
    game.participants,
  );

  const goalInfo = getGoalInfo(point, game.focusSideId, game.participants);
  const showPointTimer = point?.startedAt != null && !hasPointEnded(point);
  const scorerLabel = goalInfo?.isCallahan ? 'CALLAHAN' : 'GOAL';

  let statusContent: React.ReactNode;
  if (pointIsOver) {
    if (goalInfo?.isFocusGoal) {
      statusContent = (
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
      );
    } else {
      statusContent = (
        <ThemedText style={[styles.passChainText, { color: palette.danger }]}>
          {goalInfo ? 'OPP SCORED' : 'POINT OVER'}
        </ThemedText>
      );
    }
  } else if (turnoverEvent || passChainEvents.events.length > 0) {
    statusContent = (
      <TrackerPassChain
        events={passChainEvents.events}
        truncated={passChainEvents.truncated}
        turnoverEvent={turnoverEvent}
        isLandscape={isLandscape}
      />
    );
  } else {
    statusContent = null;
  }

  return (
    <View style={styles.statusBar}>
      {showPointTimer && (
        <View style={styles.pointTimerRow}>
          <ThemedText style={[styles.pointTimerText, { color: palette.textInverse }]}>
            {formatPointTime(pointElapsedMs)}
          </ThemedText>
          {ratioLabel && (
            <ThemedText style={[styles.ratioLabel, { color: palette.textMuted }]}>
              {ratioLabel}
            </ThemedText>
          )}
          <Pressable
            onPress={() => recordStoppage({ reason: 'manual_pause' })}
            hitSlop={8}
            style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}>
            <MaterialCommunityIcons
              name="pause"
              size={scaleBySizeClass(isLandscape ? 14 : 16, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>
        </View>
      )}
      {statusContent}
    </View>
  );
};

function createStyles(sizeClass: SizeClass, isLandscape: boolean) {
  const chipFontSize = scaleBySizeClass(isLandscape ? 11 : 12, sizeClass);
  const chipLineHeight = isLandscape ? 14 : 15;

  return StyleSheet.create({
    statusBar: {
      minHeight: isLandscape ? 40 : 64,
      alignItems: 'center',
      justifyContent: 'center',
      gap: isLandscape ? 4 : 6,
      paddingHorizontal: isLandscape ? 12 : 24,
      paddingVertical: isLandscape ? 4 : 8,
    },
    pointTimerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    pointTimerText: {
      fontSize: scaleBySizeClass(isLandscape ? 14 : 18, sizeClass),
      fontFamily: Fonts.black,
      fontVariant: ['tabular-nums'],
      letterSpacing: 1,
    },
    ratioLabel: {
      fontSize: scaleBySizeClass(isLandscape ? 12 : 14, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 1,
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
  });
}
