import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import SavedGameResultRow from '@/components/view-stats/SavedGameResultRow';
import SavedGamesOtherTeamRow from '@/components/view-stats/SavedGamesOtherTeamRow';
import SavedGamesOtherTeamsFooter from '@/components/view-stats/SavedGamesOtherTeamsFooter';
import SavedGamesOtherTeamsSection from '@/components/view-stats/SavedGamesOtherTeamsSection';
import { SavedGamesSortSheet } from '@/components/view-stats/SavedGamesSortSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatRecentDay } from '@/lib/dateUtils';
import { formatRecord, GameListItem, isScrimmage, LinkedGameListItem } from '@/lib/gameListUtils';
import {
  filterSavedGames,
  getSharedTournament,
  groupSavedGames,
  SAVED_GAMES_SORT_OPTIONS,
  SavedGamesSortKey,
  SavedGameTeam,
  SavedGameTeamSearchMatch,
  sortSavedGames,
  summarizeTournaments,
} from '@/lib/savedGamesListUtils';
import { Tournament } from '@/lib/storage/types';
import { pluralize } from '@/lib/utils';
import { Fonts } from '@/theme/theme';

interface SavedGamesListProps {
  /** The shown team's games. */
  games: LinkedGameListItem[];
  teamName: string;
  onSelectGame: (game: LinkedGameListItem) => void;
  selectedGameIds?: Set<string>;
  onToggleGameSelection?: (gameId: string) => void;
  onEnterSelectionWithGame?: (gameId: string) => void;
  onClearSelection?: () => void;
  selectionMode?: boolean;
  /** Shown at the end of the row that counts the listed games. */
  summaryAction?: ReactNode;
  sortKey: SavedGamesSortKey;
  onChangeSortKey: (sortKey: SavedGamesSortKey) => void;
  searchQuery: string;
  onChangeSearchQuery: (query: string) => void;
  /** Teams other than the shown one, newest first; listed after the last game. */
  otherTeams: SavedGameTeam[];
  /** Switches to the team and clears the search. */
  onSelectTeam: (teamId: string) => void;
  onShowAllTeams: () => void;
  /** Other teams with games matching the search, offered when this team has none. */
  otherTeamSearchMatches: SavedGameTeamSearchMatch[];
  /** Switches to the team and keeps the search. */
  onSearchTeam: (teamId: string) => void;
}

const EMPTY_GAME_IDS = new Set<string>();

/** Advanced is the default mode, so only basic games and scrimmages are labeled. */
function getGameModeLabel(game: GameListItem): string | null {
  if (game.kind === 'basic') return 'Basic';
  return isScrimmage(game) ? 'Scrimmage' : null;
}

interface NoResultsContext {
  teamName: string;
  tournament: Tournament | null;
  query: string;
  /** Whether any of the team's games match the query, ignoring the tournament filter. */
  teamHasSearchMatches: boolean;
}

/** Why a list with no listed games is empty. */
function getNoResultsMessage({
  teamName,
  tournament,
  query,
  teamHasSearchMatches,
}: NoResultsContext): string {
  // The team has games, so without a search only the tournament filter can empty the list.
  if (query.trim() === '') return 'No games in this tournament';
  const quotedQuery = `"${query}"`;
  if (tournament !== null && teamHasSearchMatches) {
    return `No games in ${tournament.name} match ${quotedQuery}`;
  }
  return `No games in ${teamName} match ${quotedQuery}`;
}

export default function SavedGamesList({
  games,
  teamName,
  onSelectGame,
  selectedGameIds = EMPTY_GAME_IDS,
  onToggleGameSelection,
  onEnterSelectionWithGame,
  onClearSelection,
  selectionMode = false,
  summaryAction,
  sortKey,
  onChangeSortKey,
  searchQuery,
  onChangeSearchQuery,
  otherTeams,
  onSelectTeam,
  onShowAllTeams,
  otherTeamSearchMatches,
  onSearchTeam,
}: SavedGamesListProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const [showSortSheet, setShowSortSheet] = useState(false);
  const [tournamentFilter, setTournamentFilter] = useState<string | null>(null);

  // Newest tournament first, so the current one sits at the top of the sheet.
  const tournamentOptions = summarizeTournaments(games);
  const activeTournament =
    tournamentOptions.find(({ tournament }) => tournament.id === tournamentFilter)?.tournament ??
    null;

  const filteredAndSortedGames = sortSavedGames(
    filterSavedGames(games, { tournament: activeTournament, query: searchQuery }),
    sortKey,
  );
  const sortOption = SAVED_GAMES_SORT_OPTIONS[sortKey];

  const listedGamesCount = filteredAndSortedGames.length;
  const isGroupedByDay = sortOption.field === 'date';
  const gameGroups = groupSavedGames(filteredAndSortedGames, isGroupedByDay);
  const isSearching = searchQuery.trim() !== '';
  // Without a tournament filter the listed games are exactly the team's matches; with one, a
  // filter hiding the team's matches mustn't read as the team having none.
  const teamHasSearchMatches =
    activeTournament === null
      ? listedGamesCount > 0
      : filterSavedGames(games, { tournament: null, query: searchQuery }).length > 0;
  const noResultsMessage =
    listedGamesCount === 0
      ? getNoResultsMessage({
          teamName,
          tournament: activeTournament,
          query: searchQuery,
          teamHasSearchMatches,
        })
      : null;

  // Switching teams would drop the selection, so neither team list shows while selecting.
  const canSwitchTeams = !selectionMode;
  const showsOtherTeamSearchMatches =
    canSwitchTeams && isSearching && !teamHasSearchMatches && otherTeamSearchMatches.length > 0;
  // One list of other teams at a time: search matches replace the footer.
  const showsOtherTeamsFooter =
    canSwitchTeams && otherTeams.length > 0 && !showsOtherTeamSearchMatches;

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
              onChangeSearchQuery(text);
              onClearSelection?.();
            }}
            clearButtonMode="while-editing"
          />
        </View>
        <Pressable
          testID="saved-games-sort"
          accessibilityRole="button"
          accessibilityLabel={`Sort and filter games, ${sortOption.label}`}
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
      </View>

      {activeTournament != null && (
        <Pressable
          testID="saved-games-tournament-chip"
          // Reaches the 44pt touch target; the chip is the list's only way to clear the filter.
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Clear tournament filter, ${activeTournament.name}`}
          onPress={() => {
            setTournamentFilter(null);
            onClearSelection?.();
          }}
          style={({ pressed }) => [
            styles.filterChip,
            { backgroundColor: palette.accentOverlay15 },
            pressed && styles.filterChipPressed,
          ]}>
          <ThemedText style={[styles.filterChipText, { color: palette.accent }]} numberOfLines={1}>
            {activeTournament.name}
          </ThemedText>
          <MaterialCommunityIcons
            name="close"
            size={scaleBySizeClass(16, sizeClass)}
            color={palette.accent}
          />
        </Pressable>
      )}

      <View style={styles.summaryRow}>
        <ThemedText style={[styles.summaryCount, { color: palette.textMuted }]}>
          {listedGamesCount} {listedGamesCount === 1 ? 'GAME' : 'GAMES'}
        </ThemedText>
        {summaryAction}
      </View>

      <View style={styles.savedGamesList}>
        {gameGroups.map((group) => {
          const groupTournamentName = getSharedTournament(group.games)?.name ?? null;
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
                      isSelected={selectedGameIds.has(game.id)}
                      onPress={() => {
                        if (selectionMode) {
                          onToggleGameSelection?.(game.id);
                        } else {
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

      {noResultsMessage != null && (
        <View style={styles.noResults}>
          <ThemedText style={{ color: palette.textMuted }}>{noResultsMessage}</ThemedText>
        </View>
      )}

      {showsOtherTeamSearchMatches && (
        <SavedGamesOtherTeamsSection
          title="Found in other teams"
          testID="saved-games-search-other-teams">
          {otherTeamSearchMatches.map(({ team, matchCount }, index) => {
            const matchLabel = `${matchCount} ${pluralize(matchCount, 'match', 'matches')}`;
            return (
              <SavedGamesOtherTeamRow
                key={team.id}
                testID={`saved-games-search-team-${team.id}`}
                label={team.name}
                detail={matchLabel}
                accessibilityLabel={`Switch to ${team.name}, ${matchLabel}`}
                showDivider={index < otherTeamSearchMatches.length - 1}
                onPress={() => onSearchTeam(team.id)}
              />
            );
          })}
        </SavedGamesOtherTeamsSection>
      )}

      {showsOtherTeamsFooter && (
        <SavedGamesOtherTeamsFooter
          otherTeams={otherTeams}
          onSelectTeam={onSelectTeam}
          onShowAllTeams={onShowAllTeams}
        />
      )}

      <SavedGamesSortSheet
        visible={showSortSheet}
        selectedKey={sortKey}
        onSelect={(key) => {
          onChangeSortKey(key);
          onClearSelection?.();
        }}
        tournamentOptions={tournamentOptions}
        selectedTournamentId={activeTournament?.id ?? null}
        onSelectTournament={(id) => {
          setTournamentFilter(id);
          onClearSelection?.();
        }}
        onClose={() => setShowSortSheet(false)}
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
      // Keeps the field usable when the sort label is long; it truncates instead.
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
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      maxWidth: '100%',
      gap: scaleBySizeClass(6, sizeClass),
      minHeight: scaleBySizeClass(32, sizeClass),
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      borderRadius: 999,
      // Pulls the summary row closer than the container's 16pt gap so the chip reads as its label.
      marginBottom: -8,
    },
    filterChipPressed: {
      opacity: 0.7,
    },
    filterChipText: {
      flexShrink: 1,
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
      // Pulls the first day group closer than the container's 16pt gap; the row's 44pt height already spaces it.
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
