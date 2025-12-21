import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from './ThemedText';

interface TeamTextProps {
  teamName: string;
  color: string;
  hasPossession?: boolean;
}

export default function TeamText({ teamName, color, hasPossession }: TeamTextProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <ThemedText style={{ color: color, fontSize: 40, lineHeight: 48 }} type="title">
        {teamName}
      </ThemedText>
      {hasPossession && (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)}>
          <ThemedText style={{ fontSize: 24, lineHeight: 48 }}>🥏</ThemedText>
        </Animated.View>
      )}
    </View>
  );
}
