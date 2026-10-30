import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { GameListItem, getGameResult, isScrimmage } from '@/lib/gameListUtils';
import { Fonts } from '@/theme/theme';

interface GameScoreProps {
  game: GameListItem;
}

/** "13 – 10" with our score in the result color and the opponent's muted. */
export default function GameScore({ game }: GameScoreProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  // Ties and scrimmages have no side to credit, so our score stays neutral.
  const result = isScrimmage(game) ? null : getGameResult(game);
  let scoreColor = palette.textInverse;
  if (result === 'win') scoreColor = palette.success;
  else if (result === 'loss') scoreColor = palette.danger;

  return (
    <ThemedText style={[styles.score, { color: scoreColor }]}>
      {game.myScore}
      <ThemedText style={[styles.score, { color: palette.textMuted }]}>
        {/* Thin spaces keep the dash from reading as part of either number. */}
        {`\u2009–\u2009${game.opponentScore}`}
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
