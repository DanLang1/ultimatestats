import { getSizeClassValue, SizeClass } from '@/hooks/useLayout';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from './ThemedText';

interface TeamTextProps {
  teamName: string;
  color: string;
  hasPossession?: boolean;
  sizeClass?: SizeClass;
}

export default function TeamText({
  teamName,
  color,
  hasPossession,
  sizeClass = 'small',
}: TeamTextProps) {
  // Dynamic font size: starts at baseFontSize, shrinks for longer names
  const baseFontSize = getSizeClassValue({ small: 40, medium: 52, large: 60 }, sizeClass);
  const minFontSize = getSizeClassValue({ small: 24, medium: 30, large: 36 }, sizeClass);
  const shrinkThreshold = 8; // Start shrinking after 8 characters
  const shrinkFactor = 2; // Reduce by 2px per character over threshold

  const fontSize =
    teamName.length > shrinkThreshold
      ? Math.max(minFontSize, baseFontSize - (teamName.length - shrinkThreshold) * shrinkFactor)
      : baseFontSize;

  // Fixed line height to prevent layout shift when emoji switches teams
  const lineHeight = getSizeClassValue({ small: 48, medium: 60, large: 68 }, sizeClass);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <ThemedText style={{ color: color, fontSize, lineHeight }} type="title" numberOfLines={1}>
        {teamName}
      </ThemedText>
      {hasPossession && (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)}>
          <ThemedText
            style={{
              fontSize: getSizeClassValue({ small: 24, medium: 28, large: 32 }, sizeClass),
              lineHeight,
            }}>
            🥏
          </ThemedText>
        </Animated.View>
      )}
    </View>
  );
}
