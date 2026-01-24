import { useTheme } from '@/context/ThemeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useGameTimer } from '@/hooks/useGameTimer';
import { formatRatio, getExpectedRatio } from '@/lib/genderRatioUtils';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FlashingIcon from './ui/FlashingIcon';

interface SettingsBarProps {
  onUndo: () => void;
}

export default function SettingsBar({ onUndo }: SettingsBarProps) {
  const { timeLeft, isActive, toggleTimer } = useGameTimer();
  const { isSoftCap, softCapPending, events, statTrackingEnabled, currentPoint } = useGameStore();

  const { genderRatioEnabled, firstPointRatio } = useSettingsStore();
  const { palette } = useTheme();

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
    <View style={[styles.container, { backgroundColor: barBg }]}>
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
        <View style={styles.ratioContainer}>
          <Text style={[styles.ratioText, { color: barContentColor }]}>
            {formatRatio(getExpectedRatio(currentPoint, firstPointRatio))}
          </Text>
        </View>
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
    justifyContent: 'center',
  },
  ratioText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
