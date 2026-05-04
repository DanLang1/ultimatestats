import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { useTimestampTimer } from '@/hooks/advancedTracking/useTimer';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  formatPointTime,
  getActiveStoppage,
  getPointAdjustedTimestamp,
  getSubForStoppage,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import { getCurrentPoint, getCurrentPossession } from '@/lib/advancedTracking/trackingUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';
import { Redirect, router, Stack } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

const TIMEOUT_DURATION_S = 70;

export default function TrackerStoppageScreen() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const { currentGameId, savedGames, resumeStoppage, undoLastOperation } =
    useAdvancedTrackingStore();
  const game = savedGames.find((g) => g.id === currentGameId);
  const point = game ? getCurrentPoint(game) : null;
  const possession = game ? getCurrentPossession(game) : null;
  const activeStoppage = getActiveStoppage(possession);

  const stoppageTimestamp = activeStoppage?.pausedAt ?? activeStoppage?.recordedAt ?? null;
  const pointTimerBase = point ? getPointAdjustedTimestamp(point) : null;

  const timeoutSecondsLeft = useTimestampTimer({
    timestamp: stoppageTimestamp,
    mode: 'countdown',
    durationSeconds: TIMEOUT_DURATION_S,
    intervalMs: 250,
    enabled: activeStoppage?.reason === 'timeout',
  });

  if (!currentGameId || !game) {
    return <Redirect href="/Dashboard" />;
  }

  if (!activeStoppage) {
    return <Redirect href="/advancedTracking/Tracker" />;
  }

  const sideLabel =
    activeStoppage.sideId != null
      ? (game.sides.find((s) => s.id === activeStoppage.sideId)?.label ?? null)
      : null;

  const frozenPointElapsedMs =
    stoppageTimestamp != null && pointTimerBase != null ? stoppageTimestamp - pointTimerBase : 0;

  const formatCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  let timerColor: string;
  if (timeoutSecondsLeft <= 10) {
    timerColor = palette.danger;
  } else if (timeoutSecondsLeft <= 20) {
    timerColor = palette.warning;
  } else {
    timerColor = palette.success;
  }

  const handleResume = () => {
    resumeStoppage(activeStoppage.id);
    router.replace('/advancedTracking/Tracker');
  };

  const handleUndo = () => {
    undoLastOperation();
    // No navigation needed: if the stoppage was undone, the existing redirect
    // (activeStoppage == null → Redirect to Tracker) handles navigation automatically.
    // If only the sub was undone, this screen re-renders in the pre-sub state.
  };

  let mainContent: React.ReactNode;

  if (activeStoppage.reason === 'timeout') {
    mainContent = (
      <View style={styles.centerBlock}>
        {sideLabel !== null && (
          <ThemedText style={[styles.sideLabel, { color: palette.textMuted }]}>
            {sideLabel.toUpperCase()}
          </ThemedText>
        )}
        <ThemedText style={[styles.bannerLabel, { color: palette.textMuted }]}>TIMEOUT</ThemedText>
        <ThemedText style={[styles.countdownTimer, { color: timerColor }]}>
          {formatCountdown(timeoutSecondsLeft)}
        </ThemedText>
      </View>
    );
  } else if (activeStoppage.reason === 'manual_pause') {
    mainContent = (
      <View style={styles.centerBlock}>
        <ThemedText style={[styles.bannerLabel, { color: palette.textMuted }]}>PAUSED</ThemedText>
        <ThemedText style={[styles.frozenTimer, { color: palette.textInverse }]}>
          {formatPointTime(frozenPointElapsedMs)}
        </ThemedText>
      </View>
    );
  } else {
    // injury
    const existingSub = getSubForStoppage(point, activeStoppage.id);
    const subInNames = existingSub
      ? existingSub.inIds
          .map((id) => game.participants.find((p) => p.id === id)?.name)
          .filter(Boolean)
      : [];
    const subOutNames = existingSub
      ? existingSub.outIds
          .map((id) => game.participants.find((p) => p.id === id)?.name)
          .filter(Boolean)
      : [];

    mainContent = (
      <View style={styles.centerBlock}>
        <ThemedText style={[styles.bannerLabel, { color: palette.warning }]}>INJURY</ThemedText>
        <ThemedText style={[styles.frozenTimer, { color: palette.textInverse }]}>
          {formatPointTime(frozenPointElapsedMs)}
        </ThemedText>
        {existingSub && (
          <View style={styles.subSummary}>
            <View style={styles.subRow}>
              <ThemedText style={[styles.subChipLabel, { color: palette.success }]}>IN</ThemedText>
              <ThemedText style={[styles.subNames, { color: palette.success }]}>
                {subInNames.join(', ')}
              </ThemedText>
            </View>
            <View style={styles.subRow}>
              <ThemedText style={[styles.subChipLabel, { color: palette.danger }]}>OUT</ThemedText>
              <ThemedText style={[styles.subNames, { color: palette.danger }]}>
                {subOutNames.join(', ')}
              </ThemedText>
            </View>
          </View>
        )}
      </View>
    );

    const primaryBtn = existingSub ? (
      <Pressable
        style={({ pressed }) => [
          styles.actionBtn,
          styles.resumeBtn,
          {
            borderColor: palette.success,
            backgroundColor: palette.success + '15',
            boxShadow: `0 0 16px ${palette.success}30`,
          },
          pressed && { opacity: 0.7 },
        ]}
        onPress={handleResume}>
        <ThemedText style={[styles.actionBtnText, { color: palette.success }]}>RESUME</ThemedText>
      </Pressable>
    ) : (
      <Pressable
        style={({ pressed }) => [
          styles.actionBtn,
          styles.resumeBtn,
          {
            borderColor: palette.warning,
            backgroundColor: palette.warning + '15',
            boxShadow: `0 0 16px ${palette.warning}30`,
          },
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => router.push('/advancedTracking/TrackerInjurySub')}>
        <ThemedText style={[styles.actionBtnText, { color: palette.warning }]}>
          RECORD SUB
        </ThemedText>
      </Pressable>
    );

    return (
      <ThemedView style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.content}>
          {mainContent}
          <View style={styles.buttonRow}>
            {primaryBtn}
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.undoBtn,
                { borderColor: palette.overlay20, backgroundColor: palette.overlay05 },
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleUndo}>
              <ThemedText style={[styles.actionBtnText, { color: palette.textInverse }]}>
                UNDO
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        {mainContent}
        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.resumeBtn,
              {
                borderColor: palette.success,
                backgroundColor: palette.success + '15',
                boxShadow: `0 0 16px ${palette.success}30`,
              },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleResume}>
            <ThemedText style={[styles.actionBtnText, { color: palette.success }]}>
              RESUME
            </ThemedText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.undoBtn,
              { borderColor: palette.overlay20, backgroundColor: palette.overlay05 },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleUndo}>
            <ThemedText style={[styles.actionBtnText, { color: palette.textInverse }]}>
              UNDO
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    screen: { flex: 1 },
    content: {
      flex: 1,
      justifyContent: 'center',
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
    resumeBtn: {
      flex: 2,
    },
    undoBtn: {
      flex: 1,
    },
    actionBtnText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(14, sizeClass),
      letterSpacing: 1,
    },
    subSummary: {
      marginTop: scaleBySizeClass(8, sizeClass),
      gap: scaleBySizeClass(4, sizeClass),
      alignItems: 'flex-start',
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
