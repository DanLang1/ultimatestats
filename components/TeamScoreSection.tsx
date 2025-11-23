import ScoreDisplay from '@/components/ScoreDisplay';
import TeamText from '@/components/TeamText';
import { ThemedView } from '@/components/ThemedView';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

interface TeamScoreSectionProps {
  teamName: string;
  score: number;
  onIncrement: () => void;
  onDecrement: () => void;
  textColor: string;
  backgroundColor: string;
  onSettingsPress?: () => void;
}

export default function TeamScoreSection({
  teamName,
  score,
  onIncrement,
  onDecrement,
  textColor,
  backgroundColor,
  onSettingsPress,
}: TeamScoreSectionProps) {
  const flingUp = Gesture.Fling()
    .direction(Directions.UP)
    .onEnd(() => {
      scheduleOnRN(onIncrement);
    });

  const flingDown = Gesture.Fling()
    .direction(Directions.DOWN)
    .onEnd(() => {
      scheduleOnRN(onDecrement);
    });

  const composedGesture = Gesture.Simultaneous(flingDown, flingUp);

  return (
    <Pressable onPress={onIncrement} style={{ flex: 1 }}>
      <GestureDetector gesture={composedGesture}>
        <ThemedView style={[styles.container, { backgroundColor }]}>
          {onSettingsPress && (
            <Pressable onPress={onSettingsPress} style={styles.settingsIcon}>
              <MaterialCommunityIcons name="cog" size={24} color={textColor} />
            </Pressable>
          )}
          <TeamText color={textColor} teamName={teamName} />
          <ScoreDisplay bgColor={backgroundColor} textColor={textColor} score={score} />
        </ThemedView>
      </GestureDetector>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
});
