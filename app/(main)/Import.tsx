import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ImportStateContent } from '@/components/import/ImportStateContent';
import { ImportStatusContent } from '@/components/import/ImportStatusContent';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { useIsGameActive } from '@/hooks/basic/useIsGameActive';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useShareImport } from '@/hooks/useShareImport';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import type { SharedPayload } from '@/lib/sharing';
import type { SavedGame } from '@/lib/storage';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';

type GamePayload = Extract<SharedPayload, { type: 'game' }>;
type AdvancedGamePayload = Extract<SharedPayload, { type: 'advanced-game' }>;
type TeamPayload = Extract<SharedPayload, { type: 'team' }>;

export default function ImportScreen() {
  const { shareId } = useLocalSearchParams<{ shareId: string }>();
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { savedTeams, importGame, importTeam, loadTeam } = useGameStore();
  const { importAdvancedGame } = useAdvancedTrackingStore();
  const { isPending, importState, setImportState } = useShareImport(shareId);
  const gameActive = useIsGameActive();

  const handleDone = () => {
    router.dismissTo('/');
  };

  if (!shareId) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centered}>
          <View
            style={[
              styles.card,
              { backgroundColor: palette.modalBg, shadowColor: palette.shadow },
            ]}>
            <ImportStatusContent
              status="error"
              message="This import link is missing its share ID. Please open the original link and try again."
              onDismiss={handleDone}
            />
          </View>
        </View>
      </ThemedView>
    );
  }

  const handleGoToGame = (gameId: string) => {
    router.dismissTo('/');
    router.push({ pathname: '/saved-games/[gameId]', params: { gameId } });
  };

  const handleGoToAdvancedGame = (gameId: string) => {
    router.dismissTo('/');
    router.push({ pathname: '/advancedTracking/analytics/[gameId]', params: { gameId } });
  };

  const handleGoToTeam = () => {
    router.dismissTo('/');
    router.push('/EditRoster');
  };

  const handleImportGame = async (payload: GamePayload) => {
    setImportState({ status: 'done', type: 'game', gameId: payload.data.id });
    await importGame({ ...payload.data, importedAt: Date.now() });
  };

  const handleImportAdvancedGame = async (payload: AdvancedGamePayload) => {
    const game = { ...payload.data, importedAt: Date.now() };
    await importAdvancedGame(game);
    setImportState({ status: 'done', type: 'advanced-game', gameId: game.id });
  };

  const handleImportAdvancedGames = async (games: AdvancedTrackedGame[]) => {
    for (const game of games) {
      const importedGame = { ...game, importedAt: Date.now() };
      await importAdvancedGame(importedGame);
    }
    setImportState({ status: 'done', type: 'advanced-games', count: games.length });
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
          <ImportStateContent
            isPending={isPending}
            importState={importState}
            savedTeams={savedTeams}
            onDismiss={handleDone}
            onImportGame={(payload) => void handleImportGame(payload)}
            onImportGames={(games) => void handleImportGames(games)}
            onImportAdvancedGame={(payload) => void handleImportAdvancedGame(payload)}
            onImportAdvancedGames={(games) => void handleImportAdvancedGames(games)}
            onImportTeam={(payload) => void handleImportTeam(payload)}
            onViewGame={handleGoToGame}
            onViewAdvancedGame={handleGoToAdvancedGame}
            onViewTeam={handleGoToTeam}
            onViewGames={handleGoToGames}
          />
        </View>
      </View>
    </ThemedView>
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
  });
}
