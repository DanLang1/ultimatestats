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
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useLoadSavedGamesWithAlert } from '@/hooks/useLoadSavedGamesWithAlert';
import { MAX_SHARE_GAMES } from '@/lib/constants';
import { resolveTeamName } from '@/lib/playerUtils';
import { serializeGames, uploadPayload } from '@/lib/sharing';
import { generateAggregateCSV } from '@/lib/statsUtils';
import { GameEvent, Player, SavedGame } from '@/lib/storage';
import { useGameStore } from '@/store/gameStore';
import { useTournamentStore } from '@/store/tournamentStore';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { File, Paths } from 'expo-file-system';
import { router, Stack, useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useState } from 'react';
import { ScrollView, Share, StyleSheet } from 'react-native';

export default function AggregateStatsScreen() {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const { showAlert } = useAlert();
  const { savedGames, savedTeams, updateSavedGameTournament } = useGameStore();
  const { tournaments, loadTournaments } = useTournamentStore();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [showingAggregatedStats, setShowingAggregatedStats] = useState(false);
  const [tournamentFilter, setTournamentFilter] = useState<string | null>(null);
  const [showTournamentPicker, setShowTournamentPicker] = useState(false);
  const [pendingShareAction, setPendingShareAction] = useState<(() => Promise<string>) | null>(
    null,
  );

  useLoadSavedGamesWithAlert();

  useFocusEffect(
    useCallback(() => {
      void loadTournaments();
    }, [loadTournaments]),
  );

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

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeam(teamId);
    setSelectedGameIds(new Set());
    setShowingAggregatedStats(false);
    setTournamentFilter(null);
  };

  const handleBackToTeams = () => {
    setSelectedTeam(null);
    setSelectedGameIds(new Set());
    setShowingAggregatedStats(false);
    setTournamentFilter(null);
  };

  const handleTournamentSelected = async (tournamentId: string) => {
    try {
      const ids = Array.from(selectedGameIds);
      for (const gameId of ids) {
        await updateSavedGameTournament(gameId, tournamentId);
      }
      setSelectedGameIds(new Set());
    } catch {
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

  const handleSelectAllGames = (gameIds: string[]) => {
    setSelectedGameIds((prev) => new Set([...prev, ...gameIds]));
  };

  const handleDeselectAllGames = () => {
    setSelectedGameIds(new Set());
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

  const handleExportCSV = async () => {
    if (!aggregatedData) return;

    try {
      const csv = generateAggregateCSV(
        aggregatedData.games,
        aggregatedData.teamName,
        aggregatedData.roster,
      );
      const filename = `${aggregatedData.teamName.replace(/[^a-zA-Z0-9]/g, '_')}_${aggregatedData.gameCount}_games`;
      const file = new File(Paths.cache, `${filename}.csv`);
      file.write(csv);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri);
        return;
      }

      showAlert({
        title: 'Sharing not available',
        message: 'Sharing is not available on this device.',
      });
    } catch {
      showAlert({
        title: 'Export failed',
        message: 'Could not export stats to CSV.',
      });
    }
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

    router.back();
  };

  const getHeaderTitle = () => {
    if (showingAggregatedStats) return 'COMBINED STATS';
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

  const scrollKey = `aggregate-${showingAggregatedStats ? 'stats' : 'picker'}-${selectedTeam ?? ''}`;

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
        {showingAggregatedStats && aggregatedData ? (
          <StatsContent
            team1Name={aggregatedData.teamName}
            team2Name=""
            events={aggregatedData.events}
            roster={aggregatedData.roster}
            aggregateInfo={{
              teamName: aggregatedData.teamName,
              gameCount: aggregatedData.gameCount,
            }}
            startingPossession={null}
            gameTo={15}
            games={aggregatedData.games}
            pointLines={aggregatedData.games.flatMap((game) => game.pointLines ?? [])}
          />
        ) : (
          <AggregateGamesList
            games={savedGames}
            selectedTeam={selectedTeam}
            selectedGameIds={selectedGameIds}
            onSelectTeam={handleSelectTeam}
            onToggleGameSelection={handleToggleGameSelection}
            onSelectAllGames={handleSelectAllGames}
            onDeselectAllGames={handleDeselectAllGames}
            tournaments={tournaments}
            tournamentFilter={tournamentFilter}
            onSetTournamentFilter={(id) => {
              setTournamentFilter(id);
              setSelectedGameIds(new Set());
            }}
            onCreateTournament={() => router.push('/CreateTournament')}
          />
        )}
      </ScrollView>

      <AggregateBottomBar
        isVisible={!!selectedTeam && !showingAggregatedStats}
        selectedCount={selectedGameIds.size}
        onViewAggregated={() => setShowingAggregatedStats(true)}
        showAddToTournament={!tournamentFilter && selectedGameIds.size > 0}
        onAddToTournament={() => setShowTournamentPicker(true)}
        showShare={selectedGameIds.size > 0}
        onShare={handleShareGames}
      />

      <TournamentPickerModal
        visible={showTournamentPicker}
        onSelect={handleTournamentSelected}
        onClose={() => setShowTournamentPicker(false)}
      />

      <ShareConfirmModal
        visible={pendingShareAction !== null}
        onConfirm={async () => {
          try {
            const url = await pendingShareAction!();
            setPendingShareAction(null);
            await Share.share({ message: url });
          } catch {
            showAlert({
              title: 'Share failed',
              message: 'Could not upload data for sharing. Please try again.',
            });
            throw new Error('share failed');
          }
        }}
        onCancel={() => setPendingShareAction(null)}
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
      paddingBottom: 100,
    },
  });
}
