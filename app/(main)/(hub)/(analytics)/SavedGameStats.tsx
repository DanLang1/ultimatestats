import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import {
  ResponsiveHeaderAction,
  ResponsiveHeaderActions,
} from '@/components/ui/ResponsiveHeaderActions';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ShareConfirmModal } from '@/components/ui/ShareConfirmModal';
import SavedGamesBulkActions from '@/components/view-stats/SavedGamesBulkActions';
import SavedGamesList from '@/components/view-stats/SavedGamesList';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { MAX_SHARE_GAMES } from '@/lib/constants';
import { advancedGameToListItem, basicGameToListItem, GameListItem } from '@/lib/gameListUtils';
import { serializeAdvancedGames, serializeGames, uploadPayload } from '@/lib/sharing';
import {
  runPendingShareAction,
  SHARE_DATA_UPLOAD_ERROR_MESSAGE,
} from '@/lib/sharing/shareActionUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/gameStore';
import { useTournamentStore } from '@/store/tournamentStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

export default function SavedGameStatsScreen() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { savedGames, savedTeams, deleteSavedGames } = useGameStore();
  const { savedGames: advancedSavedGames, deleteSavedGame: deleteAdvancedSavedGame } =
    useAdvancedTrackingStore();
  const { showAlert } = useAlert();
  const { tournaments } = useTournamentStore();
  const [selectedSavedGameIds, setSelectedSavedGameIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [pendingShareAction, setPendingShareAction] = useState<(() => Promise<string>) | null>(
    null,
  );

  const basicItems = savedGames.map((g) => basicGameToListItem(g, savedTeams));
  const advancedItems = advancedSavedGames.map(advancedGameToListItem);
  const allGames = [...basicItems, ...advancedItems].sort((a, b) => b.timestamp - a.timestamp);
  const selectedGames = allGames.filter((game) => selectedSavedGameIds.has(game.id));
  const selectedGameKind = selectedGames[0]?.kind ?? null;

  const handleSelectGame = (game: GameListItem) => {
    if (game.kind === 'advanced') {
      router.push({
        pathname: '/advancedTracking/analytics/[gameId]',
        params: { gameId: game.id },
      });
    } else {
      router.push({ pathname: '/saved-games/[gameId]', params: { gameId: game.id } });
    }
  };

  const handleToggleSavedGameSelection = (gameId: string) => {
    const game = allGames.find((item) => item.id === gameId);
    if (!game) return;

    setSelectedSavedGameIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
        return next;
      }

      const firstSelectedGame = allGames.find((item) => next.has(item.id));
      if (firstSelectedGame && firstSelectedGame.kind !== game.kind) {
        return next;
      }

      next.add(gameId);
      return next;
    });
  };

  const handleToggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedSavedGameIds(new Set());
  };

  const handleEnterSelectionWithGame = (gameId: string) => {
    setSelectionMode(true);
    setSelectedSavedGameIds(new Set([gameId]));
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedSavedGameIds(new Set());
  };

  const handleBulkDeleteGames = async () => {
    const count = selectedSavedGameIds.size;
    if (count === 0) return;

    showAlert({
      title: 'Delete Games?',
      message: `Are you sure you want to delete ${count} selected game${count !== 1 ? 's' : ''}?`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const basicIds = selectedGames
              .filter((game) => game.kind === 'basic')
              .map((game) => game.id);
            const advancedIds = selectedGames
              .filter((game) => game.kind === 'advanced')
              .map((game) => game.id);

            if (basicIds.length > 0) {
              await deleteSavedGames(basicIds);
            }
            // Advanced game deletion is synchronous in the advanced tracking store.
            for (const gameId of advancedIds) {
              deleteAdvancedSavedGame(gameId);
            }
            setSelectedSavedGameIds(new Set());
          },
        },
      ],
    });
  };

  const handleBulkShareGames = () => {
    const count = selectedSavedGameIds.size;
    if (count === 0) return;

    if (count > MAX_SHARE_GAMES) {
      showAlert({
        title: 'Too many games',
        message: `You can share up to ${MAX_SHARE_GAMES} games at a time.`,
      });
      return;
    }

    const hasBasicGames = selectedGames.some((game) => game.kind === 'basic');
    const hasAdvancedGames = selectedGames.some((game) => game.kind === 'advanced');

    if (hasBasicGames && hasAdvancedGames) {
      showAlert({
        title: 'Choose one game type',
        message: 'Share basic games or advanced games separately.',
      });
      return;
    }

    const gameIds = new Set(selectedGames.map((game) => game.id));
    setPendingShareAction(() => async () => {
      if (hasAdvancedGames) {
        const games = advancedSavedGames.filter((game) => gameIds.has(game.id));
        const payload = serializeAdvancedGames(games);
        const { url } = await uploadPayload(payload);
        return url;
      }

      const games = savedGames.filter((game) => gameIds.has(game.id));
      const payload = serializeGames(games);
      const { url } = await uploadPayload(payload);
      return url;
    });
  };

  const handleConfirmShare = () => runPendingShareAction(pendingShareAction);

  const handleCancelShare = () => {
    setPendingShareAction(null);
  };

  const handleCloseShareReady = () => {
    setPendingShareAction(null);
    handleExitSelectionMode();
  };

  const selectIconColor = selectionMode ? palette.accent : palette.textMuted;
  const headerActions: ResponsiveHeaderAction[] = [
    {
      key: 'aggregate',
      label: 'Combine Games',
      onPress: () => router.push('/AggregateStats'),
      inlineIcon: (
        <MaterialCommunityIcons
          name="chart-box-outline"
          size={scaleBySizeClass(22, sizeClass)}
          color={palette.accent}
        />
      ),
      menuIcon: (
        <MaterialCommunityIcons
          name="chart-box-outline"
          size={scaleBySizeClass(20, sizeClass)}
          color={palette.accent}
        />
      ),
    },
    {
      key: 'select',
      label: selectionMode ? 'Cancel' : 'Select',
      onPress: handleToggleSelectionMode,
      inlineIcon: (
        <MaterialCommunityIcons
          name="checkbox-multiple-outline"
          size={scaleBySizeClass(22, sizeClass)}
          color={selectIconColor}
        />
      ),
      menuIcon: (
        <MaterialCommunityIcons
          name="checkbox-multiple-outline"
          size={scaleBySizeClass(20, sizeClass)}
          color={selectIconColor}
        />
      ),
    },
  ];

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="SAVED GAMES"
        onBack={() => router.back()}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        centerTitleInLandscape={false}
        rightSlot={<ResponsiveHeaderActions actions={headerActions} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SavedGamesList
          games={allGames}
          onSelectGame={handleSelectGame}
          selectedGameIds={selectedSavedGameIds}
          selectedGameKind={selectedGameKind}
          onToggleGameSelection={handleToggleSavedGameSelection}
          onEnterSelectionWithGame={handleEnterSelectionWithGame}
          onClearSelection={() => setSelectedSavedGameIds(new Set())}
          tournaments={tournaments}
          selectionMode={selectionMode}
        />
      </ScrollView>

      <SavedGamesBulkActions
        isVisible={selectedSavedGameIds.size > 0}
        selectedCount={selectedSavedGameIds.size}
        onDelete={handleBulkDeleteGames}
        onShare={handleBulkShareGames}
        onCancel={handleExitSelectionMode}
      />

      <ShareConfirmModal
        visible={pendingShareAction !== null}
        onConfirm={handleConfirmShare}
        errorMessage={SHARE_DATA_UPLOAD_ERROR_MESSAGE}
        onCancel={handleCancelShare}
        onCloseReady={handleCloseShareReady}
      />
    </ThemedView>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      paddingTop: 8,
      paddingBottom: 100,
    },
  });
}
