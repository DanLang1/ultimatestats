import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { TournamentFilterModal } from '@/components/ui/TournamentFilterModal';
import SavedGameResultRow from '@/components/view-stats/SavedGameResultRow';
import {
  SAVED_GAMES_SORT_OPTIONS,
  SavedGamesSortKey,
  SavedGamesSortSheet,
} from '@/components/view-stats/SavedGamesSortSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatDayTitle, formatRecentDay } from '@/lib/dateUtils';
import { formatRecord, GameKind, GameListItem, isScrimmage } from '@/lib/gameListUtils';
import { Tournament } from '@/lib/storage/types';
import { Fonts } from '@/theme/theme';

interface SavedGamesListProps {
  games: GameListItem[];
  onSelectGame: (game: GameListItem) => void;
  selectedGameIds?: Set<string>;
  /** Required by selection-mode callers to keep basic and advanced bulk actions separate. */
  selectedGameKind?: GameKind | null;
  onToggleGameSelection?: (gameId: string) => void;
  onEnterSelectionWithGame?: (gameId: string) => void;
  onClearSelection?: () => void;
  tournaments?: Tournament[];
  selectionMode?: boolean;
  /** Shown at the end of the row that counts the listed games. */
  summaryAction?: ReactNode;
}

const EMPTY_GAME_IDS = new Set<string>();
const EMPTY_TOURNAMENTS: Tournament[] = [];

interface SavedGameGroup {
  key: string;
  /** Null when the list is not sorted by date, so the games share one ungrouped section. */
  title: string | null;
  games: GameListItem[];
}

/** Advanced is the default mode, so only basic games and scrimmages are labeled. */
function getGameModeLabel(game: GameListItem): string | null {
  if (game.kind === 'basic') return 'Basic';
  return isScrimmage(game) ? 'Scrimmage' : null;
}

/** Groups consecutive games that share a calendar day, preserving the sorted order. */
function groupGamesByDay(games: GameListItem[]): SavedGameGroup[] {
  const groups: SavedGameGroup[] = [];
  for (const game of games) {
    const key = new Date(game.timestamp).toDateString();
    const current = groups.at(-1);
    if (current?.key === key) {
      current.games.push(game);
    } else {
      groups.push({ key, title: formatDayTitle(game.timestamp), games: [game] });
    }
  }
  return groups;
}

/** Day groups when sorted by date, otherwise one untitled group. Every group has at least one game. */
function groupGames(games: GameListItem[], isGroupedByDay: boolean): SavedGameGroup[] {
  if (games.length === 0) return [];
  if (isGroupedByDay) return groupGamesByDay(games);
  return [{ key: 'all', title: null, games }];
}

export default function SavedGamesList({
  games,
  onSelectGame,
  selectedGameIds = EMPTY_GAME_IDS,
  selectedGameKind = null,
  onToggleGameSelection,
  onEnterSelectionWithGame,
  onClearSelection,
  tournaments = EMPTY_TOURNAMENTS,
  selectionMode = false,
  summaryAction,
}: SavedGamesListProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SavedGamesSortKey>('newest');
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [tournamentFilter, setTournamentFilter] = useState<string | null>(null);
  const [showTournamentFilter, setShowTournamentFilter] = useState(false);

  // Tournaments that have at least one linked saved game, with counts
  const tournamentGameCounts = new Map<string, number>();
  for (const game of games) {
    if (game.tournamentId) {
      tournamentGameCounts.set(
        game.tournamentId,
        (tournamentGameCounts.get(game.tournamentId) ?? 0) + 1,
      );
    }
  }
  const visibleTournaments = tournaments.filter((t) => {
    if (!tournamentGameCounts.has(t.id)) return false;
    if (selectionMode && selectedGameKind != null) {
      return t.kind === selectedGameKind;
    }
    return t.kind !== null;
  });
  const activeTournament = visibleTournaments.find((t) => t.id === tournamentFilter) ?? null;
  const effectiveTournamentFilter = activeTournament ? tournamentFilter : null;

  let filteredAndSortedGames = [...games];

  if (effectiveTournamentFilter) {
    filteredAndSortedGames = filteredAndSortedGames.filter(
      (game) =>
        game.kind === activeTournament?.kind && game.tournamentId === effectiveTournamentFilter,
    );
  }

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filteredAndSortedGames = filteredAndSortedGames.filter((game) => {
      const t1 = game.myTeamName.toLowerCase();
      const t2 = game.opponentName.toLowerCase();
      // Matches the day heading the list shows, e.g. "Thu, Oct 29", plus the year it may omit.
      const date =
        `${formatDayTitle(game.timestamp)} ${new Date(game.timestamp).getFullYear()}`.toLowerCase();
      return t1.includes(query) || t2.includes(query) || date.includes(query);
    });
  }

  const sortOption = SAVED_GAMES_SORT_OPTIONS[sortKey];
  const dir = sortOption.direction === 'asc' ? 1 : -1;
  filteredAndSortedGames.sort((a, b) => {
    switch (sortOption.field) {
      case 'team':
        return dir * a.myTeamName.localeCompare(b.myTeamName);
      case 'score': {
        const totalA = a.myScore + a.opponentScore;
        const totalB = b.myScore + b.opponentScore;
        return dir * (totalA - totalB);
      }
      case 'date':
      default:
        return dir * (a.timestamp - b.timestamp);
    }
  });

  if (games.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name="history"
          size={scaleBySizeClass(48, sizeClass)}
          color={palette.textMuted}
        />
        <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>
          No saved games yet
        </ThemedText>
        <Pressable
          testID="saved-games-showcase"
          accessibilityRole="button"
          accessibilityLabel="See what full game stats look like"
          onPress={() => router.push('/showcase')}
          style={({ pressed }) => [styles.showcaseLink, pressed && styles.showcaseLinkPressed]}>
          <ThemedText style={[styles.showcaseLinkText, { color: palette.accent }]}>
            See what full game stats look like
          </ThemedText>
          <MaterialCommunityIcons
            name="chevron-right"
            size={scaleBySizeClass(18, sizeClass)}
            color={palette.accent}
          />
        </Pressable>
      </View>
    );
  }

  const listedGamesCount = filteredAndSortedGames.length;
  const isGroupedByDay = sortOption.field === 'date';
  const gameGroups = groupGames(filteredAndSortedGames, isGroupedByDay);
  const tournamentNames = new Map(tournaments.map((t) => [t.id, t.name]));

  const tournamentFilterLabel = activeTournament
    ? `Filter by tournament, ${activeTournament.name} selected`
    : 'Filter by tournament';

  return (
    <View style={styles.container}>
      <View style={styles.controlsHeader}>
        <View style={[styles.searchWrapper, { backgroundColor: palette.overlay05 }]}>
          <MaterialCommunityIcons
            name="magnify"
            size={scaleBySizeClass(20, sizeClass)}
            color={palette.textMuted}
          />
          <TextInput
            style={[styles.searchInput, { color: palette.textInverse }]}
            placeholder="Search"
            placeholderTextColor={palette.textMuted}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              onClearSelection?.();
            }}
            clearButtonMode="while-editing"
          />
        </View>
        <Pressable
          testID="saved-games-sort"
          accessibilityRole="button"
          accessibilityLabel={`Sort games, ${sortOption.label}`}
          onPress={() => setShowSortSheet(true)}
          style={({ pressed }) => [
            styles.controlButton,
            { backgroundColor: pressed ? palette.overlay10 : palette.overlay05 },
          ]}>
          <MaterialCommunityIcons
            name="sort"
            size={scaleBySizeClass(18, sizeClass)}
            color={palette.textMuted}
          />
          <ThemedText
            style={[styles.controlButtonText, { color: palette.textInverse }]}
            numberOfLines={1}>
            {sortOption.shortLabel}
          </ThemedText>
        </Pressable>
        {visibleTournaments.length > 0 && (
          <Pressable
            testID="saved-games-tournament-filter"
            accessibilityRole="button"
            accessibilityLabel={tournamentFilterLabel}
            onPress={() => setShowTournamentFilter(true)}
            style={({ pressed }) => [
              styles.controlButton,
              {
                backgroundColor: activeTournament ? palette.accentOverlay15 : palette.overlay05,
              },
              pressed && { opacity: 0.7 },
            ]}>
            <MaterialCommunityIcons
              name="trophy"
              size={scaleBySizeClass(18, sizeClass)}
              color={activeTournament ? palette.accent : palette.textMuted}
            />
            {activeTournament && (
              <ThemedText
                style={[styles.tournamentName, { color: palette.accent }]}
                numberOfLines={1}>
                {activeTournament.name}
              </ThemedText>
            )}
          </Pressable>
        )}
      </View>

      <View style={styles.summaryRow}>
        <ThemedText style={[styles.summaryCount, { color: palette.textMuted }]}>
          {listedGamesCount} {listedGamesCount === 1 ? 'GAME' : 'GAMES'}
        </ThemedText>
        {summaryAction}
      </View>

      <View style={styles.savedGamesList}>
        {gameGroups.map((group) => {
          const groupTournamentId = group.games[0].tournamentId;
          const sharesTournament =
            groupTournamentId != null &&
            group.games.every((game) => game.tournamentId === groupTournamentId);
          const groupTournamentName = sharesTournament
            ? tournamentNames.get(groupTournamentId)
            : undefined;
          // A lone game's row already shows its result.
          const groupRecord = group.games.length > 1 ? formatRecord(group.games) : null;

          return (
            <View key={group.key} style={styles.gameGroup}>
              {group.title != null && (
                <View style={styles.groupHeader}>
                  <ThemedText
                    style={[styles.groupTitle, { color: palette.textInverse }]}
                    numberOfLines={1}>
                    {group.title}
                    {groupTournamentName != null && (
                      <ThemedText style={[styles.groupTitle, { color: palette.textMuted }]}>
                        {` · ${groupTournamentName}`}
                      </ThemedText>
                    )}
                  </ThemedText>
                  {groupRecord != null && (
                    <ThemedText
                      testID="saved-games-day-record"
                      style={[styles.groupRecord, { color: palette.textMuted }]}>
                      {groupRecord}
                    </ThemedText>
                  )}
                </View>
              )}
              <View style={[styles.groupSurface, { backgroundColor: palette.overlay05 }]}>
                {group.games.map((game, index) => {
                  const isSelectable = selectedGameKind == null || selectedGameKind === game.kind;
                  // Day headers already carry the date, so rows only repeat it when ungrouped.
                  const detailParts = isGroupedByDay ? [] : [formatRecentDay(game.timestamp)];
                  const modeLabel = getGameModeLabel(game);
                  if (modeLabel != null) {
                    detailParts.push(modeLabel);
                  }
                  const detailLabel = detailParts.length > 0 ? detailParts.join(' · ') : null;

                  return (
                    <SavedGameResultRow
                      key={game.id}
                      game={game}
                      detailLabel={detailLabel}
                      showDivider={index < group.games.length - 1}
                      selectionMode={selectionMode}
                      isSelectable={isSelectable}
                      isSelected={selectedGameIds.has(game.id)}
                      onPress={() => {
                        if (selectionMode && isSelectable) {
                          onToggleGameSelection?.(game.id);
                        } else if (!selectionMode) {
                          onSelectGame(game);
                        }
                      }}
                      onLongPress={() => {
                        if (!selectionMode) {
                          onEnterSelectionWithGame?.(game.id);
                        }
                      }}
                    />
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      {filteredAndSortedGames.length === 0 &&
        effectiveTournamentFilter &&
        searchQuery.trim() === '' && (
          <View style={styles.noResults}>
            <ThemedText style={{ color: palette.textMuted }}>
              No games in this tournament
            </ThemedText>
          </View>
        )}

      {filteredAndSortedGames.length === 0 && searchQuery.trim() !== '' && (
        <View style={styles.noResults}>
          <ThemedText style={{ color: palette.textMuted }}>
            No games match &quot;{searchQuery}&quot;
          </ThemedText>
        </View>
      )}

      <SavedGamesSortSheet
        visible={showSortSheet}
        selectedKey={sortKey}
        onSelect={(key) => {
          setSortKey(key);
          onClearSelection?.();
        }}
        onClose={() => setShowSortSheet(false)}
      />

      <TournamentFilterModal
        visible={showTournamentFilter}
        tournaments={visibleTournaments}
        gameCounts={tournamentGameCounts}
        selectedTournamentId={effectiveTournamentFilter}
        onSelect={(id) => {
          setTournamentFilter(id);
          onClearSelection?.();
        }}
        onClose={() => setShowTournamentFilter(false)}
      />
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      gap: 16,
    },
    controlsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
    },
    searchWrapper: {
      flex: 1,
      // Keeps the field usable when the sort and tournament labels are long; they truncate instead.
      minWidth: scaleBySizeClass(140, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      height: scaleBySizeClass(44, sizeClass),
      borderRadius: 12,
      gap: scaleBySizeClass(8, sizeClass),
    },
    searchInput: {
      flex: 1,
      fontSize: scaleBySizeClass(16, sizeClass),
      paddingVertical: 8,
    },
    controlButton: {
      flexShrink: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: scaleBySizeClass(44, sizeClass),
      minWidth: scaleBySizeClass(44, sizeClass),
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      borderRadius: 12,
      gap: scaleBySizeClass(6, sizeClass),
    },
    controlButtonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    tournamentName: {
      flexShrink: 1,
      // Scaled with the text so the name truncates at the same character count on tablets.
      maxWidth: scaleBySizeClass(96, sizeClass),
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
      gap: 16,
      marginTop: 40,
    },
    emptyText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      textAlign: 'center',
    },
    showcaseLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(2, sizeClass),
      minHeight: scaleBySizeClass(44, sizeClass),
    },
    showcaseLinkPressed: {
      opacity: 0.6,
    },
    showcaseLinkText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    noResults: {
      padding: 20,
      alignItems: 'center',
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      minHeight: scaleBySizeClass(44, sizeClass),
      marginBottom: -8,
    },
    summaryCount: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: 1,
    },
    savedGamesList: {
      gap: scaleBySizeClass(20, sizeClass),
    },
    gameGroup: {
      gap: scaleBySizeClass(8, sizeClass),
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: scaleBySizeClass(4, sizeClass),
    },
    groupTitle: {
      flexShrink: 1,
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    groupRecord: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
      fontVariant: ['tabular-nums'],
    },
    // One shared surface per day; rows inside are separated by hairlines rather than cards.
    groupSurface: {
      borderRadius: 14,
      overflow: 'hidden',
    },
  });
}
