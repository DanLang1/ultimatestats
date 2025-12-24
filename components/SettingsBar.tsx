import { palette } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useGameTimer } from '@/hooks/useGameTimer';
import { useGameStore } from '@/store/gameStore';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface SettingsBarProps {
  onReset: () => void;
  onSettingsPress: () => void;
}

export default function SettingsBar({ onReset, onSettingsPress }: SettingsBarProps) {
  const { timeLeft, isActive, toggleTimer, resetTimer } = useGameTimer();
  const { isSoftCap, softCapPending } = useGameStore();

  const handleReset = () => {
    resetTimer();
    onReset();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Play/Pause */}
      <Pressable onPress={toggleTimer} style={styles.iconButton}>
        <MaterialCommunityIcons
          name={isActive ? 'pause' : 'play'}
          size={24}
          color={palette.textInverse}
        />
      </Pressable>

      {/* Timer Text */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        {timeLeft === 0 ? (
          <MaterialCommunityIcons name="hard-hat" size={24} color={palette.textInverse} />
        ) : isSoftCap || softCapPending ? (
          <MaterialCommunityIcons name="hat-fedora" size={24} color={palette.textInverse} />
        ) : null}
      </View>

      <Pressable onPress={() => router.push('/ViewStats')} style={styles.iconButton}>
        <MaterialCommunityIcons name="chart-bar" size={24} color={palette.textInverse} />
      </Pressable>

      {/* Info - now navigates to page */}
      <Pressable onPress={() => router.push('/GameInfo')} style={styles.iconButton}>
        <MaterialCommunityIcons name="information" size={24} color={palette.textInverse} />
      </Pressable>

      {/* Settings */}
      <Pressable onPress={onSettingsPress} style={styles.iconButton}>
        <MaterialCommunityIcons name="cog" size={24} color={palette.textInverse} />
      </Pressable>

      {/* Reset */}
      <Pressable onPress={handleReset} style={styles.iconButton}>
        <MaterialCommunityIcons name="restart" size={24} color={palette.textInverse} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.secondary,
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
    color: palette.textInverse,
  },
  softcapText: {
    fontSize: 10,
    color: palette.textInverse,
    fontWeight: '600',
    marginTop: -2,
  },
  iconButton: {
    padding: 5,
  },
});
