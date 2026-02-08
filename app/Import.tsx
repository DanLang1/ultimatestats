import { ThemedView } from '@/components/ThemedView';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { useTheme } from '@/context/ThemeContext';
import { resolveTeamName } from '@/lib/playerUtils';
import { fetchPayload, SharedPayload } from '@/lib/sharing';
import { formatDate } from '@/lib/statsUtils';
import { SavedGame, SavedTeam } from '@/lib/storage';
import { useGameStore } from '@/store/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

type ImportState =
  | { status: 'loading' }
  | { status: 'preview'; payload: SharedPayload }
  | {
      status: 'preview-games';
      payload: SharedPayload;
      newGames: SavedGame[];
      duplicateCount: number;
    }
  | { status: 'duplicate'; isMultiple?: boolean }
  | { status: 'team-exists'; payload: SharedPayload; existingTeam: SavedTeam }
  | { status: 'error'; message: string }
  | { status: 'done'; type: 'game'; gameId: string }
  | { status: 'done'; type: 'team' }
  | { status: 'done'; type: 'games'; count: number };

export default function ImportScreen() {
  const { shareId } = useLocalSearchParams<{ shareId: string }>();
  const { palette } = useTheme();
  const { savedGames, savedTeams, importGame, importTeam, loadTeam } = useGameStore();

  const [importState, setImportState] = useState<ImportState>({ status: 'loading' });
  const [hasStartedFetch, setHasStartedFetch] = useState(false);

  if (!hasStartedFetch && shareId) {
    setHasStartedFetch(true);
    fetchPayload(shareId)
      .then((payload) => {
        if (payload.type === 'game') {
          const game = payload.data as SavedGame;
          if (savedGames.some((g) => g.id === game.id)) {
            setImportState({ status: 'duplicate' });
            return;
          }
        }

        if (payload.type === 'team') {
          const team = payload.data as SavedTeam;
          const existing = savedTeams.find((t) => t.id === team.id);
          if (existing) {
            setImportState({ status: 'team-exists', payload, existingTeam: existing });
            return;
          }
        }

        if (payload.type === 'games') {
          const allGames = payload.data as SavedGame[];
          const existingIds = new Set(savedGames.map((g) => g.id));
          const newGames = allGames.filter((g) => !existingIds.has(g.id));
          const duplicateCount = allGames.length - newGames.length;

          if (newGames.length === 0) {
            setImportState({ status: 'duplicate', isMultiple: true });
            return;
          }

          setImportState({ status: 'preview-games', payload, newGames, duplicateCount });
          return;
        }

        setImportState({ status: 'preview', payload });
      })
      .catch(() => {
        setImportState({
          status: 'error',
          message: 'Could not load shared data. The link may have expired.',
        });
      });
  }

  if (!shareId) {
    return null;
  }

  const handleDone = () => {
    router.dismissTo('/');
  };

  const handleGoToGame = (gameId: string) => {
    router.dismissTo('/');
    router.push({ pathname: '/ViewStats', params: { gameId } });
  };

  const handleGoToTeam = () => {
    router.dismissTo('/');
    router.push('/EditRoster');
  };

  const handleImportGame = async (payload: SharedPayload) => {
    const game = payload.data as SavedGame;
    await importGame({ ...game, importedAt: Date.now() });
    setImportState({ status: 'done', type: 'game', gameId: game.id });
  };

  const handleImportGames = async (games: SavedGame[]) => {
    for (const game of games) {
      await importGame({ ...game, importedAt: Date.now() });
    }
    setImportState({ status: 'done', type: 'games', count: games.length });
  };

  const handleGoToGames = () => {
    router.dismissTo('/');
    router.push({ pathname: '/ViewStats', params: { tab: 'saved' } });
  };

  const handleImportTeam = async (payload: SharedPayload) => {
    const team = payload.data as SavedTeam;
    await importTeam(team);
    if (payload.presets?.length) {
      useLinePresetsStore.getState().importPresetsForTeam(team.id, payload.presets);
    }
    loadTeam(team.id);
    setImportState({ status: 'done', type: 'team' });
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.centered}>
        <View
          style={[styles.card, { backgroundColor: palette.modalBg, shadowColor: palette.shadow }]}>
          {importState.status === 'loading' && <LoadingContent palette={palette} />}

          {importState.status === 'error' && (
            <ErrorContent palette={palette} message={importState.message} onDismiss={handleDone} />
          )}

          {importState.status === 'duplicate' && (
            <DuplicateContent
              palette={palette}
              onDismiss={handleDone}
              isMultiple={importState.isMultiple}
            />
          )}

          {importState.status === 'preview' && importState.payload.type === 'game' && (
            <GamePreviewContent
              palette={palette}
              payload={importState.payload}
              savedTeams={savedTeams}
              onImport={() => handleImportGame(importState.payload)}
              onCancel={handleDone}
            />
          )}

          {importState.status === 'preview-games' && (
            <GamesPreviewContent
              palette={palette}
              newGames={importState.newGames}
              duplicateCount={importState.duplicateCount}
              savedTeams={savedTeams}
              onImport={() => handleImportGames(importState.newGames)}
              onCancel={handleDone}
            />
          )}

          {importState.status === 'preview' && importState.payload.type === 'team' && (
            <TeamPreviewContent
              palette={palette}
              payload={importState.payload}
              onImport={() => handleImportTeam(importState.payload)}
              onCancel={handleDone}
            />
          )}

          {importState.status === 'team-exists' && (
            <TeamExistsContent
              palette={palette}
              payload={importState.payload}
              existingTeam={importState.existingTeam}
              onUpdate={() => handleImportTeam(importState.payload)}
              onKeep={handleDone}
            />
          )}

          {importState.status === 'done' && importState.type === 'game' && (
            <DoneContent
              palette={palette}
              type="game"
              onAction={() => handleGoToGame(importState.gameId)}
              actionLabel="View Game"
            />
          )}

          {importState.status === 'done' && importState.type === 'team' && (
            <DoneContent
              palette={palette}
              type="team"
              onAction={handleGoToTeam}
              actionLabel="View Team"
            />
          )}

          {importState.status === 'done' && importState.type === 'games' && (
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
  return (
    <View style={styles.content}>
      <ActivityIndicator size="large" color={palette.accent} />
      <Text style={[styles.title, { color: palette.modalText }]}>Loading shared data...</Text>
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
  return (
    <View style={styles.content}>
      <MaterialCommunityIcons name="alert-circle-outline" size={48} color={palette.danger} />
      <Text style={[styles.title, { color: palette.modalText }]}>Import Failed</Text>
      <Text style={[styles.subtitle, { color: palette.modalTextMuted }]}>{message}</Text>
      <Pressable
        style={[styles.button, { backgroundColor: palette.overlay10 }]}
        onPress={onDismiss}>
        <Text style={[styles.buttonText, { color: palette.modalText }]}>OK</Text>
      </Pressable>
    </View>
  );
}

function DuplicateContent({
  palette,
  onDismiss,
  isMultiple,
}: {
  palette: ReturnType<typeof useTheme>['palette'];
  onDismiss: () => void;
  isMultiple?: boolean;
}) {
  return (
    <View style={styles.content}>
      <MaterialCommunityIcons name="check-circle-outline" size={48} color={palette.accent} />
      <Text style={[styles.title, { color: palette.modalText }]}>
        {isMultiple ? 'You already have all these games' : 'You already have this game'}
      </Text>
      <Text style={[styles.subtitle, { color: palette.modalTextMuted }]}>
        {isMultiple
          ? 'All shared games are already in your saved games.'
          : 'This game is already in your saved games.'}
      </Text>
      <Pressable
        style={[styles.button, { backgroundColor: palette.overlay10 }]}
        onPress={onDismiss}>
        <Text style={[styles.buttonText, { color: palette.modalText }]}>OK</Text>
      </Pressable>
    </View>
  );
}

function GamePreviewContent({
  palette,
  payload,
  savedTeams,
  onImport,
  onCancel,
}: {
  palette: ReturnType<typeof useTheme>['palette'];
  payload: SharedPayload;
  savedTeams: SavedTeam[];
  onImport: () => void;
  onCancel: () => void;
}) {
  const game = payload.data as SavedGame;
  const teamName = resolveTeamName(game.team1.id, game.team1.name, savedTeams);
  const goalCount = game.events.filter((e) => e.type === 'goal').length;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.content}>
      <MaterialCommunityIcons name="cloud-download-outline" size={40} color={palette.accent} />
      <Text style={[styles.title, { color: palette.modalText }]}>Import game?</Text>

      <View style={styles.previewCard}>
        <Text style={[styles.previewTeams, { color: palette.modalText }]}>
          {teamName} vs {game.team2Name}
        </Text>
        <ScoreBadge score1={game.team1Score} score2={game.team2Score} size="large" />
        <Text style={[styles.previewMeta, { color: palette.modalTextMuted }]}>
          {formatDate(game.createdAt)} &middot; {goalCount} point
          {goalCount !== 1 ? 's' : ''} tracked
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, { backgroundColor: palette.overlay10 }]}
          onPress={onCancel}>
          <Text style={[styles.buttonText, { color: palette.modalText }]}>Cancel</Text>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: palette.accent }]} onPress={onImport}>
          <Text style={[styles.buttonText, { color: palette.textOnAccent }]}>Import</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function GamesPreviewContent({
  palette,
  newGames,
  duplicateCount,
  savedTeams,
  onImport,
  onCancel,
}: {
  palette: ReturnType<typeof useTheme>['palette'];
  newGames: SavedGame[];
  duplicateCount: number;
  savedTeams: SavedTeam[];
  onImport: () => void;
  onCancel: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.content}>
      <MaterialCommunityIcons name="cloud-download-outline" size={40} color={palette.accent} />
      <Text style={[styles.title, { color: palette.modalText }]}>
        Import {newGames.length} game{newGames.length !== 1 ? 's' : ''}?
      </Text>

      {duplicateCount > 0 && (
        <Text style={[styles.subtitle, { color: palette.modalTextMuted }]}>
          Skipping {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''}
        </Text>
      )}

      <ScrollView style={styles.gamesList} contentContainerStyle={styles.gamesListContent}>
        {newGames.map((game) => {
          const teamName = resolveTeamName(game.team1.id, game.team1.name, savedTeams);
          return (
            <View key={game.id} style={[styles.gameRow, { backgroundColor: palette.overlay05 }]}>
              <View style={styles.gameRowInfo}>
                <Text style={[styles.gameRowTeams, { color: palette.modalText }]} numberOfLines={1}>
                  {teamName} vs {game.team2Name}
                </Text>
                <Text style={[styles.previewMeta, { color: palette.modalTextMuted }]}>
                  {formatDate(game.createdAt)}
                </Text>
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
          <Text style={[styles.buttonText, { color: palette.modalText }]}>Cancel</Text>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: palette.accent }]} onPress={onImport}>
          <Text style={[styles.buttonText, { color: palette.textOnAccent }]}>Import</Text>
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
  payload: SharedPayload;
  onImport: () => void;
  onCancel: () => void;
}) {
  const team = payload.data as SavedTeam;
  const playerCount = team.roster.length;
  const presetCount = payload.presets?.length ?? 0;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.content}>
      <MaterialCommunityIcons name="cloud-download-outline" size={40} color={palette.accent} />
      <Text style={[styles.title, { color: palette.modalText }]}>Import team?</Text>

      <View style={styles.previewCard}>
        <Text style={[styles.previewTeams, { color: palette.modalText }]}>{team.name}</Text>
        <Text style={[styles.previewMeta, { color: palette.modalTextMuted }]}>
          {playerCount} player{playerCount !== 1 ? 's' : ''}
          {presetCount > 0 ? ` · ${presetCount} line preset${presetCount !== 1 ? 's' : ''}` : ''}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, { backgroundColor: palette.overlay10 }]}
          onPress={onCancel}>
          <Text style={[styles.buttonText, { color: palette.modalText }]}>Cancel</Text>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: palette.accent }]} onPress={onImport}>
          <Text style={[styles.buttonText, { color: palette.textOnAccent }]}>Import</Text>
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
  payload: SharedPayload;
  existingTeam: SavedTeam;
  onUpdate: () => void;
  onKeep: () => void;
}) {
  const incomingTeam = payload.data as SavedTeam;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.content}>
      <MaterialCommunityIcons name="account-group-outline" size={40} color={palette.accent} />
      <Text style={[styles.title, { color: palette.modalText }]}>
        You already have {existingTeam.name}
      </Text>
      <Text style={[styles.subtitle, { color: palette.modalTextMuted }]}>
        Do you want to update your roster to match?
      </Text>

      <View style={styles.previewCard}>
        <Text style={[styles.previewMeta, { color: palette.modalTextMuted }]}>
          Incoming: {incomingTeam.roster.length} player
          {incomingTeam.roster.length !== 1 ? 's' : ''}
        </Text>
        <Text style={[styles.previewMeta, { color: palette.modalTextMuted }]}>
          Your version: {existingTeam.roster.length} player
          {existingTeam.roster.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <Pressable style={[styles.button, { backgroundColor: palette.overlay10 }]} onPress={onKeep}>
          <Text style={[styles.buttonText, { color: palette.modalText }]}>Keep Mine</Text>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: palette.accent }]} onPress={onUpdate}>
          <Text style={[styles.buttonText, { color: palette.textOnAccent }]}>Update Roster</Text>
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
  const message =
    type === 'games'
      ? `${count} game${count !== 1 ? 's' : ''} imported!`
      : type === 'game'
        ? 'Game imported!'
        : 'Team imported!';

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.content}>
      <MaterialCommunityIcons name="check-circle-outline" size={48} color={palette.success} />
      <Text style={[styles.title, { color: palette.modalText }]}>{message}</Text>
      <Pressable style={[styles.button, { backgroundColor: palette.accent }]} onPress={onAction}>
        <Text style={[styles.buttonText, { color: palette.textOnAccent }]}>{actionLabel}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 420,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 20,
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  previewCard: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  previewTeams: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewMeta: {
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  gamesList: {
    maxHeight: 200,
    width: '100%',
  },
  gamesListContent: {
    gap: 8,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  gameRowInfo: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  gameRowTeams: {
    fontSize: 14,
    fontWeight: '600',
  },
});
