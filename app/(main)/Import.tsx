import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useIsGameActive } from '@/hooks/useIsGameActive';
import { useShareImport } from '@/hooks/useShareImport';
import { resolveTeamName } from '@/lib/playerUtils';
import { getGameDisplayTimestamp } from '@/lib/savedGameUtils';
import { SharedPayload } from '@/lib/sharing';
import { formatDate } from '@/lib/statsUtils';
import { SavedGame, SavedTeam } from '@/lib/storage';
import { useGameStore } from '@/store/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

type GamePayload = Extract<SharedPayload, { type: 'game' }>;
type TeamPayload = Extract<SharedPayload, { type: 'team' }>;

export default function ImportScreen() {
  const { shareId } = useLocalSearchParams<{ shareId: string }>();
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { savedTeams, importGame, importTeam, loadTeam } = useGameStore();
  const { isPending, importState, setImportState } = useShareImport(shareId);
  const gameActive = useIsGameActive();

  if (!shareId) {
    return null;
  }

  const handleDone = () => {
    router.dismissTo('/');
  };

  const handleGoToGame = (gameId: string) => {
    router.dismissTo('/');
    router.push({ pathname: '/saved-games/[gameId]', params: { gameId } });
  };

  const handleGoToTeam = () => {
    router.dismissTo('/');
    router.push('/EditRoster');
  };

  const handleImportGame = async (payload: GamePayload, isUpdate: boolean) => {
    setImportState({ status: 'done', type: 'game', gameId: payload.data.id });
    await importGame({ ...payload.data, importedAt: Date.now() });
  };

  const handleImportGames = async (games: SavedGame[]) => {
    setImportState({ status: 'done', type: 'games', count: games.length });
    for (const game of games) {
      await importGame({ ...game, importedAt: Date.now() });
    }
  };

  const handleGoToGames = () => {
    router.dismissTo('/');
    router.push('/SavedGameStats');
  };

  const handleImportTeam = async (payload: TeamPayload) => {
    setImportState({ status: 'done', type: 'team' });
    await importTeam(payload.data);
    if (payload.presets?.length) {
      useLinePresetsStore.getState().importPresetsForTeam(payload.data.id, payload.presets);
    }
    if (!gameActive) {
      loadTeam(payload.data.id);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.centered}>
        <View
          style={[styles.card, { backgroundColor: palette.modalBg, shadowColor: palette.shadow }]}>
          {isPending && <LoadingContent palette={palette} />}

          {importState?.status === 'error' && (
            <ErrorContent palette={palette} message={importState.message} onDismiss={handleDone} />
          )}

          {importState?.status === 'preview-game' && (
            <GamePreviewContent
              palette={palette}
              payload={importState.payload}
              savedTeams={savedTeams}
              isUpdate={importState.isUpdate}
              onImport={() => handleImportGame(importState.payload, importState.isUpdate)}
              onCancel={handleDone}
            />
          )}

          {importState?.status === 'preview-games' && (
            <GamesPreviewContent
              palette={palette}
              games={importState.games}
              updateCount={importState.updateCount}
              savedTeams={savedTeams}
              onImport={() => handleImportGames(importState.games)}
              onCancel={handleDone}
            />
          )}

          {importState?.status === 'preview-team' && (
            <TeamPreviewContent
              palette={palette}
              payload={importState.payload}
              onImport={() => handleImportTeam(importState.payload)}
              onCancel={handleDone}
            />
          )}

          {importState?.status === 'team-exists' && (
            <TeamExistsContent
              palette={palette}
              payload={importState.payload}
              existingTeam={importState.existingTeam}
              onUpdate={() => handleImportTeam(importState.payload)}
              onKeep={handleDone}
            />
          )}

          {importState?.status === 'done' && importState.type === 'game' && (
            <DoneContent
              palette={palette}
              type="game"
              onAction={() => handleGoToGame(importState.gameId)}
              actionLabel="View Game"
            />
          )}

          {importState?.status === 'done' && importState.type === 'team' && (
            <DoneContent
              palette={palette}
              type="team"
              onAction={handleGoToTeam}
              actionLabel="View Team"
            />
          )}

          {importState?.status === 'done' && importState.type === 'games' && (
            <DoneContent
              palette={palette}
              type="games"
              count={importState.count}
              onAction={handleGoToGames}
              actionLabel="View Games"
            />
          )}
        </View>
      </View>
    </ThemedView>
  );
}

function LoadingContent({ palette }: { palette: ReturnType<typeof useTheme>['palette'] }) {
  const { styles } = useImportUi();
  return (
    <View style={styles.content}>
      <ActivityIndicator size="large" color={palette.accent} />
      <ThemedText style={[styles.title, { color: palette.modalText }]}>
        Loading shared data...
      </ThemedText>
    </View>
  );
}

function ErrorContent({
  palette,
  message,
  onDismiss,
}: {
  palette: ReturnType<typeof useTheme>['palette'];
  message: string;
  onDismiss: () => void;
}) {
  const { styles, metrics } = useImportUi();
  return (
    <View style={styles.content}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={metrics.statusIconLarge}
        color={palette.danger}
      />
      <ThemedText style={[styles.title, { color: palette.modalText }]}>Import Failed</ThemedText>
      <ThemedText style={[styles.subtitle, { color: palette.modalTextMuted }]}>
        {message}
      </ThemedText>
      <Pressable
        style={[styles.button, { backgroundColor: palette.overlay10 }]}
        onPress={onDismiss}>
        <ThemedText style={[styles.buttonText, { color: palette.modalText }]}>OK</ThemedText>
      </Pressable>
    </View>
  );
}

function GamePreviewContent({
  palette,
  payload,
  savedTeams,
  isUpdate,
  onImport,
  onCancel,
}: {
  palette: ReturnType<typeof useTheme>['palette'];
  payload: GamePayload;
  savedTeams: SavedTeam[];
  isUpdate: boolean;
  onImport: () => void;
  onCancel: () => void;
}) {
  const { styles, metrics } = useImportUi();
  const game = payload.data;
  const teamName = resolveTeamName(game.team1.id, game.team1.name, savedTeams);
  const goalCount = game.events.filter((e) => e.type === 'goal').length;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.content}>
      <MaterialCommunityIcons
        name="cloud-download-outline"
        size={metrics.statusIconMedium}
        color={palette.accent}
      />
      <ThemedText style={[styles.title, { color: palette.modalText }]}>Import game?</ThemedText>
      {isUpdate && (
        <ThemedText style={[styles.subtitle, { color: palette.modalTextMuted }]}>
          You already have this game. Importing will replace your saved copy.
        </ThemedText>
      )}

      <View style={styles.previewCard}>
        <ThemedText style={[styles.previewTeams, { color: palette.modalText }]}>
          {teamName} vs {game.team2Name}
        </ThemedText>
        <ScoreBadge score1={game.team1Score} score2={game.team2Score} size="large" />
        <ThemedText style={[styles.previewMeta, { color: palette.modalTextMuted }]}>
          {formatDate(getGameDisplayTimestamp(game))} &middot; {goalCount} point
          {goalCount !== 1 ? 's' : ''} tracked
        </ThemedText>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, { backgroundColor: palette.overlay10 }]}
          onPress={onCancel}>
          <ThemedText style={[styles.buttonText, { color: palette.modalText }]}>Cancel</ThemedText>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: palette.accent }]} onPress={onImport}>
          <ThemedText style={[styles.buttonText, { color: palette.textOnAccent }]}>
            Import
          </ThemedText>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function GamesPreviewContent({
  palette,
  games,
  updateCount,
  savedTeams,
  onImport,
  onCancel,
}: {
  palette: ReturnType<typeof useTheme>['palette'];
  games: SavedGame[];
  updateCount: number;
  savedTeams: SavedTeam[];
  onImport: () => void;
  onCancel: () => void;
}) {
  const { styles, metrics } = useImportUi();
  const newCount = games.length - updateCount;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.content}>
      <MaterialCommunityIcons
        name="cloud-download-outline"
        size={metrics.statusIconMedium}
        color={palette.accent}
      />
      <ThemedText style={[styles.title, { color: palette.modalText }]}>
        Import {games.length} game{games.length !== 1 ? 's' : ''}?
      </ThemedText>

      {updateCount > 0 && newCount > 0 && (
        <ThemedText style={[styles.subtitle, { color: palette.modalTextMuted }]}>
          {newCount} new · {updateCount} re-imported
        </ThemedText>
      )}
      {updateCount > 0 && newCount === 0 && (
        <ThemedText style={[styles.subtitle, { color: palette.modalTextMuted }]}>
          {updateCount === 1 ? 'This game' : 'All games'} will be re-imported
        </ThemedText>
      )}

      <ScrollView style={styles.gamesList} contentContainerStyle={styles.gamesListContent}>
        {games.map((game) => {
          const teamName = resolveTeamName(game.team1.id, game.team1.name, savedTeams);
          return (
            <View key={game.id} style={[styles.gameRow, { backgroundColor: palette.overlay05 }]}>
              <View style={styles.gameRowInfo}>
                <ThemedText
                  style={[styles.gameRowTeams, { color: palette.modalText }]}
                  numberOfLines={1}>
                  {teamName} vs {game.team2Name}
                </ThemedText>
                <ThemedText style={[styles.previewMeta, { color: palette.modalTextMuted }]}>
                  {formatDate(getGameDisplayTimestamp(game))}
                </ThemedText>
              </View>
              <ScoreBadge score1={game.team1Score} score2={game.team2Score} size="small" />
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, { backgroundColor: palette.overlay10 }]}
          onPress={onCancel}>
          <ThemedText style={[styles.buttonText, { color: palette.modalText }]}>Cancel</ThemedText>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: palette.accent }]} onPress={onImport}>
          <ThemedText style={[styles.buttonText, { color: palette.textOnAccent }]}>
            Import
          </ThemedText>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function TeamPreviewContent({
  palette,
  payload,
  onImport,
  onCancel,
}: {
  palette: ReturnType<typeof useTheme>['palette'];
  payload: TeamPayload;
  onImport: () => void;
  onCancel: () => void;
}) {
  const { styles, metrics } = useImportUi();
  const team = payload.data;
  const playerCount = team.roster.length;
  const presetCount = payload.presets?.length ?? 0;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.content}>
      <MaterialCommunityIcons
        name="cloud-download-outline"
        size={metrics.statusIconMedium}
        color={palette.accent}
      />
      <ThemedText style={[styles.title, { color: palette.modalText }]}>Import team?</ThemedText>

      <View style={styles.previewCard}>
        <ThemedText style={[styles.previewTeams, { color: palette.modalText }]}>
          {team.name}
        </ThemedText>
        <ThemedText style={[styles.previewMeta, { color: palette.modalTextMuted }]}>
          {playerCount} player{playerCount !== 1 ? 's' : ''}
          {presetCount > 0 ? ` · ${presetCount} line preset${presetCount !== 1 ? 's' : ''}` : ''}
        </ThemedText>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, { backgroundColor: palette.overlay10 }]}
          onPress={onCancel}>
          <ThemedText style={[styles.buttonText, { color: palette.modalText }]}>Cancel</ThemedText>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: palette.accent }]} onPress={onImport}>
          <ThemedText style={[styles.buttonText, { color: palette.textOnAccent }]}>
            Import
          </ThemedText>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function TeamExistsContent({
  palette,
  payload,
  existingTeam,
  onUpdate,
  onKeep,
}: {
  palette: ReturnType<typeof useTheme>['palette'];
  payload: TeamPayload;
  existingTeam: SavedTeam;
  onUpdate: () => void;
  onKeep: () => void;
}) {
  const { styles, metrics } = useImportUi();
  const incomingTeam = payload.data;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.content}>
      <MaterialCommunityIcons
        name="account-group-outline"
        size={metrics.statusIconMedium}
        color={palette.accent}
      />
      <ThemedText style={[styles.title, { color: palette.modalText }]}>
        You already have {existingTeam.name}
      </ThemedText>
      <ThemedText style={[styles.subtitle, { color: palette.modalTextMuted }]}>
        Do you want to update your roster to match?
      </ThemedText>

      <View style={styles.previewCard}>
        <ThemedText style={[styles.previewMeta, { color: palette.modalTextMuted }]}>
          Incoming: {incomingTeam.roster.length} player
          {incomingTeam.roster.length !== 1 ? 's' : ''}
        </ThemedText>
        <ThemedText style={[styles.previewMeta, { color: palette.modalTextMuted }]}>
          Your version: {existingTeam.roster.length} player
          {existingTeam.roster.length !== 1 ? 's' : ''}
        </ThemedText>
      </View>

      <View style={styles.buttonRow}>
        <Pressable style={[styles.button, { backgroundColor: palette.overlay10 }]} onPress={onKeep}>
          <ThemedText style={[styles.buttonText, { color: palette.modalText }]}>
            Keep Mine
          </ThemedText>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: palette.accent }]} onPress={onUpdate}>
          <ThemedText style={[styles.buttonText, { color: palette.textOnAccent }]}>
            Update Roster
          </ThemedText>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function DoneContent({
  palette,
  type,
  count,
  onAction,
  actionLabel,
}: {
  palette: ReturnType<typeof useTheme>['palette'];
  type: 'game' | 'team' | 'games';
  count?: number;
  onAction: () => void;
  actionLabel: string;
}) {
  const { styles, metrics } = useImportUi();
  let message: string;
  if (type === 'games') {
    message = `${count} game${count !== 1 ? 's' : ''} imported!`;
  } else if (type === 'game') {
    message = 'Game imported!';
  } else {
    message = 'Team imported!';
  }

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.content}>
      <MaterialCommunityIcons
        name="check-circle-outline"
        size={metrics.statusIconLarge}
        color={palette.success}
      />
      <ThemedText style={[styles.title, { color: palette.modalText }]}>{message}</ThemedText>
      <Pressable style={[styles.button, { backgroundColor: palette.accent }]} onPress={onAction}>
        <ThemedText style={[styles.buttonText, { color: palette.textOnAccent }]}>
          {actionLabel}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: scaleBySizeClass(24, sizeClass),
    },
    card: {
      borderRadius: scaleBySizeClass(24, sizeClass),
      padding: scaleBySizeClass(32, sizeClass),
      width: '100%',
      maxWidth: scaleBySizeClass(420, sizeClass),
      shadowOffset: { width: 0, height: scaleBySizeClass(12, sizeClass) },
      shadowOpacity: 0.35,
      shadowRadius: scaleBySizeClass(30, sizeClass),
      elevation: scaleBySizeClass(20, sizeClass),
    },
    content: {
      alignItems: 'center',
      gap: scaleBySizeClass(16, sizeClass),
    },
    title: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.bold,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: scaleBySizeClass(14, sizeClass),
      textAlign: 'center',
    },
    previewCard: {
      alignItems: 'center',
      gap: scaleBySizeClass(12, sizeClass),
      paddingVertical: scaleBySizeClass(8, sizeClass),
    },
    previewTeams: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.semiBold,
      textAlign: 'center',
    },
    previewMeta: {
      fontSize: scaleBySizeClass(13, sizeClass),
    },
    buttonRow: {
      flexDirection: 'row',
      gap: scaleBySizeClass(12, sizeClass),
      marginTop: scaleBySizeClass(8, sizeClass),
    },
    button: {
      paddingHorizontal: scaleBySizeClass(28, sizeClass),
      paddingVertical: scaleBySizeClass(12, sizeClass),
      borderRadius: scaleBySizeClass(12, sizeClass),
      minWidth: scaleBySizeClass(100, sizeClass),
      alignItems: 'center',
    },
    buttonText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
    },
    gamesList: {
      maxHeight: scaleBySizeClass(200, sizeClass),
      width: '100%',
    },
    gamesListContent: {
      gap: scaleBySizeClass(8, sizeClass),
    },
    gameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      paddingVertical: scaleBySizeClass(10, sizeClass),
      borderRadius: scaleBySizeClass(10, sizeClass),
    },
    gameRowInfo: {
      flex: 1,
      marginRight: scaleBySizeClass(12, sizeClass),
      gap: scaleBySizeClass(2, sizeClass),
    },
    gameRowTeams: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}

function createMetrics(sizeClass: SizeClass) {
  return {
    statusIconMedium: scaleBySizeClass(40, sizeClass),
    statusIconLarge: scaleBySizeClass(48, sizeClass),
  };
}

function useImportUi() {
  const { sizeClass } = useLayout();
  return {
    styles: createStyles(sizeClass),
    metrics: createMetrics(sizeClass),
  };
}
