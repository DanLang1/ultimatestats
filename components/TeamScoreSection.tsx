import ScoreDisplay from '@/components/ScoreDisplay';
import TeamText from '@/components/TeamText';
import { ThemedView } from '@/components/ThemedView';
import { useHaptics } from '@/hooks/useHaptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface TeamScoreSectionProps {
  teamName: string;
  score: number;
  onIncrement: () => void;
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
  textColor,
  backgroundColor,
  timeouts = [],
  onTimeoutUse,
  hasPossession,
  onTurnover,
}: TeamScoreSectionProps) {
  const { triggerScoreHaptic, triggerTurnoverHaptic } = useHaptics();

  // Determine what happens on tap
  // If possession tracking is enabled (hasPossession is defined):
  //   - If this team HAS possession: tap = score (they scored)
  //   - If this team does NOT have possession: tap = turnover (flip possession)
  // If possession tracking is disabled (hasPossession is undefined): tap = score (original behavior)
  const handleTap = () => {
    console.log('handleTap called', { hasPossession, teamName, onTurnover: !!onTurnover });
    if (hasPossession === undefined) {
      // Possession tracking disabled - original behavior
      console.log('branch: possession tracking disabled');
      triggerScoreHaptic();
      onIncrement();
    } else if (hasPossession) {
      // This team has the disc - they scored
      console.log('branch: has possession - scoring');
      triggerScoreHaptic();
      onIncrement();
    } else if (onTurnover) {
      // This team doesn't have the disc - turnover
      console.log('branch: no possession - turnover');
      triggerTurnoverHaptic();
      onTurnover();
    } else {
      console.log('branch: fell through - no action');
    }
  };

  // Possession tracking is active when hasPossession is defined (not undefined)
  const possessionTrackingActive = hasPossession !== undefined;

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
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
                  width: 14,
                  height: 14,
                  borderWidth: 2,
                  borderRadius: 0,
                  transform: [{ rotate: '45deg' }],
                },
                {
                  backgroundColor: timeout.active ? textColor : 'transparent',
                  borderColor: textColor,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Bottom 2/3: Score Area */}
      <Pressable onPress={handleTap} style={styles.scoreArea}>
        <TeamText color={textColor} teamName={teamName} hasPossession={hasPossession} />
        <ScoreDisplay bgColor={backgroundColor} textColor={textColor} score={score} />
      </Pressable>

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
