import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion } from 'react-native-reanimated';

import ScoreDisplay from '@/components/ScoreDisplay';
import { ThemedView } from '@/components/ThemedView';
import TutorialTeamText from '@/components/tutorial/TutorialTeamText';
import { useTheme } from '@/context/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import { getSizeClassValue, SizeClass, useLayout } from '@/hooks/useLayout';
import { usePulseAnimation } from '@/hooks/usePulseAnimation';

interface TutorialTeamScoreSectionProps {
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
  highlightTimeoutIndex?: number;
  timeoutLeadingIndicator?: React.ReactNode;
}

const EMPTY_TIMEOUTS: { active: boolean; isFloater: boolean }[] = [];
const TIMEOUT_HIT_SLOP = {
  top: 16,
  bottom: 16,
  left: 12,
  right: 12,
} as const;

export default function TutorialTeamScoreSection({
  teamName,
  score,
  onIncrement,
  textColor,
  backgroundColor,
  isCompactVertical = false,
  contentInsetTop = 0,
  contentInsetBottom = 0,
  timeouts = EMPTY_TIMEOUTS,
  onTimeoutUse,
  highlightTimeoutIndex,
  timeoutLeadingIndicator,
}: TutorialTeamScoreSectionProps) {
  const { triggerScoreHaptic } = useHaptics();
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const styles = createStyles(sizeClass, isCompactVertical);

  const pulseStyle = usePulseAnimation(
    highlightTimeoutIndex !== undefined,
    800,
    ReduceMotion.Never,
  );

  const handleTap = () => {
    triggerScoreHaptic();
    onIncrement();
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
          {timeouts.map((timeout, index) => {
            const isHighlighted = index === highlightTimeoutIndex;
            const floaterStyle = timeout.isFloater
              ? {
                  width: 14,
                  height: 14,
                  borderWidth: 2,
                  borderRadius: 0,
                  transform: [{ rotate: '45deg' }] as const,
                }
              : undefined;

            return (
              <View key={index} style={styles.timeoutDotWrapper}>
                {isHighlighted && timeoutLeadingIndicator ? (
                  <View style={styles.timeoutLeadingOverlay}>{timeoutLeadingIndicator}</View>
                ) : null}
                {isHighlighted && (
                  <Animated.View
                    style={[styles.timeoutGlow, { borderColor: palette.accent }, pulseStyle]}
                  />
                )}
                <Pressable
                  hitSlop={TIMEOUT_HIT_SLOP}
                  onPress={() => onTimeoutUse?.(index)}
                  style={[
                    styles.timeoutIndicator,
                    floaterStyle,
                    {
                      backgroundColor: timeout.active ? textColor : 'transparent',
                      borderColor: textColor,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        <View pointerEvents="none">
          <TutorialTeamText
            color={textColor}
            teamName={teamName}
            isCompactVertical={isCompactVertical}
          />
        </View>
        <View pointerEvents="none">
          <ScoreDisplay
            bgColor={backgroundColor}
            textColor={textColor}
            score={score}
            isCompactVertical={isCompactVertical}
          />
        </View>
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
      ...StyleSheet.absoluteFill,
    },
    overlayContent: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center',
      alignItems: 'center',
      gap: effectiveGap,
    },
    timeoutContainer: {
      flexDirection: 'row',
      gap: timeoutGap,
      alignItems: 'center',
    },
    timeoutDotWrapper: {
      position: 'relative',
    },
    timeoutLeadingOverlay: {
      position: 'absolute',
      right: '100%',
      top: '50%',
      marginRight: 6,
      transform: [{ translateY: -12 }],
    },
    timeoutIndicator: {
      width: effectiveTimeoutSize,
      height: effectiveTimeoutSize,
      borderRadius: 12,
      borderWidth: 2,
    },
    timeoutGlow: {
      ...StyleSheet.absoluteFill,
      borderWidth: 2,
      borderRadius: 14,
      margin: -5,
    },
  });
}
