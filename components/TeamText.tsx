import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from './ThemedText';

interface TeamTextProps {
  teamName: string;
  color: string;
  hasPossession?: boolean;
}

export default function TeamText({ teamName, color, hasPossession }: TeamTextProps) {
  // Dynamic font size: starts at 40, shrinks for longer names
  const baseFontSize = 40;
  const minFontSize = 24;
  const shrinkThreshold = 8; // Start shrinking after 8 characters
  const shrinkFactor = 2; // Reduce by 2px per character over threshold

  const fontSize =
    teamName.length > shrinkThreshold
      ? Math.max(minFontSize, baseFontSize - (teamName.length - shrinkThreshold) * shrinkFactor)
      : baseFontSize;

  // Fixed line height to prevent layout shift when emoji switches teams
  const lineHeight = 48;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <ThemedText style={{ color: color, fontSize, lineHeight }} type="title">
        {teamName}
      </ThemedText>
      {hasPossession && (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)}>
          <ThemedText style={{ fontSize: 24, lineHeight }}>🥏</ThemedText>
        </Animated.View>
      )}
    </View>
  );
}
