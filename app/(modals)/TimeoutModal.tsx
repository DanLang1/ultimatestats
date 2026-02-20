import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useTimeoutTimer } from '@/hooks/useTimeoutTimer';
import { useGameStore } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function TimeoutModal() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const { pendingTimeoutModal, events } = useGameStore();
  const {
    formattedTime,
    isRunning,
    isComplete,
    toggleTimer,
    adjustTimer,
    handleContinue,
    canDecrement,
    canIncrement,
  } = useTimeoutTimer();

  // Get the last timeout event to know which team called it
  const lastEvent = events[events.length - 1];
  const timeoutTeam =
    lastEvent?.type === 'timeout' ? (lastEvent.team === 'team1' ? 'Team 1' : 'Team 2') : 'Team';

  const styles = createStyles(sizeClass);
  if (!pendingTimeoutModal) {
    return <Redirect href="/" />;
  }

  const onClose = () => {
    // User closed modal - keep timeout state so banner shows on main screen
    // They can reopen the modal or let the timer continue in the background
    router.dismissTo('/');
  };

  const onContinue = () => {
    handleContinue();
    router.dismissTo('/');
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: 'rgba(0,0,0,0.88)',
            padding: 16,
          },
        ]}>
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[styles.container, { backgroundColor: palette.primary }]}>
          {/* Close button - top right */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            hitSlop={12}>
            <MaterialCommunityIcons
              name="close"
              size={scaleBySizeClass(20, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>

          <View style={styles.headerCenteredRow}>
            <MaterialCommunityIcons
              name="timer-sand"
              size={scaleBySizeClass(16, sizeClass)}
              color={palette.accent}
            />
            <Text style={[styles.headerText, { color: palette.textMuted }]}>TIMEOUT</Text>
            <Text style={[styles.teamText, { color: palette.textMuted }]}>{timeoutTeam}</Text>
          </View>

          <View style={styles.content}>
            {/* Timer display with +/- controls */}
            <View style={[styles.timerCompact, { backgroundColor: palette.overlay05 }]}>
              <Pressable
                onPress={() => adjustTimer(-10)}
                disabled={!canDecrement}
                style={[styles.timerBtnCompact]}>
                <MaterialCommunityIcons
                  name="minus"
                  size={scaleBySizeClass(20, sizeClass)}
                  color={!canDecrement ? palette.textMuted : palette.textInverse}
                />
              </Pressable>

              <Pressable onPress={toggleTimer} style={styles.timerDisplayCompact}>
                <Text
                  style={[
                    styles.timerValueCompact,
                    { color: isComplete ? palette.success : palette.textInverse },
                  ]}>
                  {formattedTime}
                </Text>
                <Text style={[styles.timerStateCompact, { color: palette.textMuted }]}>
                  {isRunning ? 'PAUSE' : 'START'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => adjustTimer(10)}
                disabled={!canIncrement}
                style={[styles.timerBtnCompact]}>
                <MaterialCommunityIcons
                  name="plus"
                  size={scaleBySizeClass(20, sizeClass)}
                  color={!canIncrement ? palette.textMuted : palette.textInverse}
                />
              </Pressable>
            </View>

            {/* Continue button */}
            <Pressable
              onPress={onContinue}
              style={({ pressed }) => [
                styles.continueBtnCompact,
                { backgroundColor: palette.accent },
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}>
              <Text style={[styles.continueBtnTextCompact, { color: palette.textOnAccent }]}>
                END TIMEOUT
              </Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={scaleBySizeClass(16, sizeClass)}
                color={palette.textOnAccent}
              />
            </Pressable>
          </View>
        </Animated.View>
      </View>
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
    container: {
      width: '100%',
      maxWidth: 400,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    headerCenteredRow: {
      paddingTop: 16,
      paddingBottom: 4,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: 12,
      zIndex: 10,
    },
    headerText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '800',
      letterSpacing: 2,
    },
    teamText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontWeight: '600',
    },
    content: {
      padding: 24,
      alignItems: 'center',
      gap: 20,
    },
    timerCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      padding: 12,
      paddingHorizontal: 20,
      borderRadius: 24,
    },
    timerBtnCompact: {
      padding: 12,
    },
    timerDisplayCompact: {
      alignItems: 'center',
      minWidth: 100,
    },
    timerValueCompact: {
      fontSize: scaleBySizeClass(48, sizeClass),
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    timerStateCompact: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    continueBtnCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 40,
      borderRadius: 8,
      width: '100%',
    },
    continueBtnTextCompact: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '800',
      letterSpacing: 1,
    },
    closeBtn: {
      position: 'absolute',
      top: 12,
      right: 12,
      padding: 4,
      zIndex: 20,
    },
  });
}
