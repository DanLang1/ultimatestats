import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { useTimestampTimer } from '@/hooks/advancedTracking/useTimer';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { computeCapState } from '@/lib/advancedTracking/capUtils';
import {
  canCallTimeout,
  formatPointTime,
  getActiveStoppage,
  getSideTimeoutState,
  SideTimeoutState,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  getCurrentPoint,
  getCurrentPossession,
  getSideScore,
  hasPointEnded,
} from '@/lib/advancedTracking/trackingUtils';

import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
interface TrackerScoreBarProps {
  pointElapsedMs: number;
}

export const TrackerScoreBar = ({ pointElapsedMs }: TrackerScoreBarProps) => {
  const { palette } = useTheme();
  const { sizeClass, isLandscape } = useLayout();
  const styles = createStyles(sizeClass);

  const { currentGameId, savedGames, recordBetweenPointTimeout, recordStoppage } =
    useAdvancedTrackingStore();
  const { hardCapMins, softCapMins } = useSettingsStore();

  const game = savedGames.find((g) => g.id === currentGameId);
  const gameStartedAt = game?.points[0]?.startedAt ?? null;
  const gameElapsedMs = useTimestampTimer({
    timestamp: gameStartedAt,
    mode: 'elapsed',
    intervalMs: 1000,
    enabled: gameStartedAt !== null,
  });

  if (!game) return null;

  const oppSide = game.sides.find((s) => s.id !== game.focusSideId);
  if (!oppSide) return null;

  const focusSideName = game.sides.find((s) => s.id === game.focusSideId)?.label ?? '';
  const oppSideName = oppSide.label;
  const focusScore = getSideScore(game, game.focusSideId);
  const oppScore = getSideScore(game, oppSide.id);
  const focusTimeouts = getSideTimeoutState(game, game.focusSideId);
  const oppTimeouts = getSideTimeoutState(game, oppSide.id);

  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  const pointIsOver = hasPointEnded(point);
  const activeStoppage = getActiveStoppage(possession);
  const isPointTimerPaused = activeStoppage !== null;
  const showPointTimer = point?.startedAt != null && !hasPointEnded(point);

  const currentPointNumber = game.points.length;

  const { capLabel, capProgress, capTimeLeftMs, capIsWarning } = computeCapState({
    gameElapsedMs,
    gameStarted: gameStartedAt !== null,
    gameLengthMinutes: hardCapMins,
    softCapMins,
  });

  const handleTimeout = (sideId: string) => {
    const state = sideId === game.focusSideId ? focusTimeouts : oppTimeouts;
    if (!canCallTimeout(state)) return;
    const useFloater = state.regularUsedInHalf >= state.regularPerHalf;
    if (pointIsOver) {
      recordBetweenPointTimeout({ sideId, isFloater: useFloater });
    } else {
      recordStoppage({ reason: 'timeout', sideId, isFloater: useFloater });
    }
  };

  const handlePause = () => {
    recordStoppage({ reason: 'manual_pause' });
  };

  const renderTimeoutButton = (state: SideTimeoutState, sideId: string) => {
    const regularsLeft = Math.max(state.regularPerHalf - state.regularUsedInHalf, 0);
    const floaterAvailable = state.floaterEnabled && !state.floaterUsed;
    const totalLeft = regularsLeft + (floaterAvailable ? 1 : 0);
    const canUse = canCallTimeout(state);
    return (
      <Pressable
        onPress={() => handleTimeout(sideId)}
        disabled={!canUse}
        hitSlop={6}
        style={({ pressed }) => [
          styles.timeoutBtn,
          {
            backgroundColor: canUse ? palette.accentOverlay15 : palette.overlay08,
            borderColor: canUse ? palette.accentOverlay30 : palette.overlay15,
          },
          pressed && canUse && { opacity: 0.6 },
        ]}>
        <ThemedText
          style={[
            styles.timeoutBtnText,
            { color: canUse ? palette.textInverse : palette.textMuted },
          ]}>
          TO {totalLeft}
        </ThemedText>
        {floaterAvailable && (
          <View
            style={[
              styles.timeoutBtnDiamond,
              { borderColor: palette.accent, backgroundColor: palette.accent },
            ]}
          />
        )}
      </Pressable>
    );
  };

  if (isLandscape) {
    return (
      <View style={[styles.landscapeContainer, { paddingTop: 8 }]}>
        <View style={styles.landscapeTeamRow}>
          <ThemedText
            style={[styles.landscapeTeamName, { color: palette.textMuted }]}
            numberOfLines={1}>
            {focusSideName}
          </ThemedText>
          <ThemedText style={[styles.landscapeScore, { color: palette.textInverse }]}>
            {focusScore}
          </ThemedText>
          {renderTimeoutButton(focusTimeouts, game.focusSideId)}
        </View>

        <View style={[styles.landscapeDivider, { backgroundColor: palette.overlay15 }]} />

        <View style={styles.landscapeTeamRow}>
          <ThemedText
            style={[styles.landscapeTeamName, { color: palette.textMuted }]}
            numberOfLines={1}>
            {oppSideName}
          </ThemedText>
          <ThemedText style={[styles.landscapeScore, { color: palette.textInverse }]}>
            {oppScore}
          </ThemedText>
          {renderTimeoutButton(oppTimeouts, oppSide.id)}
        </View>

        <View style={[styles.landscapeDivider, { backgroundColor: palette.overlay15 }]} />

        {showPointTimer && (
          <View style={styles.landscapeTimerRow}>
            <ThemedText style={[styles.landscapePointLabel, { color: palette.textMuted }]}>
              PT {currentPointNumber}
            </ThemedText>
            <View style={styles.landscapeTimerInner}>
              <Pressable onPress={handlePause} hitSlop={8}>
                <MaterialCommunityIcons
                  name="pause"
                  size={scaleBySizeClass(18, sizeClass)}
                  color={palette.textMuted}
                />
              </Pressable>
              <ThemedText style={[styles.landscapeTimer, { color: palette.textInverse }]}>
                {formatPointTime(pointElapsedMs)}
              </ThemedText>
            </View>
          </View>
        )}
      </View>
    );
  }

  const capFillColor = capIsWarning ? palette.danger : palette.accent;

  return (
    <View style={[styles.scoreBarContainer, { paddingTop: 12 }]}>
      {/* Cap progress bar — counts down to soft cap, then hard cap */}
      <View style={styles.capBarBlock}>
        <View style={styles.capBarHeader}>
          <ThemedText style={[styles.capBarLabel, { color: palette.textMuted }]}>
            {capLabel}
          </ThemedText>
          <ThemedText
            style={[
              styles.capBarTime,
              { color: capIsWarning ? palette.danger : palette.textMuted },
            ]}>
            {gameStartedAt !== null ? `${formatPointTime(capTimeLeftMs)} left` : '—'}
          </ThemedText>
        </View>
        <View style={[styles.capBarTrack, { backgroundColor: palette.overlay10 }]}>
          <View
            style={[
              styles.capBarFill,
              { width: `${capProgress * 100}%`, backgroundColor: capFillColor },
            ]}
          />
        </View>
      </View>

      <View style={styles.scoreRow}>
        <View style={[styles.teamBlock, { justifyContent: 'flex-end' }]}>
          <ThemedText style={[styles.teamName, { color: palette.textMuted }]} numberOfLines={1}>
            {focusSideName}
          </ThemedText>
          <ThemedText style={[styles.scoreNum, { color: palette.textInverse }]}>
            {focusScore}
          </ThemedText>
        </View>

        <ThemedText style={[styles.divider, { color: palette.textMuted }]}>—</ThemedText>

        <View style={[styles.teamBlock, { justifyContent: 'flex-start' }]}>
          <ThemedText style={[styles.scoreNum, { color: palette.textInverse }]}>
            {oppScore}
          </ThemedText>
          <ThemedText style={[styles.teamName, { color: palette.textMuted }]} numberOfLines={1}>
            {oppSideName}
          </ThemedText>
        </View>
      </View>

      <View style={styles.timeoutRow}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          {renderTimeoutButton(focusTimeouts, game.focusSideId)}
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          {renderTimeoutButton(oppTimeouts, oppSide.id)}
        </View>
      </View>

      {showPointTimer && (
        <View style={styles.timerRow}>
          <ThemedText style={[styles.pointTimer, { color: palette.textInverse }]}>
            {formatPointTime(pointElapsedMs)}
          </ThemedText>
          {isPointTimerPaused && (
            <ThemedText style={[styles.pausedText, { color: palette.warning }]}>
              ‖ paused
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    scoreBarContainer: {
      paddingHorizontal: 12,
      paddingBottom: 8,
      zIndex: 10,
      gap: 10,
    },
    capBarBlock: {
      gap: 4,
    },
    capBarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
    },
    capBarLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 1.5,
    },
    capBarTime: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 0.5,
      fontVariant: ['tabular-nums'],
    },
    capBarTrack: {
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
    },
    capBarFill: {
      height: '100%',
      borderRadius: 2,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    teamBlock: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    teamName: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.extraBold,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    scoreNum: {
      fontSize: scaleBySizeClass(32, sizeClass),
      fontFamily: Fonts.black,
      fontVariant: ['tabular-nums'],
      lineHeight: scaleBySizeClass(36, sizeClass),
    },
    divider: {
      fontSize: scaleBySizeClass(24, sizeClass),
      fontFamily: Fonts.black,
      lineHeight: scaleBySizeClass(28, sizeClass),
      fontVariant: ['tabular-nums'],
    },
    timeoutRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    pointTimer: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 0.5,
      fontVariant: ['tabular-nums'],
      lineHeight: scaleBySizeClass(22, sizeClass),
    },
    timerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    pausedText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    timeoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderCurve: 'continuous',
      borderWidth: 1,
    },
    timeoutBtnText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 1,
      fontVariant: ['tabular-nums'],
    },
    timeoutBtnDiamond: {
      width: 8,
      height: 8,
      borderRadius: 1,
      transform: [{ rotate: '45deg' }],
    },
    landscapeContainer: {
      paddingHorizontal: 12,
      paddingBottom: 4,
    },
    landscapeTeamRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 5,
      gap: 8,
    },
    landscapeTeamName: {
      flex: 1,
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.extraBold,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    landscapeScore: {
      fontSize: scaleBySizeClass(28, sizeClass),
      fontFamily: Fonts.black,
      fontVariant: ['tabular-nums'],
    },
    landscapeDivider: {
      height: 1,
      marginVertical: 4,
    },
    landscapeTimerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 5,
      gap: 8,
    },
    landscapeTimerInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    landscapePointLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    landscapeTimer: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.black,
      fontVariant: ['tabular-nums'],
      letterSpacing: 0.5,
    },
  });
}
