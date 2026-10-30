import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import AggregateGamePicker from '@/components/view-stats/AggregateGamePicker';
import AggregateTeamList from '@/components/view-stats/AggregateTeamList';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { basicGameToListItem, groupBasicGamesByTeam } from '@/lib/gameListUtils';
import { SavedGame } from '@/lib/storage';
import { Tournament } from '@/lib/storage/types';
import { useGameStore } from '@/store/basic/gameStore';

interface AggregateGamesListProps {
  games: SavedGame[];
  selectedTeam: string | null; // Team ID (not name)
  selectedGameIds: Set<string>;
  onSelectTeam: (teamId: string) => void;
  onToggleGameSelection: (gameId: string) => void;
  onSelectGames: (gameIds: string[]) => void;
  onDeselectGames: (gameIds: string[]) => void;
  tournaments: Tournament[];
  tournamentIdsByGame: Map<string, string>;
}

export default function AggregateGamesList({
  games,
  selectedTeam,
  selectedGameIds,
  onSelectTeam,
  onToggleGameSelection,
  onSelectGames,
  onDeselectGames,
  tournaments,
  tournamentIdsByGame,
}: AggregateGamesListProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { savedTeams } = useGameStore();

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
    const teamGames = games
      .filter((game) => game.team1.id === selectedTeam)
      .map((game) => basicGameToListItem(game, savedTeams));

    return (
      <AggregateGamePicker
        games={teamGames}
        tournaments={tournaments}
        tournamentIdsByGame={tournamentIdsByGame}
        selectedGameIds={selectedGameIds}
        onToggleGameSelection={onToggleGameSelection}
        onSelectGames={onSelectGames}
        onDeselectGames={onDeselectGames}
      />
    );
  }

  // Level 1: Team list
  return (
    <AggregateTeamList
      teams={groupBasicGamesByTeam(games, savedTeams)}
      onSelectTeam={onSelectTeam}
    />
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
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
  });
}
