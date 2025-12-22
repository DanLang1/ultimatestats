import ScoreDisplay from '@/components/ScoreDisplay';
import TeamText from '@/components/TeamText';
import { ThemedView } from '@/components/ThemedView';
import { palette } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

interface TeamScoreSectionProps {
  teamName: string;
  score: number;
  onIncrement: () => void;
  onDecrement: () => void;
  textColor: string;
  backgroundColor: string;

  timeouts?: { active: boolean; isFloater: boolean }[];
  onTimeoutUse?: (index: number) => void;

  // Possession tracking (optional - only when stat tracking is enabled)
  hasPossession?: boolean;
  onTurnover?: () => void;
  side?: 'left' | 'right';
}

export default function TeamScoreSection({
  teamName,
  score,
  onIncrement,
  onDecrement,
  textColor,
  backgroundColor,
  timeouts = [],
  onTimeoutUse,
  hasPossession,
  onTurnover,
  side,
}: TeamScoreSectionProps) {
  // Fling up = score, only allowed if this team has possession (or possession tracking is disabled)
  const flingUp = Gesture.Fling()
    .direction(Directions.UP)
    .enabled(hasPossession === undefined || hasPossession === true)
    .onEnd(() => {
      scheduleOnRN(onIncrement);
    });

  // Fling down = decrement score, always allowed (for corrections)
  const flingDown = Gesture.Fling()
    .direction(Directions.DOWN)
    .onEnd(() => {
      scheduleOnRN(onDecrement);
    });

  const composedGesture = Gesture.Simultaneous(flingDown, flingUp);

  // Determine what happens on tap
  // If possession tracking is enabled (hasPossession is defined):
  //   - If this team HAS possession: tap = score (they scored)
  //   - If this team does NOT have possession: tap = turnover (flip possession)
  // If possession tracking is disabled (hasPossession is undefined): tap = score (original behavior)
  const handleTap = () => {
    if (hasPossession === undefined) {
      // Possession tracking disabled - original behavior
      onIncrement();
    } else if (hasPossession) {
      // This team has the disc - they scored
      onIncrement();
    } else if (onTurnover) {
      // This team doesn't have the disc - turnover
      onTurnover();
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Static border overlay when team has possession */}
      {hasPossession && <Animated.View pointerEvents="none" />}

      {/* Top 1/3: Timeouts */}
      <View style={styles.timeoutArea}>
        <View style={styles.timeoutContainer}>
          {timeouts.map((timeout, index) => (
            <Pressable
              key={index}
              onPress={() => onTimeoutUse?.(index)}
              style={[
                styles.timeoutIndicator,
                timeout.isFloater && {
                  borderColor: timeout.active ? palette.accent : textColor,
                  borderWidth: 2,
                },
                {
                  backgroundColor: timeout.active
                    ? timeout.isFloater
                      ? palette.accent
                      : textColor
                    : 'transparent',
                  borderColor: timeout.isFloater ? palette.accent : textColor,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Bottom 2/3: Gestures & Score */}
      <GestureDetector gesture={composedGesture}>
        <Pressable onPress={handleTap} style={styles.scoreArea}>
          <TeamText color={textColor} teamName={teamName} hasPossession={hasPossession} />
          <ScoreDisplay bgColor={backgroundColor} textColor={textColor} score={score} />
        </Pressable>
      </GestureDetector>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
    position: 'relative',
  },
  possessionBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0,
    zIndex: 10,
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
    alignItems: 'center',
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
