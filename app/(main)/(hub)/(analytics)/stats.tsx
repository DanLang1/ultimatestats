import { router, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import {
  ResponsiveHeaderAction,
  ResponsiveHeaderActions,
} from '@/components/ui/ResponsiveHeaderActions';
import { ScreenHeader, ScreenHeaderTitleAction } from '@/components/ui/ScreenHeader';
import { ShareConfirmModal } from '@/components/ui/ShareConfirmModal';
import { TournamentPickerModal } from '@/components/ui/TournamentPickerModal';
import CombineGamesButton from '@/components/view-stats/CombineGamesButton';
import LiveGameRow from '@/components/view-stats/LiveGameRow';
import SavedGamesList from '@/components/view-stats/SavedGamesList';
import SavedGamesSelectBar from '@/components/view-stats/SavedGamesSelectBar';
import { SavedGamesTeamSheet } from '@/components/view-stats/SavedGamesTeamSheet';
import { useTheme } from '@/context/ThemeContext';
import { useCompletedAdvancedGameSummaries } from '@/hooks/advancedTracking/useAdvancedGameQueries';
import { useHasLiveStats } from '@/hooks/useActiveGameSession';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  advancedGameSummaryToTeamListItem,
  basicGameToListItem,
  GameListItem,
} from '@/lib/gameListUtils';
import { SavedGamesSortKey, summarizeSavedGameTeams } from '@/lib/savedGamesListUtils';
import { reportError } from '@/lib/sentry';
import { serializeAdvancedGames, serializeGames, uploadPayload } from '@/lib/sharing';
import {
  runPendingShareAction,
  SHARE_DATA_UPLOAD_ERROR_MESSAGE,
} from '@/lib/sharing/shareActionUtils';
import { attachTournaments, buildTournamentIndex } from '@/lib/tournamentIndex';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';
import { useTournamentStore } from '@/store/tournamentStore';

const GAME_NAVIGATION_GUARD_MS = 750;
// Combining a single game shows nothing its own stats don't.
const MIN_GAMES_TO_COMBINE = 2;

export default function StatsScreen() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const hasLiveStats = useHasLiveStats();
  const { savedGames, savedTeams, deleteSavedGames } = useGameStore();
  const { data: completedAdvancedSavedGameSummaries } = useCompletedAdvancedGameSummaries();
  const { deleteSavedGame: deleteAdvancedSavedGame } = useAdvancedTrackingStore();
  const loadAdvancedGame = useSavedAdvancedGamesStore((state) => state.loadGame);
  const loadAdvancedGames = useSavedAdvancedGamesStore((state) => state.loadGames);
  const { showAlert } = useAlert();
  const { tournaments, gameLinks, addGamesToTournament, removeGameFromTournament } =
    useTournamentStore();
  // Null shows the team with the newest game.
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showTeamSheet, setShowTeamSheet] = useState(false);
  // Lives here so the sort survives the list remounting on a team switch.
  const [sortKey, setSortKey] = useState<SavedGamesSortKey>('newest');
  const [selectedSavedGameIds, setSelectedSavedGameIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showTournamentPicker, setShowTournamentPicker] = useState(false);
  const [pendingShareAction, setPendingShareAction] = useState<(() => Promise<string>) | null>(
    null,
  );
  const isNavigatingToGameRef = useRef(false);

  const allGames = attachTournaments(
    [
      ...savedGames.map((g) => basicGameToListItem(g, savedTeams)),
      ...completedAdvancedSavedGameSummaries.map((summary) =>
        advancedGameSummaryToTeamListItem(summary, savedTeams),
      ),
    ],
    buildTournamentIndex(tournaments, gameLinks),
  ).sort((a, b) => b.timestamp - a.timestamp);
  const savedGameTeams = summarizeSavedGameTeams(allGames);
  // Falls back to the newest team when the selected team has no games left.
  const currentTeam =
    savedGameTeams.find((team) => team.id === selectedTeamId) ?? savedGameTeams[0] ?? null;
  const hasMultipleTeams = savedGameTeams.length > 1;
  const teamGames = allGames.filter((game) => game.teamId === currentTeam?.id);
  const canCombineGames = teamGames.length >= MIN_GAMES_TO_COMBINE;
  const selectedGames = teamGames.filter((game) => selectedSavedGameIds.has(game.id));

  const releaseNavigationGuard = () => {
    setTimeout(() => {
      isNavigatingToGameRef.current = false;
    }, GAME_NAVIGATION_GUARD_MS);
  };

  const handleSelectGame = async (game: GameListItem) => {
    if (isNavigatingToGameRef.current) return;

    isNavigatingToGameRef.current = true;

    try {
      if (game.kind === 'advanced') {
        await loadAdvancedGame(game.id);

        router.push({
          pathname: '/advanced-tracking/analytics/[gameId]',
          params: { gameId: game.id },
        });
        return;
      }

      router.push({ pathname: '/saved-games/[gameId]', params: { gameId: game.id } });
    } finally {
      releaseNavigationGuard();
    }
  };

  const handleToggleSavedGameSelection = (gameId: string) => {
    setSelectedSavedGameIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  };

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedSavedGameIds(new Set());
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
    const count = selectedGames.length;
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
            try {
              const basicIds = selectedGames
                .filter((game) => game.kind === 'basic')
                .map((game) => game.id);
              const advancedIds = selectedGames
                .filter((game) => game.kind === 'advanced')
                .map((game) => game.id);

              if (basicIds.length > 0) {
                await Promise.all(
                  basicIds.map((gameId) => removeGameFromTournament('basic', gameId)),
                );
                await deleteSavedGames(basicIds);
              }
              // Advanced game deletion is synchronous in the advanced tracking store.
              for (const gameId of advancedIds) {
                await removeGameFromTournament('advanced', gameId);
                await deleteAdvancedSavedGame(gameId);
              }
            } catch (error) {
              reportError('saved-games-bulk-delete', error);
              showAlert({
                title: 'Delete failed',
                message: 'Some games could not be deleted. Please try again.',
              });
            } finally {
              setSelectedSavedGameIds(new Set());
            }
          },
        },
      ],
    });
  };

  // The select bar only shares a selection of one kind within the share limit.
  const handleBulkShareGames = () => {
    const isAdvancedSelection = selectedGames[0].kind === 'advanced';
    const gameIds = new Set(selectedGames.map((game) => game.id));
    setPendingShareAction(() => async () => {
      if (isAdvancedSelection) {
        const games = await loadAdvancedGames([...gameIds]);
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

  // The select bar only combines a selection of one kind. The selection stays for Back.
  const handleViewStats = () => {
    // One game has nothing to combine, so it opens like a row tap.
    if (selectedGames.length === 1) {
      void handleSelectGame(selectedGames[0]);
      return;
    }

    router.push({
      pathname: '/combined-stats',
      params: {
        kind: selectedGames[0].kind,
        gameIds: selectedGames.map((game) => game.id).join(','),
      },
    });
  };

  // The select bar only adds a selection of one kind.
  const handleTournamentSelected = async (tournamentId: string) => {
    try {
      const didAdd = await addGamesToTournament(
        tournamentId,
        selectedGames[0].kind,
        selectedGames.map((game) => game.id),
      );
      if (!didAdd) {
        showAlert({
          title: 'Tournament unavailable',
          message: 'Could not add the selected games to this tournament.',
        });
        return;
      }
      handleExitSelectionMode();
    } catch (error) {
      reportError('tournament-add-games', error);
      showAlert({
        title: 'Save failed',
        message: 'Could not assign all games to the tournament. Please try again.',
      });
    }
  };

  const handleConfirmShare = () => runPendingShareAction(pendingShareAction);

  const handleCancelShare = () => {
    setPendingShareAction(null);
  };

  const handleCloseShareReady = () => {
    setPendingShareAction(null);
    handleExitSelectionMode();
  };

  const headerActions: ResponsiveHeaderAction[] = [
    {
      key: 'select',
      label: selectionMode ? 'Cancel' : 'Select',
      accessibilityLabel: selectionMode ? 'Cancel selection' : 'Select games',
      onPress: handleToggleSelectionMode,
      inlineStyle: 'text',
    },
  ];

  const teamTitleAction: ScreenHeaderTitleAction | undefined =
    currentTeam && hasMultipleTeams
      ? {
          onPress: () => setShowTeamSheet(true),
          accessibilityLabel: `${currentTeam.name}, switch team`,
          testID: 'saved-games-team-switcher',
        }
      : undefined;

  return (
    <ThemedView
      testID="saved-games-screen"
      style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title={currentTeam?.name ?? 'SAVED GAMES'}
        titleAction={teamTitleAction}
        onBack={() => router.back()}
        titleColor={palette.textMuted}
        centerTitleInLandscape={false}
        rightSlot={<ResponsiveHeaderActions actions={headerActions} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {hasLiveStats ? <LiveGameRow /> : null}
        <SavedGamesList
          // Remounting resets search and the tournament filter when the team changes.
          key={currentTeam?.id}
          games={teamGames}
          sortKey={sortKey}
          onChangeSortKey={setSortKey}
          onSelectGame={handleSelectGame}
          selectedGameIds={selectedSavedGameIds}
          onToggleGameSelection={handleToggleSavedGameSelection}
          onEnterSelectionWithGame={handleEnterSelectionWithGame}
          onClearSelection={() => setSelectedSavedGameIds(new Set())}
          selectionMode={selectionMode}
          summaryAction={canCombineGames ? <CombineGamesButton /> : null}
        />
      </ScrollView>

      <SavedGamesSelectBar
        selectedGames={selectedGames}
        onViewStats={handleViewStats}
        onAddToTournament={() => setShowTournamentPicker(true)}
        onShare={handleBulkShareGames}
        onDelete={handleBulkDeleteGames}
      />

      {selectedGames.length > 0 && (
        <TournamentPickerModal
          visible={showTournamentPicker}
          gameKind={selectedGames[0].kind}
          gameIds={selectedGames.map((game) => game.id)}
          onSelect={handleTournamentSelected}
          onClose={() => setShowTournamentPicker(false)}
        />
      )}

      {currentTeam && (
        <SavedGamesTeamSheet
          visible={showTeamSheet}
          teams={savedGameTeams}
          selectedTeamId={currentTeam.id}
          onSelectTeam={handleSelectTeam}
          onClose={() => setShowTeamSheet(false)}
        />
      )}

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
      padding: 16,
      paddingTop: 8,
      gap: scaleBySizeClass(16, sizeClass),
    },
  });
}
