import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import GameScore from '@/components/view-stats/GameScore';
import GameSelectionCheckbox from '@/components/view-stats/GameSelectionCheckbox';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  formatGameRowAccessibilityLabel,
  GameListItem,
  GameResult,
  getGameResult,
  isScrimmage,
} from '@/lib/gameListUtils';
import { Fonts, Palette } from '@/theme/theme';

/** Scrimmages show their own marker instead of a result. */
type RowResult = GameResult | 'scrimmage';

interface SavedGameResultRowProps {
  game: GameListItem;
  /** Supporting line under the matchup, e.g. "8:58 AM · Advanced". */
  detailLabel: string;
  showDivider: boolean;
  selectionMode: boolean;
  isSelectable: boolean;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function getResultStyle(result: RowResult, palette: Palette) {
  const styles: Record<RowResult, { letter: string; color: string }> = {
    win: { letter: 'W', color: palette.success },
    loss: { letter: 'L', color: palette.danger },
    tie: { letter: 'T', color: palette.warning },
    scrimmage: { letter: 'S', color: palette.accent },
  };
  return styles[result];
}

/**
 * One saved game as a result-first row: W/L/T (or scrimmage) letter, matchup, and a
 * result-colored score.
 */
export default function SavedGameResultRow({
  game,
  detailLabel,
  showDivider,
  selectionMode,
  isSelectable,
  isSelected,
  onPress,
  onLongPress,
}: SavedGameResultRowProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const result: RowResult = isScrimmage(game) ? 'scrimmage' : getGameResult(game);
  const resultStyle = getResultStyle(result, palette);
  // In a scrimmage neither side is the opponent, so both names keep full weight.
  const opponentColor = result === 'scrimmage' ? palette.textInverse : palette.textMuted;
  const isSelectionDisabled = selectionMode && !isSelectable;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={formatGameRowAccessibilityLabel(game, detailLabel)}
      accessibilityState={selectionMode ? { selected: isSelected } : undefined}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => [
        styles.row,
        showDivider && { borderBottomColor: palette.overlay08, borderBottomWidth: 1 },
        isSelected && { backgroundColor: palette.accentOverlay10 },
        pressed && !selectionMode && { backgroundColor: palette.overlay05 },
        isSelectionDisabled && styles.disabled,
      ]}>
      {selectionMode && (
        <GameSelectionCheckbox isSelected={isSelected} isSelectable={isSelectable} />
      )}

      <ThemedText style={[styles.resultLetter, { color: resultStyle.color }]}>
        {resultStyle.letter}
      </ThemedText>

      <View style={styles.details}>
        <ThemedText style={[styles.matchup, { color: palette.textInverse }]} numberOfLines={1}>
          {game.myTeamName}
          <ThemedText style={[styles.matchup, { color: palette.textMuted }]}> vs </ThemedText>
          <ThemedText style={[styles.matchup, { color: opponentColor }]}>
            {game.opponentName}
          </ThemedText>
        </ThemedText>
        <ThemedText style={[styles.detailText, { color: palette.textMuted }]} numberOfLines={1}>
          {detailLabel}
        </ThemedText>
      </View>

      <View style={styles.scoreColumn}>
        <GameScore game={game} />
      </View>
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
      paddingVertical: scaleBySizeClass(12, sizeClass),
      minHeight: scaleBySizeClass(64, sizeClass),
    },
    disabled: {
      opacity: 0.45,
    },
    resultLetter: {
      width: scaleBySizeClass(16, sizeClass),
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
      textAlign: 'center',
    },
    details: {
      flex: 1,
      gap: 2,
    },
    matchup: {
      fontSize: scaleBySizeClass(17, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    detailText: {
      fontSize: scaleBySizeClass(13, sizeClass),
    },
    scoreColumn: {
      alignItems: 'flex-end',
      gap: 2,
    },
  });
}
