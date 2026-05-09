import ScoreDisplay from '@/components/ScoreDisplay';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useHaptics } from '@/hooks/useHaptics';
import { getSizeClassValue, SizeClass, useLayout } from '@/hooks/useLayout';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface TutorialStatTeamScoreSectionProps {
  teamName: string;
  score: number;
  onIncrement: () => void;
  textColor: string;
  backgroundColor: string;
  isCompactVertical?: boolean;
  contentInsetTop?: number;
  contentInsetBottom?: number;
  hasPossession?: boolean;
}

export default function TutorialStatTeamScoreSection({
  teamName,
  score,
  onIncrement,
  textColor,
  backgroundColor,
  isCompactVertical = false,
  contentInsetTop = 0,
  contentInsetBottom = 0,
  hasPossession,
}: TutorialStatTeamScoreSectionProps) {
  const { triggerScoreHaptic } = useHaptics();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass, isCompactVertical);

  const handleTap = () => {
    if (hasPossession === undefined) {
      triggerScoreHaptic();
      onIncrement();
      return;
    }

    if (hasPossession) {
      triggerScoreHaptic();
      onIncrement();
    }
  };

  // Font sizing — matches TutorialTeamText logic
  const baseFontSize = getSizeClassValue({ small: 40, medium: 52, large: 60 }, sizeClass);
  const minFontSize = getSizeClassValue({ small: 24, medium: 30, large: 36 }, sizeClass);
  const shrinkThreshold = 8;
  const shrinkFactor = 2;
  const fontSize =
    teamName.length > shrinkThreshold
      ? Math.max(minFontSize, baseFontSize - (teamName.length - shrinkThreshold) * shrinkFactor)
      : baseFontSize;
  const effectiveFontSize = isCompactVertical
    ? Math.max(minFontSize, Math.round(fontSize * 0.86))
    : fontSize;

  const lineHeight = getSizeClassValue({ small: 48, medium: 60, large: 68 }, sizeClass);
  const effectiveLineHeight = isCompactVertical
    ? Math.max(40, Math.round(lineHeight * 0.86))
    : lineHeight;

  const emojiSize = getSizeClassValue({ small: 24, medium: 28, large: 32 }, sizeClass);
  const effectiveEmojiSize = isCompactVertical
    ? Math.max(20, Math.round(emojiSize * 0.9))
    : emojiSize;

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
        {/* Team name + disc emoji */}
        <View pointerEvents="none" style={styles.teamNameRow}>
          <ThemedText
            style={{
              color: textColor,
              fontSize: effectiveFontSize,
              lineHeight: effectiveLineHeight,
              flexShrink: 1,
            }}
            type="title"
            numberOfLines={1}>
            {teamName}
          </ThemedText>
          {hasPossession && (
            <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)}>
              <ThemedText
                style={{
                  fontSize: effectiveEmojiSize,
                  lineHeight: effectiveLineHeight,
                }}>
                🥏
              </ThemedText>
            </Animated.View>
          )}
        </View>

        {/* Score */}
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
    teamNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });
}
