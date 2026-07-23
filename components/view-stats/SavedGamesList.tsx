import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { TournamentFilterModal } from '@/components/ui/TournamentFilterModal';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatDate } from '@/lib/basic/statsUtils';
import { GameKind, GameListItem } from '@/lib/gameListUtils';
import { Tournament } from '@/lib/storage/types';
import { useTutorialStore } from '@/store/tutorialStore';
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
}

type SortField = 'date' | 'team' | 'score';
type SortDirection = 'asc' | 'desc';
const EMPTY_GAME_IDS = new Set<string>();
const EMPTY_TOURNAMENTS: Tournament[] = [];

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
}: SavedGamesListProps) {
  const { palette } = useTheme();
  const { hasSeenLongPressSelectHint, dismissLongPressSelectHint } = useTutorialStore();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
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

  // Search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filteredAndSortedGames = filteredAndSortedGames.filter((game) => {
      const t1 = game.myTeamName.toLowerCase();
      const t2 = game.opponentName.toLowerCase();
      const date = formatDate(game.timestamp).toLowerCase();
      return t1.includes(query) || t2.includes(query) || date.includes(query);
    });
  }

  // Sort
  const dir = sortDirection === 'asc' ? 1 : -1;
  filteredAndSortedGames.sort((a, b) => {
    switch (sortField) {
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
        <ThemedText style={[styles.emptySubtext, { color: palette.textMuted }]}>
          Save games from the win screen to see them here
        </ThemedText>
      </View>
    );
  }

  const sortFields: {
    field: SortField;
    label: string;
    ascIcon: keyof typeof MaterialCommunityIcons.glyphMap;
    descIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  }[] = [
    {
      field: 'date',
      label: 'Date',
      ascIcon: 'sort-calendar-ascending',
      descIcon: 'sort-calendar-descending',
    },
    {
      field: 'team',
      label: 'Team',
      ascIcon: 'sort-alphabetical-ascending',
      descIcon: 'sort-alphabetical-descending',
    },
    {
      field: 'score',
      label: 'Score',
      ascIcon: 'sort-numeric-ascending',
      descIcon: 'sort-numeric-descending',
    },
  ];

  const handleSortPress = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
    onClearSelection?.();
  };

  return (
    <View style={styles.container}>
      {/* Controls Header */}
      <View style={styles.controlsHeader}>
        <View
          style={[
            styles.searchWrapper,
            { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
          ]}>
          <MaterialCommunityIcons
            name="magnify"
            size={scaleBySizeClass(20, sizeClass)}
            color={palette.textMuted}
          />
          <TextInput
            style={[styles.searchInput, { color: palette.textInverse }]}
            placeholder="Search teams or dates..."
            placeholderTextColor={palette.textMuted}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              onClearSelection?.();
            }}
            clearButtonMode="while-editing"
          />
        </View>
        <View style={styles.sortPills}>
          {sortFields.map((opt) => {
            const isActive = sortField === opt.field;
            const icon = isActive && sortDirection === 'asc' ? opt.ascIcon : opt.descIcon;
            return (
              <Pressable
                key={opt.field}
                style={[
                  styles.sortPill,
                  { borderColor: palette.overlay10 },
                  isActive && { backgroundColor: palette.overlay10, borderColor: palette.accent },
                ]}
                onPress={() => handleSortPress(opt.field)}>
                <MaterialCommunityIcons
                  name={icon}
                  size={scaleBySizeClass(16, sizeClass)}
                  color={isActive ? palette.accent : palette.textMuted}
                />
                <ThemedText
                  style={[
                    styles.sortPillText,
                    { color: isActive ? palette.accent : palette.textMuted },
                    isActive && { fontFamily: Fonts.bold },
                  ]}>
                  {opt.label}
                </ThemedText>
              </Pressable>
            );
          })}
          {visibleTournaments.length > 0 && (
            <Pressable
              style={[
                styles.sortPill,
                { borderColor: activeTournament ? palette.accent : palette.overlay10 },
                activeTournament && {
                  backgroundColor: palette.overlay10,
                  borderColor: palette.accent,
                },
              ]}
              onPress={() => setShowTournamentFilter(true)}>
              <MaterialCommunityIcons
                name="trophy"
                size={scaleBySizeClass(14, sizeClass)}
                color={activeTournament ? palette.accent : palette.textMuted}
              />
              {activeTournament && (
                <ThemedText
                  style={[styles.sortPillText, { color: palette.accent, fontFamily: Fonts.bold }]}
                  numberOfLines={1}>
                  {activeTournament.name}
                </ThemedText>
              )}
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.savedGamesList}>
        {filteredAndSortedGames.map((game) => {
          const isAdvanced = game.kind === 'advanced';
          const isSelectable = selectedGameKind == null || selectedGameKind === game.kind;
          const isSelected = selectedGameIds.has(game.id);
          const isSelectionDisabled = selectionMode && !isSelectable;

          let myScoreColor: string;
          if (game.myScore > game.opponentScore) {
            myScoreColor = palette.success;
          } else if (game.myScore < game.opponentScore) {
            myScoreColor = palette.danger;
          } else {
            myScoreColor = palette.warning;
          }

          let oppScoreColor: string;
          if (game.opponentScore > game.myScore) {
            oppScoreColor = palette.success;
          } else if (game.opponentScore < game.myScore) {
            oppScoreColor = palette.danger;
          } else {
            oppScoreColor = palette.warning;
          }

          return (
            <Animated.View
              key={game.id}
              exiting={FadeOut.duration(200)}
              layout={LinearTransition.duration(300)}>
              <View
                style={[
                  styles.savedGameCard,
                  { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
                  isSelected && { borderColor: palette.accent },
                  isSelectionDisabled && styles.disabledCard,
                ]}>
                {selectionMode && (
                  <Pressable
                    style={styles.checkboxWrapper}
                    onPress={() => {
                      if (isSelectable) {
                        onToggleGameSelection?.(game.id);
                      }
                    }}
                    hitSlop={8}>
                    <View
                      style={[
                        styles.checkbox,
                        { borderColor: isSelectable ? palette.overlay20 : palette.overlay10 },
                        isSelected && {
                          backgroundColor: palette.accent,
                          borderColor: palette.accent,
                        },
                      ]}>
                      {isSelected && (
                        <MaterialCommunityIcons
                          name="check"
                          size={scaleBySizeClass(14, sizeClass)}
                          color={palette.textOnAccent}
                        />
                      )}
                    </View>
                  </Pressable>
                )}

                <Pressable
                  style={[styles.cardContent, selectionMode && { paddingLeft: 8 }]}
                  onPress={() => {
                    if (selectionMode && isSelectable) {
                      onToggleGameSelection?.(game.id);
                    } else if (!selectionMode) {
                      onSelectGame(game);
                    }
                  }}
                  onLongPress={() => {
                    if (!selectionMode) {
                      dismissLongPressSelectHint();
                      onEnterSelectionWithGame?.(game.id);
                    }
                  }}
                  delayLongPress={350}>
                  <View style={styles.savedGameHeader}>
                    <ThemedText style={[styles.savedGameDate, { color: palette.textMuted }]}>
                      {formatDate(game.timestamp)}
                    </ThemedText>
                    <View style={styles.headerBadges}>
                      {isAdvanced && (
                        <View
                          style={[
                            styles.advancedBadge,
                            {
                              backgroundColor: palette.indigoOverlay20,
                              borderColor: palette.accent,
                            },
                          ]}>
                          <ThemedText style={[styles.advancedBadgeText, { color: palette.accent }]}>
                            Advanced
                          </ThemedText>
                        </View>
                      )}
                      {game.importedAt != null && (
                        <MaterialCommunityIcons
                          name="cloud-download-outline"
                          size={scaleBySizeClass(14, sizeClass)}
                          color={palette.textMuted}
                        />
                      )}
                    </View>
                  </View>
                  {isLandscape ? (
                    <View style={styles.savedGameTeams}>
                      <ThemedText
                        style={[styles.savedGameTeamName, { color: palette.textInverse }]}
                        numberOfLines={1}>
                        {game.myTeamName}
                      </ThemedText>
                      <ScoreBadge score1={game.myScore} score2={game.opponentScore} />
                      <ThemedText
                        style={[
                          styles.savedGameTeamName,
                          styles.savedGameTeamRight,
                          { color: palette.textInverse },
                        ]}
                        numberOfLines={1}>
                        {game.opponentName}
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={styles.savedGameTeamsPortrait}>
                      <View style={styles.teamScoreRow}>
                        <ThemedText
                          style={[styles.savedGameTeamName, { color: palette.textInverse }]}
                          numberOfLines={1}>
                          {game.myTeamName}
                        </ThemedText>
                        <ThemedText style={[styles.teamScoreValue, { color: myScoreColor }]}>
                          {game.myScore}
                        </ThemedText>
                      </View>
                      <View style={styles.teamScoreRow}>
                        <ThemedText
                          style={[styles.savedGameTeamName, { color: palette.textInverse }]}
                          numberOfLines={1}>
                          {game.opponentName}
                        </ThemedText>
                        <ThemedText style={[styles.teamScoreValue, { color: oppScoreColor }]}>
                          {game.opponentScore}
                        </ThemedText>
                      </View>
                    </View>
                  )}
                  <View style={[styles.savedGameMeta, { borderTopColor: palette.overlay08 }]}>
                    <MaterialCommunityIcons
                      name="account-multiple"
                      size={scaleBySizeClass(14, sizeClass)}
                      color={palette.textMuted}
                    />
                    <ThemedText style={[styles.savedGameMetaText, { color: palette.textMuted }]}>
                      {game.pointsTracked} point{game.pointsTracked !== 1 ? 's' : ''} tracked
                    </ThemedText>
                  </View>
                </Pressable>
              </View>
            </Animated.View>
          );
        })}
      </View>

      {!hasSeenLongPressSelectHint && filteredAndSortedGames.length > 0 && (
        <View style={styles.longPressHint}>
          <MaterialCommunityIcons
            name="gesture-tap-hold"
            size={scaleBySizeClass(14, sizeClass)}
            color={palette.textMuted}
          />
          <ThemedText style={[styles.longPressHintText, { color: palette.textMuted }]}>
            Long press a game to select. Also toggleable from top right.
          </ThemedText>
        </View>
      )}

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

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      gap: 16,
    },
    controlsHeader: {
      flexDirection: isLandscape ? 'row' : 'column',
      gap: isLandscape ? 12 : 8,
    },
    searchWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: scaleBySizeClass(16, sizeClass),
      paddingVertical: 8,
    },
    sortPills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    sortPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      gap: 4,
    },
    sortPillText: {
      fontSize: scaleBySizeClass(12, sizeClass),
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
    emptySubtext: {
      fontSize: scaleBySizeClass(14, sizeClass),
      textAlign: 'center',
      opacity: 0.7,
    },
    noResults: {
      padding: 20,
      alignItems: 'center',
    },
    savedGamesList: {
      gap: 12,
    },
    savedGameCard: {
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
    },
    disabledCard: {
      opacity: 0.45,
    },
    checkboxWrapper: {
      paddingLeft: 16,
      paddingRight: 8,
      alignSelf: 'stretch',
      justifyContent: 'center',
    },
    cardContent: {
      flex: 1,
      padding: 16,
    },
    savedGameHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerBadges: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    advancedBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
    },
    advancedBadgeText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.3,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    savedGameDate: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    savedGameTeams: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    savedGameTeamsPortrait: {
      gap: 4,
    },
    teamScoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    teamScoreValue: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
      fontVariant: ['tabular-nums'],
      minWidth: 28,
      textAlign: 'right',
    },
    savedGameTeamName: {
      flex: 1,
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    savedGameTeamRight: {
      textAlign: 'right',
    },
    savedGameMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
    },
    savedGameMetaText: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
    longPressHint: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
    },
    longPressHintText: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
  });
}
