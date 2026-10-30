import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import AggregateGamePicker from '@/components/view-stats/AggregateGamePicker';
import AggregateTeamList from '@/components/view-stats/AggregateTeamList';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { AdvancedGameSummary } from '@/lib/advancedTracking/summary';
import { advancedGameSummaryToTeamListItem, groupAdvancedGamesByTeam } from '@/lib/gameListUtils';
import { Tournament } from '@/lib/storage/types';
import { hasItems } from '@/lib/utils';
import { useGameStore } from '@/store/basic/gameStore';

interface AdvancedAggregateGamesListProps {
  games: AdvancedGameSummary[];
  selectedTeamId: string | null;
  selectedGameIds: Set<string>;
  onSelectTeam: (teamId: string) => void;
  onToggleGameSelection: (gameId: string) => void;
  onSelectGames: (gameIds: string[]) => void;
  onDeselectGames: (gameIds: string[]) => void;
  tournaments: Tournament[];
  tournamentIdsByGame: Map<string, string>;
}

export default function AdvancedAggregateGamesList({
  games,
  selectedTeamId,
  selectedGameIds,
  onSelectTeam,
  onToggleGameSelection,
  onSelectGames,
  onDeselectGames,
  tournaments,
  tournamentIdsByGame,
}: AdvancedAggregateGamesListProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { savedTeams } = useGameStore();

  if (!hasItems(games)) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name="chart-box-outline"
          size={scaleBySizeClass(48, sizeClass)}
          color={palette.textMuted}
        />
        <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>
          No advanced games yet
        </ThemedText>
      </View>
    );
  }

  if (selectedTeamId) {
    const teamGames = games
      .filter((game) => (game.focusSourceTeamId ?? game.focusSideId) === selectedTeamId)
      .map((game) => advancedGameSummaryToTeamListItem(game, savedTeams));

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

  return (
    <AggregateTeamList
      teams={groupAdvancedGamesByTeam(games, savedTeams)}
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
  });
}
