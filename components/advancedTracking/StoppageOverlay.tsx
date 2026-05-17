import { ThemedText } from '@/components/ThemedText';
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
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

const TIMEOUT_DURATION_S = 70;

const formatCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

interface StoppageOverlayProps {
  game: AdvancedTrackedGame;
}

export const StoppageOverlay = ({ game }: StoppageOverlayProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const { cancelStoppage, resumeStoppage } = useAdvancedTrackingStore();

  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  const activeStoppage = getActiveStoppage(possession);

  const stoppageTimestamp = activeStoppage?.pausedAt ?? activeStoppage?.recordedAt ?? null;

  const timeoutSecondsLeft = useTimestampTimer({
    timestamp: stoppageTimestamp,
    mode: 'countdown',
    durationSeconds: TIMEOUT_DURATION_S,
    intervalMs: 250,
    enabled: activeStoppage?.reason === 'timeout',
  });

  if (!activeStoppage) return null;

  const sideLabel =
    activeStoppage.sideId != null
      ? (game.sides.find((s) => s.id === activeStoppage.sideId)?.label ?? null)
      : null;

  const pointTimerBase = point ? getPointAdjustedTimestamp(point) : null;
  const frozenPointElapsedMs =
    stoppageTimestamp != null && pointTimerBase != null ? stoppageTimestamp - pointTimerBase : 0;

  let timerColor: string;
  if (timeoutSecondsLeft <= 10) {
    timerColor = palette.danger;
  } else if (timeoutSecondsLeft <= 20) {
    timerColor = palette.warning;
  } else {
    timerColor = palette.success;
  }

  const injurySub =
    activeStoppage.reason === 'injury' ? getSubForStoppage(point, activeStoppage.id) : null;

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
        <ThemedText style={[styles.countdownTimer, { color: timerColor }]}>
          {formatCountdown(timeoutSecondsLeft)}
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
            boxShadow: `0 0 16px ${palette.success}30`,
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
          {formatPointTime(frozenPointElapsedMs)}
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
            boxShadow: `0 0 16px ${palette.success}30`,
          },
          pressed && { opacity: 0.7 },
        ]}
        onPress={handleResume}>
        <ThemedText style={[styles.actionBtnText, { color: palette.success }]}>RESUME</ThemedText>
      </Pressable>
    );
  } else {
    const subInNames = injurySub
      ? injurySub.inIds
          .map((id) => game.participants.find((p) => p.id === id)?.name)
          .filter(Boolean)
      : [];
    const subOutNames = injurySub
      ? injurySub.outIds
          .map((id) => game.participants.find((p) => p.id === id)?.name)
          .filter(Boolean)
      : [];

    mainContent = (
      <View style={styles.centerBlock}>
        <ThemedText style={[styles.bannerLabel, { color: palette.warning }]}>INJURY</ThemedText>
        <ThemedText style={[styles.frozenTimer, { color: palette.textInverse }]}>
          {formatPointTime(frozenPointElapsedMs)}
        </ThemedText>
        {injurySub && (
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

    primaryBtn = null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {mainContent}
        {injurySub ? (
          <View style={styles.buttonRow}>
            <Pressable
              testID="stoppage-resume"
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
              onPress={() => router.push('/advancedTracking/TrackerInjurySub')}>
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
