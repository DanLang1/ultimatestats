import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getSizeClassValue, SizeClass } from '@/hooks/useLayout';
import { StyleSheet } from 'react-native';

export interface ScoreDisplayProps {
  bgColor: string;
  textColor: string;
  score: number;
  sizeClass?: SizeClass;
}

export default function ScoreDisplay({
  bgColor,
  textColor,
  score,
  sizeClass = 'small',
}: ScoreDisplayProps) {
  const styles = createStyles(sizeClass);
  return (
    <ThemedView style={[styles.scoreContainer, { backgroundColor: bgColor }]}>
      <ThemedText style={[styles.scoreText, { color: textColor }]} type="title">
        {score}
      </ThemedText>
    </ThemedView>
  );
}

function createStyles(sizeClass: SizeClass) {
  const fontSize = getSizeClassValue({ small: 150, medium: 180, large: 200 }, sizeClass);
  const lineHeight = getSizeClassValue({ small: 150, medium: 180, large: 200 }, sizeClass);

  return StyleSheet.create({
    scoreText: {
      fontSize,
      lineHeight,
    },
    scoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
    },
  });
}
