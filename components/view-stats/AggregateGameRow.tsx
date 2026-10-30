import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import GameScore from '@/components/view-stats/GameScore';
import GameSelectionCheckbox from '@/components/view-stats/GameSelectionCheckbox';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatGameRowAccessibilityLabel, GameListItem } from '@/lib/gameListUtils';
import { Fonts } from '@/theme/theme';

interface AggregateGameRowProps {
  game: GameListItem;
  /** Shown after the opponent when the section header doesn't already date the game. */
  dateLabel: string | null;
  showDivider: boolean;
  isSelected: boolean;
  onToggle: () => void;
}

/** One selectable game in the aggregate picker: checkbox, opponent, optional date, and score. */
export default function AggregateGameRow({
  game,
  dateLabel,
  showDivider,
  isSelected,
  onToggle,
}: AggregateGameRowProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={formatGameRowAccessibilityLabel(game, dateLabel)}
      accessibilityState={{ selected: isSelected }}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.row,
        showDivider && { borderBottomColor: palette.overlay08, borderBottomWidth: 1 },
        isSelected && { backgroundColor: palette.accentOverlay10 },
        pressed && !isSelected && { backgroundColor: palette.overlay05 },
      ]}>
      <GameSelectionCheckbox isSelected={isSelected} isSelectable />
      <ThemedText style={[styles.opponent, { color: palette.textInverse }]} numberOfLines={1}>
        {game.opponentName}
        {dateLabel != null && (
          <ThemedText style={[styles.date, { color: palette.textMuted }]}>
            {` · ${dateLabel}`}
          </ThemedText>
        )}
      </ThemedText>
      <GameScore game={game} />
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(12, sizeClass),
      paddingHorizontal: scaleBySizeClass(14, sizeClass),
      paddingVertical: scaleBySizeClass(10, sizeClass),
      minHeight: scaleBySizeClass(48, sizeClass),
    },
    // Takes the leftover width so the name truncates before the score.
    opponent: {
      flex: 1,
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    date: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.regular,
    },
  });
}
