import { useTheme } from '@/context/ThemeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useGameTimer } from '@/hooks/useGameTimer';
import { useGameStore } from '@/store/gameStore';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FlashingIcon from './ui/FlashingIcon';

interface SettingsBarProps {
  onUndo: () => void;
  onSettingsPress: () => void;
}

export default function SettingsBar({ onUndo, onSettingsPress }: SettingsBarProps) {
  const { timeLeft, isActive, toggleTimer } = useGameTimer();
  const { isSoftCap, softCapPending, actionHistory, statTrackingEnabled } = useGameStore();
  const { palette, themeMode } = useTheme();

  const canUndo = (actionHistory?.length ?? 0) > 0;

  // In Light Mode, we want a dark bar for contrast (surface=Navy, textPrimary=White).
  // In Dark Mode, we want the distinct Indigo bar (secondary=Indigo, textInverse=White).
  const barBg = themeMode === 'light' ? palette.surface : palette.secondary;
  const barContentColor = themeMode === 'light' ? palette.textPrimary : palette.textInverse;

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

      {statTrackingEnabled && (
        <Pressable onPress={() => router.push('/ViewStats')} style={styles.iconButton}>
          <MaterialCommunityIcons name="chart-bar" size={24} color={barContentColor} />
        </Pressable>
      )}

      {/* Info - now navigates to page */}
      <Pressable onPress={() => router.push('/GameInfo')} style={styles.iconButton}>
        <MaterialCommunityIcons name="information" size={24} color={barContentColor} />
      </Pressable>

      {/* Settings */}
      <Pressable onPress={onSettingsPress} style={styles.iconButton}>
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
    shadowRadius: 3.84,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 50,
    minWidth: 300,
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
});
