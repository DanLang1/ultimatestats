import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, SizeClass, useLayout } from '@/hooks/useLayout';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { ThemedText } from '@/components/ThemedText';
import { useGameTimer } from '@/hooks/useGameTimer';
import { formatRatio, getExpectedRatio, getSequenceNumber } from '@/lib/genderRatioUtils';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AlertModal } from './ui/AlertModal';
import FlashingIcon from './ui/FlashingIcon';

interface SettingsBarProps {
  onUndo: () => void;
}

export default function SettingsBar({ onUndo }: SettingsBarProps) {
  const { timeLeft, isActive, toggleTimer } = useGameTimer();
  const { isSoftCap, softCapPending, events, statTrackingEnabled, currentPoint } = useGameStore();

  const { genderRatioEnabled, firstPointRatio } = useSettingsStore();
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const iconSize = getSizeClassValue({ small: 24, medium: 26, large: 28 }, sizeClass);

  const [showAbbaModal, setShowAbbaModal] = useState(false);

  const canUndo = (events?.length ?? 0) > 0;

  // Match the floating action bar's glassmorphic background
  const barBg = palette.glassBg;
  const barContentColor = palette.textInverse;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  let capIcon: React.ReactNode;
  if (timeLeft === 0) {
    capIcon = <MaterialCommunityIcons name="hard-hat" size={iconSize} color={barContentColor} />;
  } else if (isSoftCap || softCapPending) {
    capIcon = (
      <FlashingIcon
        name="hat-fedora"
        size={iconSize}
        color={barContentColor}
        isFlashing={softCapPending && !isSoftCap}
      />
    );
  } else {
    capIcon = null;
  }

  return (
    <View style={[styles.container, { backgroundColor: barBg, shadowColor: palette.shadow }]}>
      {/* Play/Pause */}
      <Pressable onPress={toggleTimer} style={styles.iconButton}>
        <MaterialCommunityIcons
          name={isActive ? 'pause' : 'play'}
          size={iconSize}
          color={barContentColor}
        />
      </Pressable>

      {/* Timer Text */}
      <View style={styles.timerContainer}>
        <ThemedText style={[styles.timerText, { color: barContentColor }]}>
          {formatTime(timeLeft)}
        </ThemedText>
        {capIcon}
      </View>

      {/* Gender Ratio Indicator */}
      {genderRatioEnabled && firstPointRatio && (
        <Pressable onPress={() => setShowAbbaModal(true)} style={styles.ratioContainer}>
          <ThemedText style={[styles.ratioText, { color: barContentColor }]}>
            {formatRatio(
              getExpectedRatio(currentPoint, firstPointRatio),
              getSequenceNumber(currentPoint),
            )}
          </ThemedText>
        </Pressable>
      )}

      {/* Stats - only show when stat tracking enabled */}
      {statTrackingEnabled && (
        <Pressable onPress={() => router.push('/ViewStats')} style={styles.iconButton}>
          <MaterialCommunityIcons name="chart-bar" size={iconSize} color={barContentColor} />
        </Pressable>
      )}

      {/* Info */}
      <Pressable onPress={() => router.push('/GameInfo')} style={styles.iconButton}>
        <MaterialCommunityIcons name="information" size={iconSize} color={barContentColor} />
      </Pressable>

      {/* Settings */}
      <Pressable onPress={() => router.push('/Settings')} style={styles.iconButton}>
        <MaterialCommunityIcons name="cog" size={iconSize} color={barContentColor} />
      </Pressable>

      {/* Undo */}
      <Pressable
        onPress={onUndo}
        style={[styles.iconButton, !canUndo && styles.iconButtonDisabled]}
        disabled={!canUndo}>
        <MaterialCommunityIcons name="undo" size={iconSize} color={barContentColor} />
      </Pressable>

      {/* ABBA Rule Explanation Modal */}
      <AlertModal
        visible={showAbbaModal}
        title="Ratio Rule A (ABBA)"
        onClose={() => setShowAbbaModal(false)}>
        <ThemedText style={[styles.abbaText, { color: palette.textInverse }]}>
          Gender ratio is tracked by the Ratio Rule A or ABBA method.
        </ThemedText>
        <ThemedText style={[styles.abbaText, { color: palette.textInverse }]}>
          Prefix F or M indicate gender majority, the number indicates if it is the first or second
          point with this gender majority.
        </ThemedText>
        <Pressable
          onPress={() => Linking.openURL('https://usaultimate.org/rules/')}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <ThemedText style={[styles.abbaSource, { color: palette.accent }]}>
            USAU Rules of Ultimate, Appendix B1.B
          </ThemedText>
        </Pressable>
      </AlertModal>
    </View>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  const horizontalPadding = getSizeClassValue({ small: 20, medium: 24, large: 28 }, sizeClass);
  const verticalPadding = getSizeClassValue({ small: 10, medium: 12, large: 14 }, sizeClass);
  const minHeight = getSizeClassValue({ small: 50, medium: 58, large: 64 }, sizeClass);
  const gap = getSizeClassValue({ small: 15, medium: 18, large: 22 }, sizeClass);
  const timerTextSize = getSizeClassValue({ small: 20, medium: 22, large: 24 }, sizeClass);
  const ratioTextSize = getSizeClassValue({ small: 18, medium: 20, large: 22 }, sizeClass);
  const iconButtonPadding = getSizeClassValue({ small: 5, medium: 7, large: 8 }, sizeClass);

  return StyleSheet.create({
    container: {
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      borderRadius: isLandscape ? 0 : 20,
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      flexDirection: 'row',
      paddingHorizontal: horizontalPadding,
      paddingVertical: verticalPadding,
      minHeight,
      minWidth: 220,
      gap,
    },
    timerContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 5,
    },
    timerText: {
      fontSize: timerTextSize,
      fontFamily: Fonts.bold,
      fontVariant: ['tabular-nums'],
    },
    iconButton: {
      padding: iconButtonPadding,
    },
    iconButtonDisabled: {
      opacity: 0.3,
    },
    ratioContainer: {
      alignSelf: 'center',
    },
    ratioText: {
      fontSize: ratioTextSize,
      fontFamily: Fonts.bold,
    },
    abbaText: {
      fontSize: getSizeClassValue({ small: 14, medium: 15, large: 16 }, sizeClass),
      lineHeight: getSizeClassValue({ small: 20, medium: 22, large: 24 }, sizeClass),
      marginBottom: 12,
    },
    abbaSource: {
      fontSize: getSizeClassValue({ small: 12, medium: 13, large: 14 }, sizeClass),
      fontStyle: 'italic',
      marginTop: 4,
    },
  });
}
