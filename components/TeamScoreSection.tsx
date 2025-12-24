import ScoreDisplay from '@/components/ScoreDisplay';
import TeamText from '@/components/TeamText';
import { ThemedView } from '@/components/ThemedView';
import { useHaptics } from '@/hooks/useHaptics';
import { palette } from '@/theme/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
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
}: TeamScoreSectionProps) {
  const { triggerScoreHaptic, triggerTurnoverHaptic } = useHaptics();

  // Fling up = score, only allowed if this team has possession (or possession tracking is disabled)
  // Note: No haptics here as this runs in worklet context
  const flingUp = Gesture.Fling()
    .direction(Directions.UP)
    .enabled(hasPossession === undefined || hasPossession === true)
    .onEnd(() => {
      scheduleOnRN(onIncrement);
      scheduleOnRN(triggerScoreHaptic);
    });

  // Fling down = decrement score, always allowed (for corrections)
  // Note: No haptics here as this runs in worklet context
  const flingDown = Gesture.Fling()
    .direction(Directions.DOWN)
    .onEnd(() => {
      scheduleOnRN(onDecrement);
      scheduleOnRN(triggerScoreHaptic);
    });

  const composedGesture = Gesture.Simultaneous(flingDown, flingUp);

  // Determine what happens on tap
  // If possession tracking is enabled (hasPossession is defined):
  //   - If this team HAS possession: tap = score (they scored)
  //   - If this team does NOT have possession: tap = turnover (flip possession)
  // If possession tracking is disabled (hasPossession is undefined): tap = score (original behavior)
  // Haptics work here because this runs on the JS thread, not worklet
  const handleTap = () => {
    if (hasPossession === undefined) {
      // Possession tracking disabled - original behavior
      triggerScoreHaptic();
      onIncrement();
    } else if (hasPossession) {
      // This team has the disc - they scored
      triggerScoreHaptic();
      onIncrement();
    } else if (onTurnover) {
      // This team doesn't have the disc - turnover
      triggerTurnoverHaptic();
      onTurnover();
    }
  };

  // Possession tracking is active when hasPossession is defined (not undefined)
  const possessionTrackingActive = hasPossession !== undefined;

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Static possession border - only shown when this team has possession */}
      {hasPossession && <View style={styles.possessionBorder} pointerEvents="none" />}

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

      {/* Turnover hint - positioned at bottom, shown when this team does NOT have possession */}
      {possessionTrackingActive && !hasPossession && (
        <Text style={[styles.turnoverHint, { color: textColor }]}>Tap for turnover</Text>
      )}
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
    borderWidth: 4,
    borderColor: palette.accent,
    zIndex: 10,
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
  turnoverHint: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
    opacity: 0.4,
  },
});
