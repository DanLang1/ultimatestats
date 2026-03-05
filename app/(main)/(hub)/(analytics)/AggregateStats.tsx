import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import {
  ResponsiveHeaderAction,
  ResponsiveHeaderActions,
} from '@/components/ui/ResponsiveHeaderActions';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import AggregateBottomBar from '@/components/view-stats/AggregateBottomBar';
import AggregateGamesList from '@/components/view-stats/AggregateGamesList';
import StatsContent from '@/components/view-stats/StatsContent';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useLoadSavedGamesWithAlert } from '@/hooks/useLoadSavedGamesWithAlert';
import { resolveTeamName } from '@/lib/playerUtils';
import { generateAggregateCSV } from '@/lib/statsUtils';
import { GameEvent, Player, SavedGame } from '@/lib/storage';
import { useGameStore } from '@/store/gameStore';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { File, Paths } from 'expo-file-system';
import { router, Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

export default function AggregateStatsScreen() {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const { showAlert } = useAlert();
  const { savedGames, savedTeams } = useGameStore();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [showingAggregatedStats, setShowingAggregatedStats] = useState(false);

  useLoadSavedGamesWithAlert();

  let aggregatedData: {
    teamName: string;
    gameCount: number;
    events: GameEvent[];
    games: SavedGame[];
    roster: Player[];
  } | null = null;

  if (selectedGameIds.size > 0) {
    const games = savedGames.filter((game) => selectedGameIds.has(game.id));
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

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeam(teamId);
    setSelectedGameIds(new Set());
    setShowingAggregatedStats(false);
  };

  const handleBackToTeams = () => {
    setSelectedTeam(null);
    setSelectedGameIds(new Set());
    setShowingAggregatedStats(false);
  };

  const handleToggleGameSelection = (gameId: string) => {
    setSelectedGameIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  };

  const handleToggleAllGames = (select: boolean) => {
    if (!selectedTeam) return;

    if (select) {
      const games = savedGames.filter((game) => game.team1.id === selectedTeam);
      setSelectedGameIds(new Set(games.map((game) => game.id)));
      return;
    }

    setSelectedGameIds(new Set());
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
            onBackToTeams={handleBackToTeams}
            onToggleGameSelection={handleToggleGameSelection}
            onToggleAllGames={handleToggleAllGames}
          />
        )}
      </ScrollView>

      <AggregateBottomBar
        isVisible={!!selectedTeam && !showingAggregatedStats}
        selectedCount={selectedGameIds.size}
        onViewAggregated={() => setShowingAggregatedStats(true)}
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
