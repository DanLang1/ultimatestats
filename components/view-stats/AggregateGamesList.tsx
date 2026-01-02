import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { useTheme } from '@/context/ThemeContext';
import { formatDate } from '@/lib/statsUtils';
import { SavedGame } from '@/lib/storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface AggregateGamesListProps {
  games: SavedGame[];
  selectedTeam: string | null;
  selectedGameIds: Set<string>;
  onSelectTeam: (teamName: string) => void;
  onBackToTeams: () => void;
  onToggleGameSelection: (gameId: string) => void;
  onViewAggregated: () => void;
  onToggleAllGames: (select: boolean) => void;
}

interface TeamGroup {
  name: string;
  gameCount: number;
  totalPoints: number;
}

export default function AggregateGamesList({
  games,
  selectedTeam,
  selectedGameIds,
  onSelectTeam,
  onToggleGameSelection,
  onViewAggregated,
  onToggleAllGames,
}: AggregateGamesListProps) {
  const { palette } = useTheme();

  // Group games by team1.name
  const groupMap = new Map<string, { gameCount: number; totalPoints: number }>();
  for (const game of games) {
    const goalCount = game.events.filter((e) => e.type === 'goal').length;
    const existing = groupMap.get(game.team1.name);
    if (existing) {
      existing.gameCount++;
      existing.totalPoints += goalCount;
    } else {
      groupMap.set(game.team1.name, {
        gameCount: 1,
        totalPoints: goalCount,
      });
    }
  }
  const teamGroups: TeamGroup[] = Array.from(groupMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.gameCount - a.gameCount);

  // Games for the selected team
  const gamesForTeam = selectedTeam
    ? games.filter((g) => g.team1.name === selectedTeam).sort((a, b) => b.createdAt - a.createdAt)
    : [];

  // Empty state
  if (games.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="chart-box-outline" size={48} color={palette.textMuted} />
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
                    <MaterialCommunityIcons name="check" size={14} color={palette.textOnAccent} />
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

        {/* View Combined button (appears when games are selected) */}
        {selectedGameIds.size > 0 && (
          <Pressable
            style={[styles.viewCombinedButton, { backgroundColor: palette.accent }]}
            onPress={onViewAggregated}>
            <MaterialCommunityIcons name="chart-box" size={20} color={palette.textOnAccent} />
            <Text style={[styles.viewCombinedText, { color: palette.textOnAccent }]}>
              View Combined ({selectedGameIds.size} game{selectedGameIds.size !== 1 ? 's' : ''})
            </Text>
          </Pressable>
        )}
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
            key={team.name}
            style={[
              styles.teamCard,
              { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
            ]}
            onPress={() => onSelectTeam(team.name)}>
            <View style={styles.teamInfo}>
              <Text style={[styles.teamName, { color: palette.textInverse }]}>{team.name}</Text>
              <Text style={[styles.teamMeta, { color: palette.textMuted }]}>
                {team.gameCount} game{team.gameCount !== 1 ? 's' : ''} • {team.totalPoints} points
                tracked
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={palette.textMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  instructions: {
    fontSize: 12,
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
    fontSize: 14,
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
    fontSize: 18,
    fontWeight: '600',
  },
  teamMeta: {
    fontSize: 13,
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
    fontSize: 16,
    fontWeight: '600',
  },
  gameDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    fontSize: 12,
  },
  viewCombinedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  viewCombinedText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
