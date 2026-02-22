import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { getSizeClassValue, SizeClass } from '@/hooks/useLayout';
import { StyleSheet } from 'react-native';

export interface ScoreDisplayProps {
  bgColor: string;
  textColor: string;
  score: number;
  sizeClass?: SizeClass;
  isCompactVertical?: boolean;
}

export default function ScoreDisplay({
  bgColor,
  textColor,
  score,
  sizeClass = 'small',
  isCompactVertical = false,
}: ScoreDisplayProps) {
  const styles = createStyles(sizeClass, isCompactVertical);
  return (
    <ThemedView style={[styles.scoreContainer, { backgroundColor: bgColor }]}>
      <ThemedText style={[styles.scoreText, { color: textColor }]} type="title">
        {score}
      </ThemedText>
    </ThemedView>
  );
}

function createStyles(sizeClass: SizeClass, isCompactVertical: boolean) {
  const fontSize = getSizeClassValue({ small: 150, medium: 180, large: 200 }, sizeClass);
  const lineHeight = getSizeClassValue({ small: 150, medium: 180, large: 200 }, sizeClass);
  const effectiveFontSize = isCompactVertical
    ? Math.max(110, Math.round(fontSize * 0.8))
    : fontSize;
  const effectiveLineHeight = isCompactVertical
    ? Math.max(110, Math.round(lineHeight * 0.8))
    : lineHeight;

  return StyleSheet.create({
    scoreText: {
      fontSize: effectiveFontSize,
      lineHeight: effectiveLineHeight,
    },
    scoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
    },
  });
}
