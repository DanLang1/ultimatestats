import { palette } from '@/constants/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useGameTimer } from '@/hooks/useGameTimer';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface SettingsBarProps {
  onReset: () => void;
  onSettingsPress: () => void;
}

export default function SettingsBar({ onReset, onSettingsPress }: SettingsBarProps) {
  const { timeLeft, isActive, toggleTimer, resetTimer } = useGameTimer();

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
          color={palette.white}
        />
      </Pressable>

      {/* Timer Text */}
      <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>

      {/* Settings */}
      <Pressable onPress={onSettingsPress} style={styles.iconButton}>
        <MaterialCommunityIcons name="cog" size={24} color={palette.white} />
      </Pressable>

      {/* Reset */}
      <Pressable onPress={handleReset} style={styles.iconButton}>
        <MaterialCommunityIcons name="restart" size={24} color={palette.white} />
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
  timerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.white,
  },
  iconButton: {
    padding: 5,
  },
});
