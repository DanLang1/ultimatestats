import { useAlert } from '@/components/ui/AlertProvider';
import { formatDate } from '@/lib/statsUtils';
import { SavedGame } from '@/lib/storage';
import { palette } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface SavedGamesListProps {
  games: SavedGame[];
  onSelectGame: (game: SavedGame) => void;
  onDeleteGame: (id: string) => void;
}

export default function SavedGamesList({ games, onSelectGame, onDeleteGame }: SavedGamesListProps) {
  const { showAlert } = useAlert();

  const handleDelete = (game: SavedGame) => {
    showAlert({
      title: 'Delete Game?',
      message: `Delete ${game.team1Name} vs ${game.team2Name} (${game.team1Score}-${game.team2Score})?`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDeleteGame(game.id) },
      ],
    });
  };

  if (games.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="history" size={48} color={palette.textMuted} />
        <Text style={styles.emptyText}>No saved games yet</Text>
        <Text style={styles.emptySubtext}>Save games from the win screen to see them here</Text>
      </View>
    );
  }

  return (
    <View style={styles.savedGamesList}>
      {[...games]
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((game) => (
          <Pressable key={game.id} style={styles.savedGameCard} onPress={() => onSelectGame(game)}>
            <View style={styles.savedGameHeader}>
              <Text style={styles.savedGameDate}>{formatDate(game.createdAt)}</Text>
              <Pressable onPress={() => handleDelete(game)} hitSlop={8}>
                <MaterialCommunityIcons name="delete-outline" size={20} color={palette.textMuted} />
              </Pressable>
            </View>
            <View style={styles.savedGameTeams}>
              <Text style={styles.savedGameTeamName} numberOfLines={1}>
                {game.team1Name}
              </Text>
              <View style={styles.savedGameScore}>
                <Text style={styles.savedGameScoreText}>
                  {game.team1Score} - {game.team2Score}
                </Text>
              </View>
              <Text style={[styles.savedGameTeamName, styles.savedGameTeamRight]} numberOfLines={1}>
                {game.team2Name}
              </Text>
            </View>
            <View style={styles.savedGameMeta}>
              <MaterialCommunityIcons name="account-multiple" size={14} color={palette.textMuted} />
              <Text style={styles.savedGameMetaText}>
                {game.statRecords.length} point{game.statRecords.length !== 1 ? 's' : ''} tracked
              </Text>
            </View>
          </Pressable>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: palette.textMuted,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: palette.textMuted,
    textAlign: 'center',
    opacity: 0.7,
  },
  savedGamesList: {
    gap: 12,
  },
  savedGameCard: {
    backgroundColor: palette.overlay05,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.overlay10,
  },
  savedGameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  savedGameDate: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  savedGameTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savedGameTeamName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: palette.textInverse,
  },
  savedGameTeamRight: {
    textAlign: 'right',
  },
  savedGameScore: {
    backgroundColor: palette.overlay10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  savedGameScoreText: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.textInverse,
  },
  savedGameMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.overlay08,
  },
  savedGameMetaText: {
    fontSize: 12,
    color: palette.textMuted,
  },
});
