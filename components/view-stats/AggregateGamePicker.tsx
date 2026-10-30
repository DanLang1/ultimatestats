import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import AggregateGameSection from '@/components/view-stats/AggregateGameSection';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatRecord, GameListItem, groupGamesByTournament } from '@/lib/gameListUtils';
import { Tournament } from '@/lib/storage/types';
import { Fonts } from '@/theme/theme';

interface AggregateGamePickerProps {
  /** One team's games. */
  games: GameListItem[];
  tournaments: Tournament[];
  tournamentIdsByGame: Map<string, string>;
  selectedGameIds: Set<string>;
  onToggleGameSelection: (gameId: string) => void;
  onSelectGames: (gameIds: string[]) => void;
  onDeselectGames: (gameIds: string[]) => void;
}

/** A team's record over its games, then the games grouped by tournament for selection. */
export default function AggregateGamePicker({
  games,
  tournaments,
  tournamentIdsByGame,
  selectedGameIds,
  onToggleGameSelection,
  onSelectGames,
  onDeselectGames,
}: AggregateGamePickerProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const sections = groupGamesByTournament(games, tournaments, tournamentIdsByGame);
  const gameIds = games.map((game) => game.id);
  const areAllSelected = gameIds.every((id) => selectedGameIds.has(id));
  const record = formatRecord(games);
  const gameCount = `${games.length} ${games.length === 1 ? 'game' : 'games'}`;

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <ThemedText style={styles.summaryText} numberOfLines={1}>
          {record != null && (
            <ThemedText style={[styles.record, { color: palette.textInverse }]}>
              {record}
            </ThemedText>
          )}
          <ThemedText style={[styles.summaryMeta, { color: palette.textMuted }]}>
            {record != null ? ` in ${gameCount}` : gameCount}
          </ThemedText>
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => (areAllSelected ? onDeselectGames(gameIds) : onSelectGames(gameIds))}>
          <ThemedText style={[styles.action, { color: palette.accent }]}>
            {areAllSelected ? 'Deselect all' : 'Select all'}
          </ThemedText>
        </Pressable>
      </View>

      {sections.map((section) => (
        <AggregateGameSection
          key={section.tournament?.id ?? 'no-tournament'}
          section={section}
          selectedGameIds={selectedGameIds}
          onToggleGameSelection={onToggleGameSelection}
          onSelectGames={onSelectGames}
          onDeselectGames={onDeselectGames}
        />
      ))}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      gap: scaleBySizeClass(24, sizeClass),
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: scaleBySizeClass(4, sizeClass),
    },
    summaryText: {
      flexShrink: 1,
    },
    record: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.bold,
      fontVariant: ['tabular-nums'],
    },
    summaryMeta: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.regular,
      fontVariant: ['tabular-nums'],
    },
    action: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
