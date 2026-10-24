import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useCountdownSeconds } from '@/hooks/useTimer';
import { getLivePlayState } from '@/lib/advancedTracking/livePlayState';
import { getActivePlayElapsedMsAt } from '@/lib/advancedTracking/pointClock';
import { formatPointTime, getSubsForStoppage } from '@/lib/advancedTracking/trackingDisplayHelpers';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { DEFAULT_TIMEOUT_SECONDS, MAX_TIMEOUT_SECONDS, MIN_TIMEOUT_SECONDS } from '@/lib/constants';
import { formatTimerSeconds, hasItems } from '@/lib/utils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';

interface StoppageOverlayProps {
  game: AdvancedTrackedGame;
}

export const StoppageOverlay = ({ game }: StoppageOverlayProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const { cancelStoppage, resumeStoppage } = useAdvancedTrackingStore();

  const { point, activeStoppage } = getLivePlayState(game);

  const stoppageTimestamp = activeStoppage?.pausedAt ?? activeStoppage?.recordedAt ?? null;

  const activeStoppageId = activeStoppage?.id ?? null;
  const [timeoutAdjustment, setTimeoutAdjustment] = useState<{
    stoppageId: string | null;
    offsetSeconds: number;
  }>({ stoppageId: null, offsetSeconds: 0 });
  const durationOffset =
    timeoutAdjustment.stoppageId === activeStoppageId ? timeoutAdjustment.offsetSeconds : 0;
  const effectiveDuration = DEFAULT_TIMEOUT_SECONDS + durationOffset;

  const timeoutSecondsLeft = useCountdownSeconds({
    startedAt: activeStoppage?.reason === 'timeout' ? stoppageTimestamp : null,
    durationSeconds: effectiveDuration,
  });

  const adjustTimeout = (deltaSeconds: number) => {
    if (activeStoppageId === null) return;

    const currentDuration = effectiveDuration;
    const newDuration = Math.max(
      MIN_TIMEOUT_SECONDS,
      Math.min(MAX_TIMEOUT_SECONDS, currentDuration + deltaSeconds),
    );
    setTimeoutAdjustment({
      stoppageId: activeStoppageId,
      offsetSeconds: newDuration - DEFAULT_TIMEOUT_SECONDS,
    });
  };

  const canDecrement = effectiveDuration > MIN_TIMEOUT_SECONDS;
  const canIncrement = effectiveDuration < MAX_TIMEOUT_SECONDS;

  if (!activeStoppage) return null;

  const sideLabel =
    activeStoppage.sideId != null
      ? (game.sides.find((s) => s.id === activeStoppage.sideId)?.label ?? null)
      : null;

  const frozenPointElapsedMs =
    point != null && stoppageTimestamp != null
      ? getActivePlayElapsedMsAt(game, point, stoppageTimestamp)
      : null;
  // A point without a recorded start has no timing to show.
  const frozenPointTimeLabel =
    frozenPointElapsedMs == null ? '-:--' : formatPointTime(frozenPointElapsedMs);

  let timerColor: string;
  if (timeoutSecondsLeft <= 10) {
    timerColor = palette.danger;
  } else if (timeoutSecondsLeft <= 20) {
    timerColor = palette.warning;
  } else {
    timerColor = palette.success;
  }

  const injurySubs =
    activeStoppage.reason === 'injury' ? getSubsForStoppage(point, activeStoppage.id) : [];
  const isInjuryStoppage = activeStoppage.reason === 'injury';

  const handleResume = () => {
    resumeStoppage(activeStoppage.id);
  };

  const handleCancel = () => {
    cancelStoppage(activeStoppage.id);
  };

  let mainContent: React.ReactNode;
  let primaryBtn: React.ReactNode;

  if (activeStoppage.reason === 'timeout') {
    mainContent = (
      <View style={styles.centerBlock}>
        {sideLabel !== null && (
          <ThemedText style={[styles.sideLabel, { color: palette.textMuted }]}>
            {sideLabel.toUpperCase()}
          </ThemedText>
        )}
        <ThemedText style={[styles.bannerLabel, { color: palette.textMuted }]}>TIMEOUT</ThemedText>
        <View style={styles.timerAdjustRow}>
          <Pressable
            onPress={() => adjustTimeout(-10)}
            accessibilityRole="button"
            accessibilityLabel="Decrease timeout by 10 seconds"
            disabled={!canDecrement}
            style={styles.timerAdjustBtn}
            hitSlop={8}>
            <MaterialCommunityIcons
              name="minus"
              size={scaleBySizeClass(22, sizeClass)}
              color={!canDecrement ? palette.textMuted : palette.textInverse}
            />
          </Pressable>
          <ThemedText
            testID="stoppage-timeout-timer"
            style={[styles.countdownTimer, { color: timerColor }]}>
            {formatTimerSeconds(timeoutSecondsLeft)}
          </ThemedText>
          <Pressable
            onPress={() => adjustTimeout(10)}
            accessibilityRole="button"
            accessibilityLabel="Increase timeout by 10 seconds"
            disabled={!canIncrement}
            style={styles.timerAdjustBtn}
            hitSlop={8}>
            <MaterialCommunityIcons
              name="plus"
              size={scaleBySizeClass(22, sizeClass)}
              color={!canIncrement ? palette.textMuted : palette.textInverse}
            />
          </Pressable>
        </View>
      </View>
    );
    primaryBtn = (
      <Pressable
        testID="stoppage-resume"
        style={({ pressed }) => [
          styles.actionBtn,
          styles.resumeBtn,
          {
            borderColor: palette.success,
            backgroundColor: palette.success + '15',
          },
          pressed && { opacity: 0.7 },
        ]}
        onPress={handleResume}>
        <ThemedText style={[styles.actionBtnText, { color: palette.success }]}>RESUME</ThemedText>
      </Pressable>
    );
  } else if (activeStoppage.reason === 'manual_pause') {
    mainContent = (
      <View style={styles.centerBlock}>
        <ThemedText style={[styles.bannerLabel, { color: palette.textMuted }]}>PAUSED</ThemedText>
        <ThemedText style={[styles.frozenTimer, { color: palette.textInverse }]}>
          {frozenPointTimeLabel}
        </ThemedText>
      </View>
    );
    primaryBtn = (
      <Pressable
        testID="stoppage-resume"
        style={({ pressed }) => [
          styles.actionBtn,
          styles.resumeBtn,
          {
            borderColor: palette.success,
            backgroundColor: palette.success + '15',
          },
          pressed && { opacity: 0.7 },
        ]}
        onPress={handleResume}>
        <ThemedText style={[styles.actionBtnText, { color: palette.success }]}>RESUME</ThemedText>
      </Pressable>
    );
  } else {
    mainContent = (
      <View style={styles.centerBlock}>
        <ThemedText style={[styles.bannerLabel, { color: palette.warning }]}>INJURY</ThemedText>
        <ThemedText style={[styles.frozenTimer, { color: palette.textInverse }]}>
          {frozenPointTimeLabel}
        </ThemedText>
        {hasItems(injurySubs) && (
          <View style={styles.subSummary}>
            {injurySubs.map((sub) => {
              const subInNames = sub.inIds
                .map((id) => game.participants.find((participant) => participant.id === id)?.name)
                .filter(Boolean);
              const subOutNames = sub.outIds
                .map((id) => game.participants.find((participant) => participant.id === id)?.name)
                .filter(Boolean);
              const subSideLabel =
                game.sides.find((side) => side.id === sub.sideId)?.label ?? sub.sideId;

              return (
                <View key={sub.id} style={styles.subGroup}>
                  <ThemedText style={[styles.subSideLabel, { color: palette.textMuted }]}>
                    {subSideLabel.toUpperCase()}
                  </ThemedText>
                  <View style={styles.subRow}>
                    <ThemedText style={[styles.subChipLabel, { color: palette.success }]}>
                      IN
                    </ThemedText>
                    <ThemedText style={[styles.subNames, { color: palette.success }]}>
                      {subInNames.join(', ')}
                    </ThemedText>
                  </View>
                  <View style={styles.subRow}>
                    <ThemedText style={[styles.subChipLabel, { color: palette.danger }]}>
                      OUT
                    </ThemedText>
                    <ThemedText style={[styles.subNames, { color: palette.danger }]}>
                      {subOutNames.join(', ')}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );

    primaryBtn = null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {mainContent}
        {isInjuryStoppage ? (
          <View style={styles.buttonRow}>
            <Pressable
              testID="stoppage-resume"
              style={({ pressed }) => [
                styles.actionBtn,
                styles.resumeBtn,
                {
                  borderColor: palette.success,
                  backgroundColor: palette.success + '15',
                },
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleResume}>
              <ThemedText style={[styles.actionBtnText, { color: palette.success }]}>
                RESUME
              </ThemedText>
            </Pressable>
            <Pressable
              testID="stoppage-edit-sub"
              style={({ pressed }) => [
                styles.actionBtn,
                styles.resumeBtn,
                {
                  borderColor: palette.neutral,
                  backgroundColor: palette.overlay10,
                },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => router.push('/advanced-tracking/tracker-injury-sub')}>
              <ThemedText style={[styles.actionBtnText, { color: palette.neutral }]}>
                EDIT SUB
              </ThemedText>
            </Pressable>
            <Pressable
              testID="stoppage-cancel"
              onPress={handleCancel}
              hitSlop={8}
              style={[
                styles.cancelIconBtn,
                { borderColor: palette.overlay20, backgroundColor: palette.overlay05 },
              ]}>
              <MaterialCommunityIcons
                name="close"
                size={scaleBySizeClass(20, sizeClass)}
                color={palette.textMuted}
              />
            </Pressable>
          </View>
        ) : (
          <View style={styles.buttonRow}>
            {primaryBtn}
            <Pressable
              testID="stoppage-cancel"
              style={({ pressed }) => [
                styles.actionBtn,
                styles.cancelBtn,
                { borderColor: palette.overlay20, backgroundColor: palette.overlay05 },
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleCancel}>
              <ThemedText style={[styles.actionBtnText, { color: palette.textInverse }]}>
                CANCEL
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'center' },
    content: {
      alignItems: 'center',
      gap: scaleBySizeClass(40, sizeClass),
      paddingHorizontal: scaleBySizeClass(32, sizeClass),
    },
    centerBlock: {
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
    },
    sideLabel: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 2,
    },
    bannerLabel: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 3,
    },
    countdownTimer: {
      fontSize: scaleBySizeClass(72, sizeClass),
      fontFamily: Fonts.black,
      fontVariant: ['tabular-nums'],
      letterSpacing: 2,
    },
    timerAdjustRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(12, sizeClass),
    },
    timerAdjustBtn: {
      padding: scaleBySizeClass(12, sizeClass),
    },
    frozenTimer: {
      fontSize: scaleBySizeClass(64, sizeClass),
      fontFamily: Fonts.black,
      fontVariant: ['tabular-nums'],
      letterSpacing: 2,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: scaleBySizeClass(12, sizeClass),
      width: '100%',
      maxWidth: 400,
    },
    actionBtn: {
      paddingVertical: scaleBySizeClass(18, sizeClass),
      borderWidth: 1,
      borderRadius: 20,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
    },
    resumeBtn: { flex: 2 },
    cancelBtn: { flex: 1 },
    actionBtnText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(14, sizeClass),
      letterSpacing: 1,
    },
    cancelIconBtn: {
      width: scaleBySizeClass(56, sizeClass),
      paddingVertical: scaleBySizeClass(18, sizeClass),
      borderWidth: 1,
      borderRadius: 20,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
    },
    subSummary: {
      marginTop: scaleBySizeClass(8, sizeClass),
      gap: scaleBySizeClass(12, sizeClass),
      alignItems: 'flex-start',
    },
    subGroup: {
      gap: scaleBySizeClass(4, sizeClass),
      alignItems: 'flex-start',
    },
    subSideLabel: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(11, sizeClass),
      letterSpacing: 1.5,
      marginBottom: scaleBySizeClass(2, sizeClass),
    },
    subRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
    },
    subChipLabel: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(11, sizeClass),
      letterSpacing: 1.5,
      minWidth: scaleBySizeClass(28, sizeClass),
    },
    subNames: {
      fontFamily: Fonts.semiBold,
      fontSize: scaleBySizeClass(13, sizeClass),
    },
  });
}
