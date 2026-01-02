import { useAlert } from '@/components/ui/AlertProvider';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { useTheme } from '@/context/ThemeContext';
import { formatDate } from '@/lib/statsUtils';
import { SavedGame } from '@/lib/storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

interface SavedGamesListProps {
  games: SavedGame[];
  onSelectGame: (game: SavedGame) => void;
  onDeleteGame: (id: string) => void;
}

export default function SavedGamesList({ games, onSelectGame, onDeleteGame }: SavedGamesListProps) {
  const { showAlert } = useAlert();
  const { palette } = useTheme();

  const handleDelete = (game: SavedGame) => {
    showAlert({
      title: 'Delete Game?',
      message: `Delete ${game.team1.name} vs ${game.team2Name} (${game.team1Score}-${game.team2Score})?`,
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
        <Text style={[styles.emptyText, { color: palette.textMuted }]}>No saved games yet</Text>
        <Text style={[styles.emptySubtext, { color: palette.textMuted }]}>
          Save games from the win screen to see them here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.savedGamesList}>
      {[...games]
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((game) => (
          <Animated.View key={game.id} layout={LinearTransition}>
            <Pressable
              style={[
                styles.savedGameCard,
                { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
              ]}
              onPress={() => onSelectGame(game)}>
              <View style={styles.savedGameHeader}>
                <Text style={[styles.savedGameDate, { color: palette.textMuted }]}>
                  {formatDate(game.createdAt)}
                </Text>
                <Pressable onPress={() => handleDelete(game)} hitSlop={8}>
                  <MaterialCommunityIcons
                    name="delete-outline"
                    size={20}
                    color={palette.textMuted}
                  />
                </Pressable>
              </View>
              <View style={styles.savedGameTeams}>
                <Text
                  style={[styles.savedGameTeamName, { color: palette.textInverse }]}
                  numberOfLines={1}>
                  {game.team1.name}
                </Text>
                <ScoreBadge score1={game.team1Score} score2={game.team2Score} />
                <Text
                  style={[
                    styles.savedGameTeamName,
                    styles.savedGameTeamRight,
                    { color: palette.textInverse },
                  ]}
                  numberOfLines={1}>
                  {game.team2Name}
                </Text>
              </View>
              <View style={[styles.savedGameMeta, { borderTopColor: palette.overlay08 }]}>
                <MaterialCommunityIcons
                  name="account-multiple"
                  size={14}
                  color={palette.textMuted}
                />
                <Text style={[styles.savedGameMetaText, { color: palette.textMuted }]}>
                  {game.events.filter((e) => e.type === 'goal').length} point
                  {game.events.filter((e) => e.type === 'goal').length !== 1 ? 's' : ''} tracked
                </Text>
              </View>
            </Pressable>
          </Animated.View>
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
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  savedGamesList: {
    gap: 12,
  },
  savedGameCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
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
    fontSize: 12,
  },
});
