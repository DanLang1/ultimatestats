import ScoreDisplay from '@/components/ScoreDisplay';
import TeamText from '@/components/TeamText';
import { ThemedView } from '@/components/ThemedView';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
  timeouts?: number;
  onTimeoutUse?: () => void;
}

export default function TeamScoreSection({
  teamName,
  score,
  onIncrement,
  onDecrement,
  textColor,
  backgroundColor,
  onSettingsPress,
  timeouts = 0,
  onTimeoutUse,
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
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {onSettingsPress && (
        <Pressable onPress={onSettingsPress} style={styles.settingsIcon}>
          <MaterialCommunityIcons name="cog" size={24} color={textColor} />
        </Pressable>
      )}

      {/* Top 1/3: Timeouts */}
      <View style={styles.timeoutArea}>
        <View style={styles.timeoutContainer}>
          {[...Array(2)].map((_, index) => (
            <Pressable
              key={index}
              onPress={index < timeouts ? onTimeoutUse : undefined}
              style={[
                styles.timeoutIndicator,
                {
                  backgroundColor: index < timeouts ? textColor : 'transparent',
                  borderColor: textColor,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Bottom 2/3: Gestures & Score */}
      <GestureDetector gesture={composedGesture}>
        <Pressable onPress={onIncrement} style={styles.scoreArea}>
          <TeamText color={textColor} teamName={teamName} />
          <ScoreDisplay bgColor={backgroundColor} textColor={textColor} score={score} />
        </Pressable>
      </GestureDetector>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  settingsIcon: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  timeoutArea: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },
  timeoutContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  timeoutIndicator: {
    width: 20,
    height: 20,
    borderRadius: 12,
    borderWidth: 2,
  },
  scoreArea: {
    flex: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
});
