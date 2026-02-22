import ScoreDisplay from '@/components/ScoreDisplay';
import TeamText from '@/components/TeamText';
import { ThemedView } from '@/components/ThemedView';
import { useHaptics } from '@/hooks/useHaptics';
import { getSizeClassValue, SizeClass, useLayout } from '@/hooks/useLayout';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface TeamScoreSectionProps {
  teamName: string;
  score: number;
  onIncrement: () => void;
  textColor: string;
  backgroundColor: string;
  isCompactVertical?: boolean;
  contentInsetTop?: number;
  contentInsetBottom?: number;

  timeouts?: { active: boolean; isFloater: boolean }[];
  onTimeoutUse?: (index: number) => void;

  // Possession tracking (optional - only when stat tracking is enabled)
  hasPossession?: boolean;
}

const TIMEOUT_HIT_SLOP = {
  top: 16,
  bottom: 16,
  left: 12,
  right: 12,
} as const;

export default function TeamScoreSection({
  teamName,
  score,
  onIncrement,
  textColor,
  backgroundColor,
  isCompactVertical = false,
  contentInsetTop = 0,
  contentInsetBottom = 0,
  timeouts = [],
  onTimeoutUse,
  hasPossession,
}: TeamScoreSectionProps) {
  const { triggerScoreHaptic } = useHaptics();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass, isCompactVertical);

  // Determine what happens on tap
  // If possession tracking is enabled (hasPossession is defined):
  //   - If this team HAS possession: tap = score (they scored)
  //   - If this team does NOT have possession: tap = turnover (flip possession)
  // If possession tracking is disabled (hasPossession is undefined): tap = score (original behavior)
  const handleTap = () => {
    if (hasPossession === undefined) {
      // Possession tracking disabled - original behavior
      triggerScoreHaptic();
      onIncrement();
    } else if (hasPossession) {
      // This team has the disc - they scored
      triggerScoreHaptic();
      onIncrement();
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <Pressable onPress={handleTap} style={styles.scoreTapArea} />

      <View
        pointerEvents="box-none"
        style={[
          styles.overlayContent,
          {
            paddingTop: contentInsetTop,
            paddingBottom: contentInsetBottom,
          },
        ]}>
        <View style={styles.timeoutContainer}>
          {timeouts.map((timeout, index) => (
            <Pressable
              key={index}
              hitSlop={TIMEOUT_HIT_SLOP}
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

        <TeamText
          color={textColor}
          teamName={teamName}
          hasPossession={hasPossession}
          sizeClass={sizeClass}
          isCompactVertical={isCompactVertical}
        />
        <ScoreDisplay
          bgColor={backgroundColor}
          textColor={textColor}
          score={score}
          sizeClass={sizeClass}
          isCompactVertical={isCompactVertical}
        />
      </View>
    </ThemedView>
  );
}

function createStyles(sizeClass: SizeClass, isCompactVertical: boolean) {
  const gap = getSizeClassValue({ small: 6, medium: 10, large: 12 }, sizeClass);
  const effectiveGap = isCompactVertical ? Math.max(4, Math.round(gap * 0.75)) : gap;
  const timeoutGap = isCompactVertical ? 12 : 15;
  const timeoutSize = getSizeClassValue({ small: 20, medium: 22, large: 24 }, sizeClass);
  const effectiveTimeoutSize = isCompactVertical
    ? Math.max(16, Math.round(timeoutSize * 0.8))
    : timeoutSize;

  return StyleSheet.create({
    container: {
      flex: 1,
      position: 'relative',
    },
    scoreTapArea: {
      ...StyleSheet.absoluteFillObject,
    },
    overlayContent: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      gap: effectiveGap,
    },
    timeoutContainer: {
      flexDirection: 'row',
      gap: timeoutGap,
      alignItems: 'center',
    },
    timeoutIndicator: {
      width: effectiveTimeoutSize,
      height: effectiveTimeoutSize,
      borderRadius: 12,
      borderWidth: 2,
    },
  });
}
