import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import GameScore from '@/components/view-stats/GameScore';
import GameSelectionCheckbox from '@/components/view-stats/GameSelectionCheckbox';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatGameRowAccessibilityLabel, GameListItem, isScrimmage } from '@/lib/gameListUtils';
import { Fonts } from '@/theme/theme';

interface SavedGameResultRowProps {
  game: GameListItem;
  /** Supporting line under the matchup, e.g. "Oct 3, 2026 · Basic"; null hides the line. */
  detailLabel: string | null;
  showDivider: boolean;
  selectionMode: boolean;
  isSelected?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

/** One saved game as a row: matchup and a result-colored score. */
export default function SavedGameResultRow({
  game,
  detailLabel,
  showDivider,
  selectionMode,
  isSelected = false,
  onPress,
  onLongPress,
}: SavedGameResultRowProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const gameIsScrimmage = isScrimmage(game);
  // In a scrimmage neither side is the opponent, so both names keep full weight.
  const opponentColor = gameIsScrimmage ? palette.textInverse : palette.textMuted;

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
      ]}>
      {selectionMode && <GameSelectionCheckbox isSelected={isSelected} />}

      <View style={styles.details}>
        <ThemedText style={[styles.matchup, { color: palette.textInverse }]} numberOfLines={1}>
          {game.myTeamName}
          <ThemedText style={[styles.matchup, { color: palette.textMuted }]}> vs </ThemedText>
          <ThemedText style={[styles.matchup, { color: opponentColor }]}>
            {game.opponentName}
          </ThemedText>
        </ThemedText>
        {detailLabel != null && (
          <ThemedText style={[styles.detailText, { color: palette.textMuted }]} numberOfLines={1}>
            {detailLabel}
          </ThemedText>
        )}
      </View>

      <View style={styles.scoreColumn}>
        <GameScore
          myScore={game.myScore}
          opponentScore={game.opponentScore}
          isScrimmage={gameIsScrimmage}
        />
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
