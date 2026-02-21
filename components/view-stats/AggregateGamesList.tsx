import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { resolveTeamName } from '@/lib/playerUtils';
import { formatDate } from '@/lib/statsUtils';
import { SavedGame } from '@/lib/storage';
import { useGameStore } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface AggregateGamesListProps {
  games: SavedGame[];
  selectedTeam: string | null; // Team ID (not name)
  selectedGameIds: Set<string>;
  onSelectTeam: (teamId: string) => void; // Pass team ID
  onBackToTeams: () => void;
  onToggleGameSelection: (gameId: string) => void;
  onToggleAllGames: (select: boolean) => void;
}

interface TeamGroup {
  id: string; // Team ID for selection
  name: string; // Display name (resolved live)
  gameCount: number;
  totalPoints: number;
}

export default function AggregateGamesList({
  games,
  selectedTeam, // This is now team ID
  selectedGameIds,
  onSelectTeam,
  onToggleGameSelection,
  onToggleAllGames,
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

  // Games for the selected team (by ID)
  const gamesForTeam = selectedTeam
    ? games.filter((g) => g.team1.id === selectedTeam).sort((a, b) => b.createdAt - a.createdAt)
    : [];

  // Empty state
  if (games.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name="chart-box-outline"
          size={scaleBySizeClass(48, sizeClass)}
          color={palette.textMuted}
        />
        <Text style={[styles.emptyText, { color: palette.textMuted }]}>No saved games yet</Text>
        <Text style={[styles.emptySubtext, { color: palette.textMuted }]}>
          Save games to aggregate stats across multiple games
        </Text>
      </View>
    );
  }

  // Level 2: Game selection for a specific team
  if (selectedTeam) {
    return (
      <View style={styles.container}>
        {/* Instructions */}
        <View style={styles.headerRow}>
          <Text style={[styles.instructions, { color: palette.textMuted }]}>
            Select games to combine stats
          </Text>
          <Pressable
            hitSlop={8}
            onPress={() => onToggleAllGames(selectedGameIds.size < gamesForTeam.length)}>
            <Text style={[styles.selectAllText, { color: palette.accent }]}>
              {selectedGameIds.size < gamesForTeam.length ? 'Select All' : 'Deselect All'}
            </Text>
          </Pressable>
        </View>

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
                  <Text style={[styles.opponentText, { color: palette.textInverse }]}>
                    vs {game.team2Name}
                  </Text>
                  <View style={styles.gameDetails}>
                    <ScoreBadge score1={game.team1Score} score2={game.team2Score} size="small" />
                    <Text style={[styles.dateText, { color: palette.textMuted }]}>
                      {formatDate(game.createdAt)}
                    </Text>
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
      <Text style={[styles.instructions, { color: palette.textMuted }]}>
        Select a team to aggregate stats
      </Text>

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
              <Text style={[styles.teamName, { color: palette.textInverse }]}>{team.name}</Text>
              <Text style={[styles.teamMeta, { color: palette.textMuted }]}>
                {team.gameCount} game{team.gameCount !== 1 ? 's' : ''} • {team.totalPoints} points
                tracked
              </Text>
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
    emptySubtext: {
      fontSize: scaleBySizeClass(14, sizeClass),
      textAlign: 'center',
      opacity: 0.7,
    },
    instructions: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    selectAllText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '600',
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
      fontWeight: '600',
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
      fontWeight: '600',
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
