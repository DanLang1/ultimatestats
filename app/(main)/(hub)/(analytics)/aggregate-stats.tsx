import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import AdvancedAggregateGamesList from '@/components/advancedTracking/AdvancedAggregateGamesList';
import AdvancedStatsContent from '@/components/advancedTracking/AdvancedStatsContent';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import {
  ResponsiveHeaderAction,
  ResponsiveHeaderActions,
} from '@/components/ui/ResponsiveHeaderActions';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ShareConfirmModal } from '@/components/ui/ShareConfirmModal';
import { TournamentPickerModal } from '@/components/ui/TournamentPickerModal';
import AggregateBottomBar from '@/components/view-stats/AggregateBottomBar';
import AggregateGamesList from '@/components/view-stats/AggregateGamesList';
import StatsContent from '@/components/view-stats/StatsContent';
import { useTheme } from '@/context/ThemeContext';
import {
  useCompletedAdvancedGameSummaries,
  useAdvancedGames,
} from '@/hooks/advancedTracking/useAdvancedGameQueries';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  AdvancedFlipStats,
  AdvancedInitialPullWinStats,
  computeFlipStats,
  computeInitialPullWinStats,
} from '@/lib/advancedTracking/advancedAggregateStatsUtils';
import { generateAggregateAdvancedCSV } from '@/lib/advancedTracking/advancedCSVUtils';
import { aggregateAnalyticsGames } from '@/lib/advancedTracking/aggregateAnalyticsGames';
import type { AnalyticsGame } from '@/lib/advancedTracking/analyticsTypes';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import { isAdvancedGameAggregateEligible } from '@/lib/advancedTracking/summary';
import { generateAggregateCSV } from '@/lib/basic/statsUtils';
import { MAX_SHARE_GAMES } from '@/lib/constants';
import {
  advancedGameSummaryToTeamListItem,
  basicGameToListItem,
  GameListItem,
} from '@/lib/gameListUtils';
import { resolveTeamName } from '@/lib/playerUtils';
import { reportError } from '@/lib/sentry';
import { shareCsvExport } from '@/lib/shareCsvExport';
import { serializeGames, uploadPayload } from '@/lib/sharing';
import {
  runPendingShareAction,
  SHARE_DATA_UPLOAD_ERROR_MESSAGE,
} from '@/lib/sharing/shareActionUtils';
import { GameEvent, Player, SavedGame } from '@/lib/storage';
import { getTournamentIdsByGame } from '@/lib/tournamentUtils';
import { useGameStore } from '@/store/basic/gameStore';
import { useTournamentStore } from '@/store/tournamentStore';
import { Fonts } from '@/theme/theme';

type AggregateMode = 'basic' | 'advanced';

function getAdvancedAggregateErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes('same focus side')) {
    return 'These games cannot be combined because they use incompatible advanced team records.';
  }
  return 'Could not combine the selected advanced games.';
}

function getRecordedFlipStats(games: AnalyticsGame[]): AdvancedFlipStats | null {
  const stats = computeFlipStats(games);
  if (stats.recorded === 0) return null;
  return stats;
}

export default function AggregateStatsScreen() {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const { showAlert } = useAlert();
  const { savedGames, savedTeams } = useGameStore();
  const { data: completedAdvancedSavedGameSummaries } = useCompletedAdvancedGameSummaries();
  const aggregateEligibleAdvancedGameSummaries = completedAdvancedSavedGameSummaries.filter(
    isAdvancedGameAggregateEligible,
  );
  const { tournaments, gameLinks, addGamesToTournament } = useTournamentStore();
  const [aggregateMode, setAggregateMode] = useState<AggregateMode>('advanced');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedAdvancedTeamId, setSelectedAdvancedTeamId] = useState<string | null>(null);
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [showingAggregatedStats, setShowingAggregatedStats] = useState(false);
  const [showTournamentPicker, setShowTournamentPicker] = useState(false);
  const [pendingShareAction, setPendingShareAction] = useState<(() => Promise<string>) | null>(
    null,
  );
  const tournamentIdsByBasicGame = getTournamentIdsByGame(gameLinks, 'basic');
  const tournamentIdsByAdvancedGame = getTournamentIdsByGame(gameLinks, 'advanced');
  const selectedGameItems: GameListItem[] =
    aggregateMode === 'advanced'
      ? aggregateEligibleAdvancedGameSummaries
          .filter((game) => selectedGameIds.has(game.id))
          .map((game) => advancedGameSummaryToTeamListItem(game, savedTeams))
      : savedGames
          .filter((game) => selectedGameIds.has(game.id))
          .map((game) => basicGameToListItem(game, savedTeams));

  let aggregatedData: {
    teamName: string;
    gameCount: number;
    events: GameEvent[];
    games: SavedGame[];
    roster: Player[];
  } | null = null;

  if (selectedGameIds.size > 0) {
    const games = savedGames.filter((game) => selectedGameIds.has(game.id));
    if (games.length > 0) {
      const mergedEvents = games.flatMap((game) => game.events);
      const rosterMap = new Map<string, Player>();
      games.forEach((game) =>
        game.team1.roster.forEach((player) => rosterMap.set(player.id, player)),
      );
      const mergedRoster = Array.from(rosterMap.values());
      const firstGame = games[0];
      const resolvedName = selectedTeam
        ? resolveTeamName(selectedTeam, firstGame.team1.name, savedTeams)
        : 'Combined';

      aggregatedData = {
        teamName: resolvedName,
        gameCount: games.length,
        events: mergedEvents,
        games,
        roster: mergedRoster,
      };
    }
  }

  const selectedAdvancedGameIds = aggregateMode === 'advanced' ? [...selectedGameIds].sort() : [];
  const {
    data: selectedAdvancedGames,
    isLoading: selectedAdvancedGamesLoading,
    isError: selectedAdvancedGamesError,
    isComplete: selectedAdvancedGamesComplete,
  } = useAdvancedGames(selectedAdvancedGameIds);

  const advancedFullRecordsLoading =
    selectedAdvancedGameIds.length > 0 &&
    !selectedAdvancedGamesComplete &&
    selectedAdvancedGamesLoading;
  const advancedFullRecordsMissing =
    selectedAdvancedGameIds.length > 0 &&
    !selectedAdvancedGamesComplete &&
    !advancedFullRecordsLoading;

  let advancedAnalyticsGames: AnalyticsGame[] = [];
  let aggregatedAdvancedGame: AnalyticsGame | null = null;
  let initialPullWinStats: AdvancedInitialPullWinStats | null = null;
  let flipStats: AdvancedFlipStats | null = null;
  let advancedAggregateError: string | null = null;

  if (!advancedFullRecordsLoading && !advancedFullRecordsMissing && !selectedAdvancedGamesError) {
    try {
      advancedAnalyticsGames = selectedAdvancedGames.map(buildAnalyticsGame);
      if (advancedAnalyticsGames.length > 0) {
        aggregatedAdvancedGame = aggregateAnalyticsGames(advancedAnalyticsGames);
        initialPullWinStats = computeInitialPullWinStats(advancedAnalyticsGames);
        flipStats = getRecordedFlipStats(advancedAnalyticsGames);
      }
    } catch (error) {
      advancedAggregateError = getAdvancedAggregateErrorMessage(error);
    }
  }

  const advancedAggregateUnavailable =
    selectedAdvancedGamesError || advancedFullRecordsMissing || advancedAggregateError != null;

  const advancedTeamName =
    aggregatedAdvancedGame?.sideLabels[aggregatedAdvancedGame.focusSideId] ?? 'My Team';

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeam(teamId);
    setSelectedGameIds(new Set());
    setShowingAggregatedStats(false);
  };

  const handleSelectAdvancedTeam = (teamId: string) => {
    setSelectedAdvancedTeamId(teamId);
    setSelectedGameIds(new Set());
    setShowingAggregatedStats(false);
  };

  const handleSetAggregateMode = (mode: AggregateMode) => {
    setAggregateMode(mode);
    setSelectedTeam(null);
    setSelectedAdvancedTeamId(null);
    setSelectedGameIds(new Set());
    setShowingAggregatedStats(false);
  };

  const handleBackToTeams = () => {
    setSelectedTeam(null);
    setSelectedGameIds(new Set());
    setShowingAggregatedStats(false);
  };

  const handleTournamentSelected = async (tournamentId: string) => {
    try {
      const ids = Array.from(selectedGameIds);
      const didAdd = await addGamesToTournament(tournamentId, aggregateMode, ids);
      if (!didAdd) {
        showAlert({
          title: 'Tournament unavailable',
          message: 'Could not add the selected games to this tournament.',
        });
        return;
      }
      setSelectedGameIds(new Set());
    } catch (error) {
      reportError('tournament-add-games', error);
      showAlert({
        title: 'Save failed',
        message: 'Could not assign all games to the tournament. Please try again.',
      });
    }
  };

  const handleToggleGameSelection = (gameId: string) => {
    setSelectedGameIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  };

  const handleSelectGames = (gameIds: string[]) => {
    setSelectedGameIds((prev) => new Set([...prev, ...gameIds]));
  };

  const handleDeselectGames = (gameIds: string[]) => {
    setSelectedGameIds((prev) => {
      const next = new Set(prev);
      for (const gameId of gameIds) next.delete(gameId);
      return next;
    });
  };

  const handleShareGames = () => {
    const count = selectedGameIds.size;
    if (count === 0) return;

    if (count > MAX_SHARE_GAMES) {
      showAlert({
        title: 'Too many games',
        message: `You can share up to ${MAX_SHARE_GAMES} games at a time.`,
      });
      return;
    }

    const gameIds = new Set(selectedGameIds);
    setPendingShareAction(() => async () => {
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

  const handleExportCSV = async () => {
    if (aggregateMode === 'advanced') {
      if (!aggregatedAdvancedGame || selectedAdvancedGames.length === 0) return;

      await shareCsvExport(
        () => ({
          csv: generateAggregateAdvancedCSV(
            advancedAnalyticsGames,
            aggregatedAdvancedGame,
            advancedTeamName,
          ),
          filename: `${advancedTeamName.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedAdvancedGames.length}_games_advanced`,
        }),
        showAlert,
      );
      return;
    }

    if (!aggregatedData) return;

    await shareCsvExport(
      () => ({
        csv: generateAggregateCSV(
          aggregatedData.games,
          aggregatedData.teamName,
          aggregatedData.roster,
        ),
        filename: `${aggregatedData.teamName.replace(/[^a-zA-Z0-9]/g, '_')}_${aggregatedData.gameCount}_games`,
      }),
      showAlert,
    );
  };

  const handleScreenBack = () => {
    if (showingAggregatedStats) {
      setShowingAggregatedStats(false);
      return;
    }

    if (selectedTeam) {
      handleBackToTeams();
      return;
    }

    if (selectedAdvancedTeamId) {
      setSelectedAdvancedTeamId(null);
      setSelectedGameIds(new Set());
      setShowingAggregatedStats(false);
      return;
    }

    router.back();
  };

  const getHeaderTitle = () => {
    if (showingAggregatedStats) return 'COMBINED STATS';
    if (aggregateMode === 'advanced' && selectedAdvancedTeamId) {
      const gameForSide = aggregateEligibleAdvancedGameSummaries.find(
        (game) => (game.focusSourceTeamId ?? game.focusSideId) === selectedAdvancedTeamId,
      );
      const sideName = gameForSide
        ? advancedGameSummaryToTeamListItem(gameForSide, savedTeams).myTeamName
        : 'Advanced Team';
      return sideName.toUpperCase();
    }
    if (!selectedTeam) return 'AGGREGATE STATS';

    const gameForTeam = savedGames.find((game) => game.team1.id === selectedTeam);
    const teamName = resolveTeamName(
      selectedTeam,
      gameForTeam?.team1.name ?? 'Unknown Team',
      savedTeams,
    );
    return teamName.toUpperCase();
  };

  const headerActions: ResponsiveHeaderAction[] = [
    {
      key: 'csv',
      label: 'Export CSV',
      onPress: handleExportCSV,
      visible: showingAggregatedStats,
      inlineIcon: (
        <FontAwesome6
          name="file-csv"
          size={scaleBySizeClass(20, sizeClass)}
          color={palette.accent}
        />
      ),
      menuIcon: (
        <FontAwesome6
          name="file-csv"
          size={scaleBySizeClass(18, sizeClass)}
          color={palette.accent}
        />
      ),
    },
  ];

  const scrollKey = `aggregate-${aggregateMode}-${showingAggregatedStats ? 'stats' : 'picker'}-${selectedTeam ?? selectedAdvancedTeamId ?? ''}`;

  let mainContent: React.ReactNode;
  if (showingAggregatedStats && aggregateMode === 'advanced' && advancedFullRecordsLoading) {
    mainContent = (
      <View style={styles.statusState}>
        <ActivityIndicator color={palette.accent} />
        <ThemedText style={[styles.statusTitle, { color: palette.textInverse }]}>
          Loading combined stats
        </ThemedText>
        <ThemedText style={[styles.statusText, { color: palette.textMuted }]}>
          Fetching full advanced game records...
        </ThemedText>
      </View>
    );
  } else if (
    showingAggregatedStats &&
    aggregateMode === 'advanced' &&
    advancedAggregateUnavailable
  ) {
    const message = selectedAdvancedGamesError
      ? 'Could not load the selected advanced games.'
      : (advancedAggregateError ?? 'Some selected advanced games could not be loaded.');

    mainContent = (
      <View style={styles.statusState}>
        <FontAwesome6
          name="triangle-exclamation"
          size={scaleBySizeClass(28, sizeClass)}
          color={palette.accent}
        />
        <ThemedText style={[styles.statusTitle, { color: palette.textInverse }]}>
          Combined stats unavailable
        </ThemedText>
        <ThemedText style={[styles.statusText, { color: palette.textMuted }]}>{message}</ThemedText>
        <Pressable
          style={[styles.statusButton, { backgroundColor: palette.accent }]}
          onPress={() => setShowingAggregatedStats(false)}>
          <ThemedText style={[styles.statusButtonText, { color: palette.textOnAccent }]}>
            Back to Games
          </ThemedText>
        </Pressable>
      </View>
    );
  } else if (showingAggregatedStats && aggregatedAdvancedGame && aggregateMode === 'advanced') {
    mainContent = (
      <AdvancedStatsContent
        game={aggregatedAdvancedGame}
        gameId="aggregate"
        myTeamName={advancedTeamName}
        opponentName="Opponents"
        myScore={0}
        opponentScore={0}
        perspectiveSideId={aggregatedAdvancedGame.focusSideId}
        participantNames={aggregatedAdvancedGame.participantNames}
        routeScope="saved"
        aggregateInfo={{ gameCount: selectedAdvancedGames.length }}
        aggregateGameIds={selectedAdvancedGames.map((game) => game.id)}
        initialPullWinStats={initialPullWinStats ?? undefined}
        flipStats={flipStats ?? undefined}
      />
    );
  } else if (showingAggregatedStats && aggregatedData) {
    mainContent = (
      <StatsContent
        team1Name={aggregatedData.teamName}
        team2Name=""
        events={aggregatedData.events}
        roster={aggregatedData.roster}
        routeScope="saved"
        aggregateInfo={{
          teamName: aggregatedData.teamName,
          gameCount: aggregatedData.gameCount,
        }}
        startingPossession={null}
        gameTo={15}
        games={aggregatedData.games}
        pointLines={aggregatedData.games.flatMap((game) => game.pointLines ?? [])}
      />
    );
  } else if (aggregateMode === 'advanced') {
    mainContent = (
      <AdvancedAggregateGamesList
        games={aggregateEligibleAdvancedGameSummaries}
        selectedTeamId={selectedAdvancedTeamId}
        selectedGameIds={selectedGameIds}
        onSelectTeam={handleSelectAdvancedTeam}
        onToggleGameSelection={handleToggleGameSelection}
        onSelectGames={handleSelectGames}
        onDeselectGames={handleDeselectGames}
        tournaments={tournaments}
        tournamentIdsByGame={tournamentIdsByAdvancedGame}
      />
    );
  } else {
    mainContent = (
      <AggregateGamesList
        games={savedGames}
        selectedTeam={selectedTeam}
        selectedGameIds={selectedGameIds}
        onSelectTeam={handleSelectTeam}
        onToggleGameSelection={handleToggleGameSelection}
        onSelectGames={handleSelectGames}
        onDeselectGames={handleDeselectGames}
        tournaments={tournaments}
        tournamentIdsByGame={tournamentIdsByBasicGame}
      />
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title={getHeaderTitle()}
        onBack={handleScreenBack}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        centerTitleInLandscape={false}
        rightSlot={<ResponsiveHeaderActions actions={headerActions} />}
      />

      <ScrollView key={scrollKey} contentContainerStyle={styles.scrollContent}>
        {!showingAggregatedStats && (
          <View
            accessibilityRole="tablist"
            style={[styles.modeSwitch, { backgroundColor: palette.overlay05 }]}>
            {(['advanced', 'basic'] as const).map((mode) => {
              const isActive = aggregateMode === mode;
              return (
                <Pressable
                  key={mode}
                  testID={`aggregate-mode-${mode}`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  onPress={() => handleSetAggregateMode(mode)}
                  style={[
                    styles.modeButton,
                    isActive && { backgroundColor: palette.segmentActive },
                  ]}>
                  <ThemedText
                    style={[
                      styles.modeButtonText,
                      { color: isActive ? palette.textInverse : palette.textMuted },
                    ]}>
                    {mode === 'basic' ? 'Basic' : 'Advanced'}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}

        {mainContent}
      </ScrollView>

      <AggregateBottomBar
        isVisible={
          ((aggregateMode === 'basic' && !!selectedTeam) ||
            (aggregateMode === 'advanced' && !!selectedAdvancedTeamId)) &&
          !showingAggregatedStats
        }
        selectedGames={selectedGameItems}
        onViewStats={() => setShowingAggregatedStats(true)}
        onAddToTournament={() => setShowTournamentPicker(true)}
        showShare={aggregateMode === 'basic'}
        onShare={handleShareGames}
      />

      <TournamentPickerModal
        visible={showTournamentPicker}
        gameKind={aggregateMode}
        gameIds={[...selectedGameIds]}
        onSelect={handleTournamentSelected}
        onClose={() => setShowTournamentPicker(false)}
      />

      <ShareConfirmModal
        visible={pendingShareAction !== null}
        onConfirm={handleConfirmShare}
        errorMessage={SHARE_DATA_UPLOAD_ERROR_MESSAGE}
        onCancel={handleCancelShare}
        onCloseReady={handleCancelShare}
      />
    </ThemedView>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: isLandscape ? 14 : 24,
      paddingTop: isLandscape ? 8 : 16,
    },
    modeSwitch: {
      flexDirection: 'row',
      borderRadius: 10,
      padding: 3,
      marginBottom: 16,
    },
    modeButton: {
      flex: 1,
      // Outer radius 10 minus the track's 3pt padding.
      borderRadius: 7,
      paddingVertical: 8,
      alignItems: 'center',
    },
    modeButtonText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    statusState: {
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 24,
      paddingVertical: 48,
    },
    statusTitle: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
      textAlign: 'center',
    },
    statusText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.regular,
      lineHeight: scaleBySizeClass(20, sizeClass),
      textAlign: 'center',
    },
    statusButton: {
      borderRadius: 8,
      marginTop: 4,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    statusButtonText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
