import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { StyleSheet } from 'react-native';

export interface ScoreDisplayProps {
  bgColor: string;
  textColor: string;
  score: number;
}

export default function ScoreDisplay({ bgColor, textColor, score }: ScoreDisplayProps) {
  return (
    <ThemedView style={[styles.scoreContainer, { backgroundColor: bgColor }]}>
      <ThemedText style={[styles.scoreText, { color: textColor }]} type="title">
        {score}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scoreText: {
    fontSize: 150,
    lineHeight: 150,
    marginBottom: 50,
  },
  textAdjust: {
    marginBottom: 50,
  },

  scoreContainer: {
    flex: 3,

    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
});
