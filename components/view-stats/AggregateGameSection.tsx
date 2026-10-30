import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import AggregateGameRow from '@/components/view-stats/AggregateGameRow';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatRecentDay, formatTournamentDateRange } from '@/lib/dateUtils';
import { TournamentGameSection } from '@/lib/gameListUtils';
import { Fonts } from '@/theme/theme';

interface AggregateGameSectionProps {
  section: TournamentGameSection;
  selectedGameIds: Set<string>;
  onToggleGameSelection: (gameId: string) => void;
  onSelectGames: (gameIds: string[]) => void;
  onDeselectGames: (gameIds: string[]) => void;
}

/** One tournament's games (or the games with no tournament) under a header that selects them all. */
export default function AggregateGameSection({
  section,
  selectedGameIds,
  onToggleGameSelection,
  onSelectGames,
  onDeselectGames,
}: AggregateGameSectionProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const { tournament, games } = section;
  const gameIds = games.map((game) => game.id);
  const areAllSelected = gameIds.every((id) => selectedGameIds.has(id));
  const selectAction = areAllSelected ? 'Deselect' : 'Select';
  const selectLabel = tournament
    ? `${selectAction} games in ${tournament.name}`
    : `${selectAction} games with no tournament`;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText
          style={[styles.title, { color: tournament ? palette.textInverse : palette.textMuted }]}
          numberOfLines={1}>
          {tournament ? tournament.name : 'No tournament'}
          {tournament && (
            <ThemedText style={[styles.meta, { color: palette.textMuted }]}>
              {` · ${formatTournamentDateRange(tournament.startDate, tournament.endDate)}`}
            </ThemedText>
          )}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={selectLabel}
          hitSlop={12}
          onPress={() => (areAllSelected ? onDeselectGames(gameIds) : onSelectGames(gameIds))}>
          <ThemedText style={[styles.action, { color: palette.accent }]}>{selectAction}</ThemedText>
        </Pressable>
      </View>
      <View style={[styles.surface, { backgroundColor: palette.overlay05 }]}>
        {games.map((game, index) => (
          <AggregateGameRow
            key={game.id}
            game={game}
            // The tournament header already dates its games.
            dateLabel={tournament ? null : formatRecentDay(game.timestamp)}
            showDivider={index < games.length - 1}
            isSelected={selectedGameIds.has(game.id)}
            onToggle={() => onToggleGameSelection(game.id)}
          />
        ))}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    section: {
      gap: scaleBySizeClass(8, sizeClass),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: scaleBySizeClass(4, sizeClass),
    },
    title: {
      flexShrink: 1,
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    meta: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.regular,
      fontVariant: ['tabular-nums'],
    },
    action: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    // One shared surface per section; rows inside are separated by hairlines rather than cards.
    surface: {
      borderRadius: 12,
      overflow: 'hidden',
    },
  });
}
