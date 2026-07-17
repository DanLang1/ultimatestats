import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { computePointByPointEvents, getTurnoverSummary } from '@/lib/basic/timelineUtils';
import { MODAL_MAX_WIDTH_INFO } from '@/lib/constants';
import { formatRatio, getExpectedRatio, getSequenceNumber } from '@/lib/genderRatioUtils';
import { useGameStore } from '@/store/basic/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';

type PointOutcome = {
  label: string;
  isPositive: boolean; // true = good for us (green), false = bad for us (red/neutral)
};

/**
 * Determine the outcome of a point from our team's perspective
 * - Clean Hold: we started on offense and scored without turnovers
 * - Dirty Hold: we started on offense and scored with ≥1 turnover
 * - Broken: we started on offense and opponent scored
 * - Opp Hold: opponent started on offense and scored
 * - Break: opponent started on offense and we scored
 */
function getPointOutcome(
  scoringTeam: 'team1' | 'team2',
  offensiveTeam: 'team1' | 'team2',
  turnoverCount: number,
): PointOutcome {
  const weScored = scoringTeam === 'team1';
  const weStartedOnOffense = offensiveTeam === 'team1';

  if (weStartedOnOffense) {
    if (weScored) {
      // We held
      return turnoverCount === 0
        ? { label: 'CLEAN HOLD', isPositive: true }
        : { label: 'DIRTY HOLD', isPositive: true };
    }
    // Opponent broke us
    return { label: 'BROKEN', isPositive: false };
  }
  // Opponent started on offense
  if (weScored) {
    // We broke them
    return { label: 'BREAK', isPositive: true };
  }
  // Opponent held
  return { label: 'OPP HOLD', isPositive: false };
}

export default function PointSummaryModal() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const {
    events,
    startingPossession,
    gameTo,
    autoHalftimeEnabled,
    pointStartTimestamps,
    pointTimerEnabled,
    statTrackingEnabled,
    startPoint,
    isHalftimeBreak,
    currentGameStatus,
  } = useGameStore();

  const { genderRatioEnabled, firstPointRatio } = useSettingsStore();

  // Don't show if point timer is off, no stat tracking, halftime is active, or game ended
  if (
    !pointTimerEnabled ||
    !statTrackingEnabled ||
    isHalftimeBreak ||
    currentGameStatus === 'finished'
  ) {
    return null;
  }

  // Compute the last completed point
  const pointEvents = computePointByPointEvents(
    events,
    startingPossession,
    gameTo,
    pointStartTimestamps,
    null,
    autoHalftimeEnabled,
  );

  const completedPoints = pointEvents.filter((p) => !p.isInProgress);
  const lastPoint = completedPoints[completedPoints.length - 1];

  // If no completed points, nothing to show
  if (!lastPoint) {
    return null;
  }

  const turnoverSummary = getTurnoverSummary(lastPoint.turnovers, 'team1');
  const totalTurnovers = lastPoint.turnovers.filter((t) => t.team === 'team1').length;

  // Calculate the point outcome
  const pointOutcome = getPointOutcome(
    lastPoint.scoringTeam,
    lastPoint.offensiveTeam,
    totalTurnovers,
  );

  const handleStartNextPoint = () => {
    startPoint();
    router.dismissTo('/Scoreboard');
  };

  const handleDismiss = () => {
    router.dismissTo('/Scoreboard');
  };

  // Format duration if available
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={[styles.overlay, { backgroundColor: palette.overlayDark60 }]}
        onPress={handleDismiss}>
        <Animated.View
          entering={SlideInUp.duration(300)}
          style={[styles.sheet, { backgroundColor: palette.modalBg, shadowColor: palette.shadow }]}>
          {/* Header */}
          <View style={styles.header}>
            <Animated.View entering={FadeIn.delay(100)} style={styles.headerContent}>
              <ThemedText style={[styles.title, { color: palette.modalText }]}>
                Point {lastPoint.pointNumber} Complete
              </ThemedText>
              <View
                style={[
                  styles.possessionChip,
                  {
                    backgroundColor: pointOutcome.isPositive
                      ? palette.success + '20'
                      : palette.danger + '20',
                  },
                ]}>
                <ThemedText
                  style={[
                    styles.possessionText,
                    {
                      color: pointOutcome.isPositive ? palette.success : palette.danger,
                    },
                  ]}>
                  {pointOutcome.label}
                </ThemedText>
              </View>
            </Animated.View>

            {/* Close button */}
            <Pressable
              onPress={handleDismiss}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
              hitSlop={12}>
              <MaterialCommunityIcons
                name="close"
                size={scaleBySizeClass(20, sizeClass)}
                color={palette.textMuted}
              />
            </Pressable>
          </View>

          {/* Summary Stats */}
          <Animated.View entering={FadeIn.delay(150)} style={styles.summaryRow}>
            {/* Duration */}
            {lastPoint.pointDurationMs && (
              <View style={[styles.statCard, { backgroundColor: palette.overlay05 }]}>
                <MaterialCommunityIcons
                  name="timer-outline"
                  size={scaleBySizeClass(16, sizeClass)}
                  color={palette.textMuted}
                />
                <ThemedText style={[styles.statValue, { color: palette.modalText }]}>
                  {formatDuration(lastPoint.pointDurationMs)}
                </ThemedText>
              </View>
            )}

            {/* Turnovers */}
            {totalTurnovers > 0 && (
              <View style={[styles.statCard, { backgroundColor: palette.overlay05 }]}>
                <MaterialCommunityIcons
                  name="swap-horizontal"
                  size={scaleBySizeClass(16, sizeClass)}
                  color={palette.textMuted}
                />
                <ThemedText style={[styles.statValue, { color: palette.modalText }]}>
                  {totalTurnovers} turn{totalTurnovers !== 1 ? 's' : ''}
                </ThemedText>
              </View>
            )}

            {/* Turnover breakdown */}
            {turnoverSummary.blocks > 0 && (
              <View style={[styles.statCard, { backgroundColor: palette.overlay05 }]}>
                <MaterialCommunityIcons
                  name="hand-back-left-outline"
                  size={scaleBySizeClass(16, sizeClass)}
                  color={palette.textMuted}
                />
                <ThemedText style={[styles.statValue, { color: palette.modalText }]}>
                  {turnoverSummary.blocks} block{turnoverSummary.blocks !== 1 ? 's' : ''}
                </ThemedText>
              </View>
            )}

            {/* Next Point Ratio */}
            {genderRatioEnabled && firstPointRatio && (
              <View style={[styles.statCard, { backgroundColor: palette.overlay05 }]}>
                <ThemedText style={[styles.statValue, { color: palette.modalText }]}>
                  {`Next Point: ${formatRatio(getExpectedRatio(lastPoint.pointNumber + 1, firstPointRatio), getSequenceNumber(lastPoint.pointNumber + 1))}`}
                </ThemedText>
              </View>
            )}
          </Animated.View>

          {/* CTA Buttons */}
          <Animated.View entering={FadeIn.delay(200)} style={styles.ctaContainer}>
            <Pressable
              onPress={handleStartNextPoint}
              style={({ pressed }) => [
                styles.ctaButton,
                { backgroundColor: palette.success },
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}>
              <MaterialCommunityIcons
                name="timer-outline"
                size={scaleBySizeClass(16, sizeClass)}
                color={palette.textOnAccent}
              />
              <ThemedText
                style={[styles.ctaText, { color: palette.textOnAccent }]}
                numberOfLines={1}>
                START TIMER
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleDismiss}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: palette.border },
                pressed && { opacity: 0.7 },
              ]}>
              <ThemedText
                style={[styles.secondaryButtonText, { color: palette.textMuted }]}
                numberOfLines={1}>
                SKIP TIMER
              </ThemedText>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sheet: {
      borderRadius: 20,
      padding: 24,
      width: '90%',
      maxWidth: getSizeClassValue(MODAL_MAX_WIDTH_INFO, sizeClass),
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    title: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.extraBold,
    },
    possessionChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    possessionText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.extraBold,
      letterSpacing: 0.5,
    },
    closeBtn: {
      padding: 4,
    },
    summaryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 24,
    },
    statCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    statValue: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    ctaContainer: {
      gap: 10,
    },
    ctaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
    },
    ctaText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.extraBold,
      letterSpacing: 0.3,
      flexShrink: 1,
    },
    secondaryButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    secondaryButtonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
      flexShrink: 1,
    },
  });
}
