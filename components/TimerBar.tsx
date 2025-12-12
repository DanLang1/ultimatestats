import { palette } from '@/constants/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

interface TimerBarProps {
  onReset: () => void;
}

export default function TimerBar({ onReset }: TimerBarProps) {
  const [timeLeft, setTimeLeft] = useState(90 * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: number;
    if (isActive) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (timeLeft === 0 && isActive) {
      setIsActive(false);
    }
  }, [timeLeft, isActive]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(90 * 60);
    onReset();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, styles.containerLandscape]}>
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
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowRadius: 3.84,
  },
  containerLandscape: {
    flexDirection: 'column',
    paddingHorizontal: 10,
    paddingVertical: 20,
    minHeight: 200,
    gap: 15,
  },
  timerText: {
    fontFamily: Platform.select({
      ios: 'Courier',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.white,
  },
  iconButton: {
    padding: 5,
  },
});
