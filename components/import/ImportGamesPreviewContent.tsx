import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { useTheme } from '@/context/ThemeContext';
import { useLayout } from '@/hooks/useLayout';
import type { ShareImportState } from '@/hooks/useShareImport';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { formatDate } from '@/lib/basic/statsUtils';
import { advancedGameToListItem } from '@/lib/gameListUtils';
import { resolveTeamName } from '@/lib/playerUtils';
import { getGameDisplayTimestamp } from '@/lib/savedGameUtils';
import type { SavedGame, SavedTeam } from '@/lib/storage';

import { createImportContentMetrics, createImportContentStyles } from './importContentStyles';

type GamesPreviewState = Extract<
  ShareImportState,
  { status: 'preview-games' | 'preview-advanced-games' }
>;

interface ImportGamesPreviewContentProps {
  state: GamesPreviewState;
  savedTeams: SavedTeam[];
  onDismiss: () => void;
  onImportGames: (games: SavedGame[]) => void;
  onImportAdvancedGames: (games: AdvancedTrackedGame[]) => void;
}

export function ImportGamesPreviewContent({
  state,
  savedTeams,
  onDismiss,
  onImportGames,
  onImportAdvancedGames,
}: ImportGamesPreviewContentProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createImportContentStyles(sizeClass);
  const metrics = createImportContentMetrics(sizeClass);
  const newCount = state.games.length - state.updateCount;
  const isAdvanced = state.status === 'preview-advanced-games';

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.content}>
      <MaterialCommunityIcons
        name="cloud-download-outline"
        size={metrics.statusIconMedium}
        color={palette.accent}
      />
      <ThemedText style={[styles.title, { color: palette.modalText }]}>
        Import {state.games.length} {isAdvanced ? 'advanced ' : ''}game
        {state.games.length !== 1 ? 's' : ''}?
      </ThemedText>
      {state.updateCount > 0 && newCount > 0 && (
        <ThemedText style={[styles.subtitle, { color: palette.modalTextMuted }]}>
          {newCount} new · {state.updateCount} re-imported
        </ThemedText>
      )}
      {state.updateCount > 0 && newCount === 0 && (
        <ThemedText style={[styles.subtitle, { color: palette.modalTextMuted }]}>
          {state.updateCount === 1 ? 'This game' : 'All games'} will be re-imported
        </ThemedText>
      )}
      <ScrollView style={styles.gamesList} contentContainerStyle={styles.gamesListContent}>
        {state.status === 'preview-games'
          ? state.games.map((game) => (
              <View key={game.id} style={[styles.gameRow, { backgroundColor: palette.overlay05 }]}>
                <View style={styles.gameRowInfo}>
                  <ThemedText
                    style={[styles.gameRowTeams, { color: palette.modalText }]}
                    numberOfLines={1}>
                    {resolveTeamName(game.team1.id, game.team1.name, savedTeams)} vs{' '}
                    {game.team2Name}
                  </ThemedText>
                  <ThemedText style={[styles.previewMeta, { color: palette.modalTextMuted }]}>
                    {formatDate(getGameDisplayTimestamp(game))}
                  </ThemedText>
                </View>
                <ScoreBadge score1={game.team1Score} score2={game.team2Score} size="small" />
              </View>
            ))
          : state.games.map((rawGame) => {
              const game = advancedGameToListItem(rawGame);
              return (
                <View
                  key={game.id}
                  style={[styles.gameRow, { backgroundColor: palette.overlay05 }]}>
                  <View style={styles.gameRowInfo}>
                    <ThemedText
                      style={[styles.gameRowTeams, { color: palette.modalText }]}
                      numberOfLines={1}>
                      {game.myTeamName} vs {game.opponentName}
                    </ThemedText>
                    <ThemedText style={[styles.previewMeta, { color: palette.modalTextMuted }]}>
                      {formatDate(game.timestamp)}
                    </ThemedText>
                  </View>
                  <ScoreBadge score1={game.myScore} score2={game.opponentScore} size="small" />
                </View>
              );
            })}
      </ScrollView>
      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, { backgroundColor: palette.overlay10 }]}
          onPress={onDismiss}>
          <ThemedText style={[styles.buttonText, { color: palette.modalText }]}>Cancel</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.button, { backgroundColor: palette.accent }]}
          onPress={() => {
            if (state.status === 'preview-games') onImportGames(state.games);
            else onImportAdvancedGames(state.games);
          }}>
          <ThemedText style={[styles.buttonText, { color: palette.textOnAccent }]}>
            Import
          </ThemedText>
        </Pressable>
      </View>
    </Animated.View>
  );
}
