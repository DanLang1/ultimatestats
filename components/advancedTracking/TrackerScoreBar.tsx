import { ThemedText } from '@/components/ThemedText';
import { LandscapeTimeoutButton } from '@/components/advancedTracking/scoreBar/LandscapeTimeoutButton';
import { ScoreBarFooter } from '@/components/advancedTracking/scoreBar/ScoreBarFooter';
import { TeamScoreBlock } from '@/components/advancedTracking/scoreBar/TeamScoreBlock';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  canCallTimeout,
  formatPointTime,
  getActiveStoppage,
  getSideTimeoutState,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  getCurrentPoint,
  getCurrentPossession,
  getSideScore,
  hasPointEnded,
} from '@/lib/advancedTracking/trackingUtils';
import { formatRatio, getExpectedRatio, getSequenceNumber } from '@/lib/genderRatioUtils';

import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface TrackerScoreBarProps {
  pointElapsedMs: number;
}

export const TrackerScoreBar = ({ pointElapsedMs }: TrackerScoreBarProps) => {
  const { palette } = useTheme();
  const { sizeClass, isLandscape } = useLayout();
  const styles = createStyles(sizeClass);
  const [isExpanded, setIsExpanded] = useState(false);

  const { currentGameId, savedGames, recordBetweenPointTimeout, recordStoppage } =
    useAdvancedTrackingStore();
  const { genderRatioEnabled, firstPointRatio } = useSettingsStore();

  const game = savedGames.find((g) => g.id === currentGameId);

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
  const ratioLabel =
    genderRatioEnabled && firstPointRatio && currentPointNumber > 0
      ? formatRatio(
          getExpectedRatio(currentPointNumber, firstPointRatio),
          getSequenceNumber(currentPointNumber),
        )
      : null;

  const handleTimeout = (sideId: string) => {
    if (activeStoppage) return;
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
    if (activeStoppage) return;
    recordStoppage({ reason: 'manual_pause' });
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
          <LandscapeTimeoutButton
            state={focusTimeouts}
            onPress={() => handleTimeout(game.focusSideId)}
          />
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
          <LandscapeTimeoutButton state={oppTimeouts} onPress={() => handleTimeout(oppSide.id)} />
        </View>

        <View style={[styles.landscapeDivider, { backgroundColor: palette.overlay15 }]} />

        {showPointTimer && (
          <View style={styles.landscapeTimerRow}>
            <ThemedText style={[styles.landscapePointLabel, { color: palette.textMuted }]}>
              PT {currentPointNumber}
            </ThemedText>
            <View style={styles.landscapeTimerInner}>
              {!isPointTimerPaused && (
                <Pressable testID="scorebar-pause" onPress={handlePause} hitSlop={8}>
                  <MaterialCommunityIcons
                    name="pause"
                    size={scaleBySizeClass(18, sizeClass)}
                    color={palette.textMuted}
                  />
                </Pressable>
              )}
              <ThemedText style={[styles.landscapeTimer, { color: palette.textInverse }]}>
                {formatPointTime(pointElapsedMs)}
              </ThemedText>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.scoreBarContainer}>
      <View
        style={[
          styles.scoreboardCard,
          isExpanded && styles.scoreboardCardExpanded,
          { backgroundColor: palette.primary, borderColor: palette.border },
        ]}>
        <View style={styles.scoreRow}>
          <TeamScoreBlock
            name={focusSideName}
            score={focusScore}
            timeouts={focusTimeouts}
            color={palette.accent}
            onTimeoutDotsPress={() => setIsExpanded(true)}
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
              <ThemedText style={[styles.centerTimer, { color: palette.textInverse }]}>
                {showPointTimer || pointIsOver ? formatPointTime(pointElapsedMs) : '–:––'}
              </ThemedText>
            </View>
            {isPointTimerPaused && (
              <ThemedText style={[styles.pausedText, { color: palette.warning }]}>
                paused
              </ThemedText>
            )}
            <Pressable
              onPress={() => setIsExpanded((prev) => !prev)}
              hitSlop={10}
              style={[styles.expandButton, { position: 'absolute', bottom: 2 }]}>
              <MaterialCommunityIcons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={scaleBySizeClass(18, sizeClass)}
                color={palette.textMuted}
              />
            </Pressable>
          </View>

          <TeamScoreBlock
            name={oppSideName}
            score={oppScore}
            timeouts={oppTimeouts}
            color={palette.success}
            onTimeoutDotsPress={() => setIsExpanded(true)}
            timeoutDotsTestID="timeout-dots-opp"
          />
        </View>
      </View>

      {isExpanded && (
        <ScoreBarFooter
          focusTimeouts={focusTimeouts}
          oppTimeouts={oppTimeouts}
          ratioLabel={ratioLabel}
          currentPointNumber={currentPointNumber}
          onFocusTimeout={() => handleTimeout(game.focusSideId)}
          onOppTimeout={() => handleTimeout(oppSide.id)}
        />
      )}
    </View>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    scoreBarContainer: {
      position: 'relative',
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 4,
      zIndex: 10,
      gap: 0,
    },
    scoreboardCard: {
      borderWidth: 1,
      borderRadius: 22,
      borderCurve: 'continuous',
      overflow: 'visible',
    },
    scoreboardCardExpanded: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    scoreRow: {
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
    expandButton: {
      marginTop: 0,
      paddingTop: 0,
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
