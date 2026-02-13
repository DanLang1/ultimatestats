import { useTheme } from '@/context/ThemeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useGameTimer } from '@/hooks/useGameTimer';
import { formatRatio, getExpectedRatio, getSequenceNumber } from '@/lib/genderRatioUtils';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

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

  return (
    <View
      style={[styles.container, { backgroundColor: barBg }, !isLandscape && { borderRadius: 20 }]}>
      {/* Play/Pause */}
      <Pressable onPress={toggleTimer} style={styles.iconButton}>
        <MaterialCommunityIcons
          name={isActive ? 'pause' : 'play'}
          size={24}
          color={barContentColor}
        />
      </Pressable>

      {/* Timer Text */}
      <View style={styles.timerContainer}>
        <Text style={[styles.timerText, { color: barContentColor }]}>{formatTime(timeLeft)}</Text>
        {timeLeft === 0 ? (
          <MaterialCommunityIcons name="hard-hat" size={24} color={barContentColor} />
        ) : isSoftCap || softCapPending ? (
          <FlashingIcon
            name="hat-fedora"
            size={24}
            color={barContentColor}
            isFlashing={softCapPending && !isSoftCap}
          />
        ) : null}
      </View>

      {/* Gender Ratio Indicator */}
      {genderRatioEnabled && firstPointRatio && (
        <Pressable onPress={() => setShowAbbaModal(true)} style={styles.ratioContainer}>
          <Text style={[styles.ratioText, { color: barContentColor }]}>
            {formatRatio(
              getExpectedRatio(currentPoint, firstPointRatio),
              getSequenceNumber(currentPoint),
            )}
          </Text>
        </Pressable>
      )}

      {/* Stats - only show when stat tracking enabled */}
      {statTrackingEnabled && (
        <Pressable onPress={() => router.push('/ViewStats')} style={styles.iconButton}>
          <MaterialCommunityIcons name="chart-bar" size={24} color={barContentColor} />
        </Pressable>
      )}

      {/* Info */}
      <Pressable onPress={() => router.push('/GameInfo')} style={styles.iconButton}>
        <MaterialCommunityIcons name="information" size={24} color={barContentColor} />
      </Pressable>

      {/* Settings */}
      <Pressable onPress={() => router.push('/Settings')} style={styles.iconButton}>
        <MaterialCommunityIcons name="cog" size={24} color={barContentColor} />
      </Pressable>

      {/* Undo */}
      <Pressable
        onPress={onUndo}
        style={[styles.iconButton, !canUndo && styles.iconButtonDisabled]}
        disabled={!canUndo}>
        <MaterialCommunityIcons name="undo" size={24} color={barContentColor} />
      </Pressable>

      {/* ABBA Rule Explanation Modal */}
      <AlertModal
        visible={showAbbaModal}
        title="Ratio Rule A (ABBA)"
        onClose={() => setShowAbbaModal(false)}>
        <Text style={[styles.abbaText, { color: palette.textInverse }]}>
          Gender ratio is tracked by the Ratio Rule A or ABBA method.
        </Text>
        <Text style={[styles.abbaText, { color: palette.textInverse }]}>
          Prefix F or M indicate gender majority, the number indicates if it is the first or second
          point with this gender majority.
        </Text>
        <Pressable
          onPress={() => Linking.openURL('https://usaultimate.org/rules/')}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[styles.abbaSource, { color: palette.accent }]}>
            USAU Rules of Ultimate, Appendix B1.B
          </Text>
        </Pressable>
      </AlertModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 50,
    minWidth: 220,
    gap: 15,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  timerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  iconButton: {
    padding: 5,
  },
  iconButtonDisabled: {
    opacity: 0.3,
  },
  ratioContainer: {
    alignSelf: 'center',
  },
  ratioText: {
    fontSize: 18,
    fontWeight: '700',
  },
  abbaText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  abbaSource: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
