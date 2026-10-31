import { StyleProp, StyleSheet, TextStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface GameScoreProps {
  myScore: number;
  opponentScore: number;
  /** Scrimmages have no side to credit, so our score stays neutral. */
  isScrimmage: boolean;
  /** Size overrides, applied to both scores. */
  style?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

/** "13 – 10" with our score in the result color and the opponent's muted. */
export default function GameScore({
  myScore,
  opponentScore,
  isScrimmage,
  style,
  testID,
  accessibilityLabel,
}: GameScoreProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  // Ties and scrimmages have no side to credit, so our score stays neutral.
  let scoreColor = palette.textInverse;
  if (!isScrimmage && myScore > opponentScore) scoreColor = palette.success;
  else if (!isScrimmage && myScore < opponentScore) scoreColor = palette.danger;

  return (
    <ThemedText
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      style={[styles.score, style, { color: scoreColor }]}>
      {myScore}
      <ThemedText style={[styles.score, style, { color: palette.textMuted }]}>
        {/* Thin spaces keep the dash from reading as part of either number. */}
        {`\u2009–\u2009${opponentScore}`}
      </ThemedText>
    </ThemedText>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    score: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.bold,
      fontVariant: ['tabular-nums'],
    },
  });
}
