import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

export interface ScoreDisplayProps {
  bgColor: string;
  textColor: string;
}

export default function ScoreDisplay({ bgColor, textColor }: ScoreDisplayProps) {
  const [score, setScore] = useState<number>(0);

  return (
    <ThemedView style={[styles.scoreContainer, { backgroundColor: bgColor }]}>
      <Pressable onPress={() => setScore(Math.max(0, score - 1))}>
        <AntDesign name="caret-down" size={50} color={textColor} />
      </Pressable>
      <ThemedText style={[styles.scoreText, { color: textColor }]} type="title">
        {score}
      </ThemedText>
      <Pressable onPress={() => setScore(score + 1)}>
        <AntDesign name="caret-up" size={50} color={textColor} />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scoreText: {
    fontSize: 150,
    lineHeight: 150,
  },

  scoreContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
});
