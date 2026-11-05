import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import AdvancedAggregateGamesList from '@/components/advancedTracking/AdvancedAggregateGamesList';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ShareConfirmModal } from '@/components/ui/ShareConfirmModal';
import { TournamentPickerModal } from '@/components/ui/TournamentPickerModal';
import AggregateBottomBar from '@/components/view-stats/AggregateBottomBar';
import AggregateGamesList from '@/components/view-stats/AggregateGamesList';
import { useTheme } from '@/context/ThemeContext';
import { useCompletedAdvancedGameSummaries } from '@/hooks/advancedTracking/useAdvancedGameQueries';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { isAdvancedGameAggregateEligible } from '@/lib/advancedTracking/summary';
import { MAX_SHARE_GAMES } from '@/lib/constants';
import {
  advancedGameSummaryToTeamListItem,
  basicGameToListItem,
  GameListItem,
} from '@/lib/gameListUtils';
import { resolveTeamName } from '@/lib/playerUtils';
import { reportError } from '@/lib/sentry';
import { serializeGames, uploadPayload } from '@/lib/sharing';
import {
  runPendingShareAction,
  SHARE_DATA_UPLOAD_ERROR_MESSAGE,
} from '@/lib/sharing/shareActionUtils';
import { leaveStatsScreen, type StatsScreenOrigin } from '@/lib/statsRouteScope';
import { GameKind } from '@/lib/storage/types';
import { buildTournamentIndex } from '@/lib/tournamentIndex';
import { useGameStore } from '@/store/basic/gameStore';
import { useTournamentStore } from '@/store/tournamentStore';
import { Fonts } from '@/theme/theme';

export default function AggregateStatsScreen() {
  const { from } = useLocalSearchParams<{ from?: StatsScreenOrigin }>();
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
  const [aggregateMode, setAggregateMode] = useState<GameKind>('advanced');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedAdvancedTeamId, setSelectedAdvancedTeamId] = useState<string | null>(null);
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [showTournamentPicker, setShowTournamentPicker] = useState(false);
  const [pendingShareAction, setPendingShareAction] = useState<(() => Promise<string>) | null>(
    null,
  );
  const tournamentIndex = buildTournamentIndex(tournaments, gameLinks);
  const selectedGameItems: GameListItem[] =
    aggregateMode === 'advanced'
      ? aggregateEligibleAdvancedGameSummaries
          .filter((game) => selectedGameIds.has(game.id))
          .map((game) => advancedGameSummaryToTeamListItem(game, savedTeams))
      : savedGames
          .filter((game) => selectedGameIds.has(game.id))
          .map((game) => basicGameToListItem(game, savedTeams));

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeam(teamId);
    setSelectedGameIds(new Set());
  };

  const handleSelectAdvancedTeam = (teamId: string) => {
    setSelectedAdvancedTeamId(teamId);
    setSelectedGameIds(new Set());
  };

  const handleSetAggregateMode = (mode: GameKind) => {
    setAggregateMode(mode);
    setSelectedTeam(null);
    setSelectedAdvancedTeamId(null);
    setSelectedGameIds(new Set());
  };

  const handleBackToTeams = () => {
    setSelectedTeam(null);
    setSelectedGameIds(new Set());
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

  const handleViewStats = () => {
    router.push({
      pathname: '/combined-stats',
      params: {
        kind: aggregateMode,
        gameIds: [...selectedGameIds].join(','),
        // The picker only lists combinable games.
        excludedScrimmageCount: '0',
      },
    });
  };

  const handleScreenBack = () => {
    if (selectedTeam) {
      handleBackToTeams();
      return;
    }

    if (selectedAdvancedTeamId) {
      setSelectedAdvancedTeamId(null);
      setSelectedGameIds(new Set());
      return;
    }

    leaveStatsScreen(from);
  };

  const getHeaderTitle = () => {
    if (aggregateMode === 'advanced' && selectedAdvancedTeamId) {
      const gameForSide = aggregateEligibleAdvancedGameSummaries.find(
        (game) => game.focusSourceTeamId === selectedAdvancedTeamId,
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

  const scrollKey = `aggregate-${aggregateMode}-${selectedTeam ?? selectedAdvancedTeamId ?? ''}`;

  let mainContent: React.ReactNode;
  if (aggregateMode === 'advanced') {
    mainContent = (
      <AdvancedAggregateGamesList
        games={aggregateEligibleAdvancedGameSummaries}
        selectedTeamId={selectedAdvancedTeamId}
        selectedGameIds={selectedGameIds}
        onSelectTeam={handleSelectAdvancedTeam}
        onToggleGameSelection={handleToggleGameSelection}
        onSelectGames={handleSelectGames}
        onDeselectGames={handleDeselectGames}
        tournamentIndex={tournamentIndex}
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
        tournamentIndex={tournamentIndex}
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
      />

      <ScrollView key={scrollKey} contentContainerStyle={styles.scrollContent}>
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
                style={[styles.modeButton, isActive && { backgroundColor: palette.segmentActive }]}>
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

        {mainContent}
      </ScrollView>

      <AggregateBottomBar
        isVisible={
          (aggregateMode === 'basic' && !!selectedTeam) ||
          (aggregateMode === 'advanced' && !!selectedAdvancedTeamId)
        }
        selectedGames={selectedGameItems}
        onViewStats={handleViewStats}
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
  });
}
