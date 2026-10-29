import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { GameListItem, GameResult, getGameResult, isScrimmage } from '@/lib/gameListUtils';
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

/** Names the winner so screen readers announce the result without knowing the tracked side. */
function getMarginLabel(game: GameListItem): string {
  const margin = Math.abs(game.myScore - game.opponentScore);
  if (margin === 0) return 'Tied';
  const winnerName = game.myScore > game.opponentScore ? game.myTeamName : game.opponentName;
  return `${winnerName} by ${margin}`;
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
  const marginLabel = getMarginLabel(game);
  // Our score carries the result color; ties and scrimmages have no side to credit, so stay neutral.
  let scoreColor = palette.textInverse;
  if (result === 'win') scoreColor = palette.success;
  else if (result === 'loss') scoreColor = palette.danger;
  // In a scrimmage neither side is the opponent, so both names keep full weight.
  const opponentColor = result === 'scrimmage' ? palette.textInverse : palette.textMuted;
  const isSelectionDisabled = selectionMode && !isSelectable;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${game.myTeamName} versus ${game.opponentName}, ${game.myScore} to ${game.opponentScore}, ${marginLabel}, ${detailLabel}`}
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
        <View
          style={[
            styles.checkbox,
            { borderColor: isSelectable ? palette.overlay20 : palette.overlay10 },
            isSelected && { backgroundColor: palette.accent, borderColor: palette.accent },
          ]}>
          {isSelected && (
            <MaterialCommunityIcons
              name="check"
              size={scaleBySizeClass(14, sizeClass)}
              color={palette.textOnAccent}
            />
          )}
        </View>
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
        <ThemedText style={[styles.score, { color: scoreColor }]}>
          {game.myScore}
          <ThemedText style={[styles.score, { color: palette.textMuted }]}>
            {/* Thin spaces keep the dash from reading as part of either number. */}
            {`\u2009–\u2009${game.opponentScore}`}
          </ThemedText>
        </ThemedText>
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
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
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
    score: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.bold,
      fontVariant: ['tabular-nums'],
    },
  });
}
