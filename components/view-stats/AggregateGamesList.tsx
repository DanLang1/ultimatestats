import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { resolveTeamName } from '@/lib/playerUtils';
import { getGameDisplayTimestamp } from '@/lib/savedGameUtils';
import { formatDate } from '@/lib/basic/statsUtils';
import { SavedGame } from '@/lib/storage';
import { Tournament } from '@/lib/storage/types';
import { useGameStore } from '@/store/basic/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';

interface AggregateGamesListProps {
  games: SavedGame[];
  selectedTeam: string | null; // Team ID (not name)
  selectedGameIds: Set<string>;
  onSelectTeam: (teamId: string) => void; // Pass team ID
  onToggleGameSelection: (gameId: string) => void;
  onSelectAllGames: (gameIds: string[]) => void;
  onDeselectAllGames: () => void;
  tournaments: Tournament[];
  tournamentIdsByGame: Map<string, string>;
  tournamentFilter: string | null; // null = all games
  onSetTournamentFilter: (tournamentId: string | null) => void;
  onCreateTournament: () => void;
}

interface TeamGroup {
  id: string; // Team ID for selection
  name: string; // Display name (resolved live)
  gameCount: number;
  totalPoints: number;
}

export default function AggregateGamesList({
  games,
  selectedTeam,
  selectedGameIds,
  onSelectTeam,
  onToggleGameSelection,
  onSelectAllGames,
  onDeselectAllGames,
  tournaments,
  tournamentIdsByGame,
  tournamentFilter,
  onSetTournamentFilter,
  onCreateTournament,
}: AggregateGamesListProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { savedTeams } = useGameStore();

  // Helper to get live team name with snapshot fallback
  const getTeamName = (game: SavedGame) =>
    resolveTeamName(game.team1.id, game.team1.name, savedTeams);

  // Group games by team1.id (not name)
  const groupMap = new Map<string, { name: string; gameCount: number; totalPoints: number }>();
  for (const game of games) {
    const goalCount = game.events.filter((e) => e.type === 'goal').length;
    const teamId = game.team1.id;
    const teamName = getTeamName(game);
    const existing = groupMap.get(teamId);
    if (existing) {
      existing.gameCount++;
      existing.totalPoints += goalCount;
    } else {
      groupMap.set(teamId, {
        name: teamName,
        gameCount: 1,
        totalPoints: goalCount,
      });
    }
  }
  const teamGroups: TeamGroup[] = Array.from(groupMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.gameCount - a.gameCount);

  // Games for the selected team (by ID), optionally filtered by tournament
  const allGamesForTeam = selectedTeam
    ? games
        .filter((g) => g.team1.id === selectedTeam)
        .sort((a, b) => getGameDisplayTimestamp(b) - getGameDisplayTimestamp(a))
    : [];

  const gamesForTeam = tournamentFilter
    ? allGamesForTeam.filter((g) => tournamentIdsByGame.get(g.id) === tournamentFilter)
    : allGamesForTeam;

  // Game counts per tournament for this team
  const tournamentGameCounts = new Map<string, number>();
  for (const game of allGamesForTeam) {
    const tournamentId = tournamentIdsByGame.get(game.id);
    if (tournamentId) {
      tournamentGameCounts.set(tournamentId, (tournamentGameCounts.get(tournamentId) ?? 0) + 1);
    }
  }

  // Empty state
  if (games.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name="chart-box-outline"
          size={scaleBySizeClass(48, sizeClass)}
          color={palette.textMuted}
        />
        <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>
          No saved games yet
        </ThemedText>
        <ThemedText style={[styles.emptySubtext, { color: palette.textMuted }]}>
          Save games to aggregate stats across multiple games
        </ThemedText>
      </View>
    );
  }

  // Level 2: Game selection for a specific team
  if (selectedTeam) {
    return (
      <View style={styles.container}>
        {/* Tournament cards section */}
        <View style={styles.tournamentSection}>
          <ThemedText style={[styles.instructions, { color: palette.textMuted }]}>
            Tournaments
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tournamentCards}>
            {tournaments.map((t) => {
              const gameCount = tournamentGameCounts.get(t.id) ?? 0;
              const isActive = tournamentFilter === t.id;

              return (
                <Pressable
                  key={t.id}
                  style={[
                    styles.tournamentCard,
                    { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
                    isActive && { borderColor: palette.accent },
                  ]}
                  onPress={() => onSetTournamentFilter(isActive ? null : t.id)}>
                  <MaterialCommunityIcons
                    name="trophy"
                    size={scaleBySizeClass(16, sizeClass)}
                    color={isActive ? palette.accent : palette.textMuted}
                  />
                  <ThemedText
                    style={[
                      styles.tournamentCardName,
                      { color: isActive ? palette.accent : palette.textInverse },
                    ]}
                    numberOfLines={1}>
                    {t.name}
                  </ThemedText>
                  <ThemedText style={[styles.tournamentCardMeta, { color: palette.textMuted }]}>
                    {gameCount} game{gameCount !== 1 ? 's' : ''}
                  </ThemedText>
                </Pressable>
              );
            })}
            <Pressable
              style={[
                styles.tournamentCard,
                styles.createTournamentCard,
                { borderColor: palette.overlay10 },
              ]}
              onPress={onCreateTournament}>
              <MaterialCommunityIcons
                name="plus"
                size={scaleBySizeClass(20, sizeClass)}
                color={palette.accent}
              />
              <ThemedText style={[styles.tournamentCardName, { color: palette.accent }]}>
                Create
              </ThemedText>
            </Pressable>
          </ScrollView>
        </View>

        {/* Games header */}
        <View style={styles.headerRow}>
          <View style={styles.gamesHeaderLeft}>
            <ThemedText style={[styles.instructions, { color: palette.textMuted }]}>
              {tournamentFilter ? 'Tournament Games' : 'All Games'}
            </ThemedText>
            {tournamentFilter && (
              <Pressable hitSlop={8} onPress={() => onSetTournamentFilter(null)}>
                <ThemedText style={[styles.clearFilterText, { color: palette.accent }]}>
                  Show All
                </ThemedText>
              </Pressable>
            )}
          </View>
          <View style={styles.headerActions}>
            <Pressable
              hitSlop={8}
              onPress={() => {
                const visibleIds = gamesForTeam.map((g) => g.id);
                const allVisibleSelected =
                  gamesForTeam.length > 0 && visibleIds.every((id) => selectedGameIds.has(id));
                if (allVisibleSelected) {
                  onDeselectAllGames();
                } else {
                  onSelectAllGames(visibleIds);
                }
              }}>
              <ThemedText style={[styles.selectAllText, { color: palette.accent }]}>
                {gamesForTeam.length > 0 && gamesForTeam.every((g) => selectedGameIds.has(g.id))
                  ? 'Deselect All'
                  : 'Select All'}
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Empty state for filtered results */}
        {gamesForTeam.length === 0 && tournamentFilter && (
          <ThemedText style={[styles.emptyFilterText, { color: palette.textMuted }]}>
            No games in this tournament
          </ThemedText>
        )}

        {/* Game list with checkboxes */}
        <View style={styles.gamesList}>
          {gamesForTeam.map((game) => {
            const isSelected = selectedGameIds.has(game.id);
            return (
              <Pressable
                key={game.id}
                style={[
                  styles.gameCard,
                  { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
                  isSelected && { borderColor: palette.accent },
                ]}
                onPress={() => onToggleGameSelection(game.id)}>
                {/* Checkbox */}
                <View
                  style={[
                    styles.checkbox,
                    { borderColor: palette.overlay20 },
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

                {/* Game info */}
                <View style={styles.gameInfo}>
                  <ThemedText style={[styles.opponentText, { color: palette.textInverse }]}>
                    vs {game.team2Name}
                  </ThemedText>
                  <View style={styles.gameDetails}>
                    <ScoreBadge score1={game.team1Score} score2={game.team2Score} size="small" />
                    <ThemedText style={[styles.dateText, { color: palette.textMuted }]}>
                      {formatDate(getGameDisplayTimestamp(game))}
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  // Level 1: Team list
  return (
    <View style={styles.container}>
      <ThemedText style={[styles.instructions, { color: palette.textMuted }]}>
        Select a team to aggregate stats
      </ThemedText>

      <View style={styles.teamsList}>
        {teamGroups.map((team) => (
          <Pressable
            key={team.id}
            style={[
              styles.teamCard,
              { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
            ]}
            onPress={() => onSelectTeam(team.id)}>
            <View style={styles.teamInfo}>
              <ThemedText style={[styles.teamName, { color: palette.textInverse }]}>
                {team.name}
              </ThemedText>
              <ThemedText style={[styles.teamMeta, { color: palette.textMuted }]}>
                {team.gameCount} game{team.gameCount !== 1 ? 's' : ''} • {team.totalPoints} points
                tracked
              </ThemedText>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={scaleBySizeClass(24, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      gap: 16,
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
    emptyFilterText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      textAlign: 'center',
      paddingVertical: 24,
    },
    emptySubtext: {
      fontSize: scaleBySizeClass(14, sizeClass),
      textAlign: 'center',
      opacity: 0.7,
    },
    instructions: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    selectAllText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    gamesHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    clearFilterText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    tournamentSection: {
      gap: 10,
    },
    tournamentCards: {
      flexDirection: 'row',
      gap: 10,
    },
    tournamentCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 12,
      width: scaleBySizeClass(130, sizeClass),
      gap: 4,
    },
    createTournamentCard: {
      alignItems: 'center',
      justifyContent: 'center',
      borderStyle: 'dashed',
    },
    tournamentCardName: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    tournamentCardMeta: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
    teamsList: {
      gap: 12,
    },
    teamCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
    },
    teamInfo: {
      flex: 1,
      gap: 4,
    },
    teamName: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    teamMeta: {
      fontSize: scaleBySizeClass(13, sizeClass),
    },
    gamesList: {
      gap: 10,
    },
    gameCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      gap: 14,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gameInfo: {
      flex: 1,
      gap: 6,
    },
    opponentText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    gameDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    dateText: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
  });
}
