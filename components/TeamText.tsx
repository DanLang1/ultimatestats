import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { getSizeClassValue, useLayout } from '@/hooks/useLayout';

import { ThemedText } from './ThemedText';

interface TeamTextProps {
  teamName: string;
  color: string;
  hasPossession?: boolean;
  isCompactVertical?: boolean;
}

export default function TeamText({
  teamName,
  color,
  hasPossession,
  isCompactVertical = false,
}: TeamTextProps) {
  const { sizeClass } = useLayout();
  // Dynamic font size: starts at baseFontSize, shrinks for longer names
  const baseFontSize = getSizeClassValue({ small: 40, medium: 52, large: 60 }, sizeClass);
  const minFontSize = getSizeClassValue({ small: 24, medium: 30, large: 36 }, sizeClass);
  const shrinkThreshold = 8; // Start shrinking after 8 characters
  const shrinkFactor = 2; // Reduce by 2px per character over threshold

  const fontSize =
    teamName.length > shrinkThreshold
      ? Math.max(minFontSize, baseFontSize - (teamName.length - shrinkThreshold) * shrinkFactor)
      : baseFontSize;
  const effectiveFontSize = isCompactVertical
    ? Math.max(minFontSize, Math.round(fontSize * 0.86))
    : fontSize;

  // Fixed line height to prevent layout shift when emoji switches teams
  const lineHeight = getSizeClassValue({ small: 48, medium: 60, large: 68 }, sizeClass);
  const effectiveLineHeight = isCompactVertical
    ? Math.max(40, Math.round(lineHeight * 0.86))
    : lineHeight;
  const emojiSize = getSizeClassValue({ small: 24, medium: 28, large: 32 }, sizeClass);
  const effectiveEmojiSize = isCompactVertical
    ? Math.max(20, Math.round(emojiSize * 0.9))
    : emojiSize;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <ThemedText
        style={{ color: color, fontSize: effectiveFontSize, lineHeight: effectiveLineHeight }}
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
  );
}
