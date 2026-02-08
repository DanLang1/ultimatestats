import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import { ShareConfirmModal } from '@/components/ui/ShareConfirmModal';
import AggregateBottomBar from '@/components/view-stats/AggregateBottomBar';
import AggregateGamesList from '@/components/view-stats/AggregateGamesList';
import SavedGamesBulkActions from '@/components/view-stats/SavedGamesBulkActions';
import SavedGamesList from '@/components/view-stats/SavedGamesList';
import StatsContent from '@/components/view-stats/StatsContent';
import { useTheme } from '@/context/ThemeContext';
import { resolveTeamName } from '@/lib/playerUtils';
import { serializeGame, serializeGames, uploadPayload } from '@/lib/sharing';
import {
  formatDate,
  generateAggregateCSV,
  generateCurrentGameCSV,
  generateSavedGameCSV,
} from '@/lib/statsUtils';
import { GameEvent, Player, SavedGame } from '@/lib/storage';
import { useGameStore } from '@/store/gameStore';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { File, Paths } from 'expo-file-system';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

type ViewMode = 'current' | 'saved' | 'aggregate';

export default function ViewStatsScreen() {
  const { tab, gameId } = useLocalSearchParams<{ tab?: ViewMode; gameId?: string }>();
  const {
    currentTeam,
    team2Name,
    team1Score,
    team2Score,
    events,
    savedGames,
    savedTeams,
    loadSavedGames,
    deleteSavedGames,
    startingPossession,
    gameTo,
    pointLines,
  } = useGameStore();
  const { showAlert } = useAlert();
  const { palette } = useTheme();

  const team1Name = currentTeam?.name ?? 'Team 1';

  const [viewMode, setViewMode] = useState<ViewMode>(gameId ? 'saved' : (tab ?? 'current'));
  const [selectedGameId, setSelectedGameId] = useState<string | null>(gameId ?? null);

  // Derive selectedGame from store to ensure fresh data after edits
  const selectedGame = selectedGameId
    ? (savedGames.find((g) => g.id === selectedGameId) ?? null)
    : null;

  // Aggregate mode state
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [showingAggregatedStats, setShowingAggregatedStats] = useState(false);

  // Saved Games Selection
  const [selectedSavedGameIds, setSelectedSavedGameIds] = useState<Set<string>>(new Set());

  // Load saved games on mount
  useEffect(() => {
    loadSavedGames();
  }, [loadSavedGames]);

  // Derive unique key for scroll view to force reset
  const scrollKey = `stats-${viewMode}-${selectedGame?.id ?? 'current'}-${showingAggregatedStats ? 'agg' : 'list'}-${selectedTeam ?? ''}`;

  // Derive which data to display
  const displayData = selectedGame
    ? {
        team1Name: resolveTeamName(selectedGame.team1.id, selectedGame.team1.name, savedTeams),
        team2Name: selectedGame.team2Name,
        team1Score: selectedGame.team1Score,
        team2Score: selectedGame.team2Score,
        events: selectedGame.events,
        startingPossession: selectedGame.startingPossession,
        gameTo: selectedGame.gameTo,
        roster: selectedGame.team1.roster,
        pointLines: selectedGame.pointLines,
      }
    : {
        team1Name,
        team2Name,
        team1Score,
        team2Score,
        events,
        startingPossession,
        gameTo,
        roster: currentTeam?.roster,
        pointLines,
      };
  // Helper to generate filename for single game exports
  const generateGameFilename = (t1Name: string, t2Name: string, date?: number) => {
    const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = date ? formatDate(date).replace(/[^a-zA-Z0-9]/g, '_') : 'current';
    return `${sanitize(t1Name)}_vs_${sanitize(t2Name)}_${dateStr}`;
  };

  const handleExportCSV = async () => {
    try {
      let csv: string;
      let filename: string;

      if (showingAggregatedStats && aggregatedData) {
        csv = generateAggregateCSV(
          aggregatedData.games,
          aggregatedData.teamName,
          aggregatedData.roster,
        );
        filename = `${aggregatedData.teamName.replace(/[^a-zA-Z0-9]/g, '_')}_${aggregatedData.gameCount}_games`;
      } else if (selectedGame) {
        const gameTeamName = resolveTeamName(
          selectedGame.team1.id,
          selectedGame.team1.name,
          savedTeams,
        );
        csv = generateSavedGameCSV(selectedGame);
        filename = generateGameFilename(
          gameTeamName,
          selectedGame.team2Name,
          selectedGame.createdAt,
        );
      } else {
        csv = generateCurrentGameCSV(
          events,
          team1Name,
          team2Name,
          startingPossession,
          gameTo,
          currentTeam?.roster,
        );
        filename = generateGameFilename(team1Name, team2Name);
      }

      const file = new File(Paths.cache, `${filename}.csv`);
      file.write(csv);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri);
      } else {
        showAlert({
          title: 'Sharing not available',
          message: 'Sharing is not available on this device.',
        });
      }
    } catch {
      showAlert({
        title: 'Export failed',
        message: 'Could not export stats to CSV.',
      });
    }
  };

  const [pendingShareAction, setPendingShareAction] = useState<(() => Promise<string>) | null>(
    null,
  );

  const handleShareGame = () => {
    if (!selectedGame) return;
    const game = selectedGame;
    setPendingShareAction(() => async () => {
      const payload = serializeGame(game);
      const { url } = await uploadPayload(payload);
      return url;
    });
  };

  const handleSelectGame = (game: SavedGame) => {
    setSelectedGameId(game.id);
  };

  const handleBackToList = () => {
    setSelectedGameId(null);
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
            await deleteSavedGames(Array.from(selectedSavedGameIds));
            setSelectedSavedGameIds(new Set());
          },
        },
      ],
    });
  };

  const handleBulkShareGames = () => {
    const count = selectedSavedGameIds.size;
    if (count === 0) return;

    if (count > 10) {
      showAlert({
        title: 'Too many games',
        message: 'You can share up to 10 games at a time.',
      });
      return;
    }

    const gameIds = new Set(selectedSavedGameIds);
    setPendingShareAction(() => async () => {
      const games = savedGames.filter((g) => gameIds.has(g.id));
      const payload = serializeGames(games);
      const { url } = await uploadPayload(payload);
      return url;
    });
  };

  const handleToggleSavedGameSelection = (gameId: string) => {
    setSelectedSavedGameIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  };

  const handleTabPress = (mode: ViewMode) => {
    setViewMode(mode);
    setSelectedGameId(null);
    // Reset aggregate state when switching tabs
    setSelectedTeam(null);
    setSelectedGameIds(new Set());
    setShowingAggregatedStats(false);
    // Reset saved selection
    setSelectedSavedGameIds(new Set());
  };

  // Compute aggregated data for selected games
  let aggregatedData: {
    teamName: string;
    gameCount: number;
    events: GameEvent[];
    games: SavedGame[];
    roster: Player[];
  } | null = null;

  if (selectedGameIds.size > 0) {
    const games = savedGames.filter((g) => selectedGameIds.has(g.id));
    const mergedEvents = games.flatMap((g) => g.events);
    // Merge rosters from all games, deduplicating by player id
    const rosterMap = new Map<string, Player>();
    games.forEach((g) => g.team1.roster.forEach((p) => rosterMap.set(p.id, p)));
    const mergedRoster = Array.from(rosterMap.values());

    // Resolve team name
    const firstGame = games[0];
    const resolvedName = selectedTeam
      ? resolveTeamName(selectedTeam, firstGame.team1.name, savedTeams)
      : 'Combined';

    aggregatedData = {
      teamName: resolvedName,
      gameCount: games.length,
      events: mergedEvents,
      games: games, // Pass the games list for CSV
      roster: mergedRoster,
    };
  }

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeam(teamId);
    setSelectedGameIds(new Set());
  };

  const handleBackToTeams = () => {
    setSelectedTeam(null);
    setSelectedGameIds(new Set());
    setShowingAggregatedStats(false);
  };

  const handleToggleGameSelection = (gameId: string) => {
    setSelectedGameIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  };

  const handleToggleAllGames = (select: boolean) => {
    if (!selectedTeam) return;
    if (select) {
      // Select all games for this team (by ID)
      const games = savedGames.filter((g) => g.team1.id === selectedTeam);
      setSelectedGameIds(new Set(games.map((g) => g.id)));
    } else {
      // Deselect all
      setSelectedGameIds(new Set());
    }
  };

  const handleViewAggregated = () => {
    setShowingAggregatedStats(true);
  };

  const handleBackFromAggregated = () => {
    setShowingAggregatedStats(false);
  };

  const getHeaderTitle = () => {
    if (selectedGame) return 'SAVED GAME';
    if (showingAggregatedStats) return 'COMBINED STATS';
    if (viewMode === 'current') return 'CURRENT GAME';
    if (viewMode === 'aggregate') {
      if (selectedTeam) {
        // Try to find a game for this team to get a fallback name
        const gameForTeam = savedGames.find((g) => g.team1.id === selectedTeam);
        const name = resolveTeamName(
          selectedTeam,
          gameForTeam?.team1.name ?? 'Unknown Team',
          savedTeams,
        );
        return name.toUpperCase();
      }
      return 'AGGREGATE';
    }
    return 'SAVED GAMES';
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
          hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.textInverse} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.textMuted }]}>{getHeaderTitle()}</Text>
        <View style={styles.headerRight}>
          {/* Timeline button - show for current game or saved game */}
          {(viewMode === 'current' || selectedGame) && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/GameTimeline',
                  params: selectedGame ? { gameId: selectedGame.id } : {},
                })
              }
              style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
              hitSlop={12}>
              <MaterialCommunityIcons
                name="chart-timeline-variant"
                size={24}
                color={palette.accent}
              />
            </Pressable>
          )}
          {/* Share button - only for saved games */}
          {selectedGame && (
            <Pressable
              onPress={handleShareGame}
              style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
              hitSlop={12}>
              <MaterialCommunityIcons name="share-variant" size={20} color={palette.accent} />
            </Pressable>
          )}
          {/* Export buttons - show when stats are visible */}
          {(viewMode === 'current' || selectedGame || showingAggregatedStats) && (
            <>
              <Pressable
                onPress={handleExportCSV}
                style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
                hitSlop={12}>
                <FontAwesome6 name="file-csv" size={20} color={palette.accent} />
              </Pressable>
            </>
          )}
          {/* Close buttons for various states */}
          {selectedGame ? (
            <Pressable
              onPress={handleBackToList}
              style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
              hitSlop={12}>
              <MaterialCommunityIcons name="close" size={24} color={palette.textInverse} />
            </Pressable>
          ) : showingAggregatedStats ? (
            <Pressable
              onPress={handleBackFromAggregated}
              style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
              hitSlop={12}>
              <MaterialCommunityIcons name="close" size={24} color={palette.textInverse} />
            </Pressable>
          ) : viewMode === 'aggregate' && selectedTeam ? (
            <Pressable
              onPress={handleBackToTeams}
              style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
              hitSlop={12}>
              <MaterialCommunityIcons name="close" size={24} color={palette.textInverse} />
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>
      </View>

      {/* Tab Switcher */}
      {!selectedGame && (
        <View style={[styles.tabContainer, { backgroundColor: palette.overlay05 }]}>
          <Pressable
            style={[styles.tab, viewMode === 'current' && { backgroundColor: palette.overlay10 }]}
            onPress={() => handleTabPress('current')}>
            <MaterialCommunityIcons
              name="play-circle"
              size={18}
              color={viewMode === 'current' ? palette.accent : palette.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                { color: palette.textMuted },
                viewMode === 'current' && { color: palette.accent },
              ]}>
              Current
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, viewMode === 'saved' && { backgroundColor: palette.overlay10 }]}
            onPress={() => handleTabPress('saved')}>
            <MaterialCommunityIcons
              name="history"
              size={18}
              color={viewMode === 'saved' ? palette.accent : palette.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                { color: palette.textMuted },
                viewMode === 'saved' && { color: palette.accent },
              ]}>
              Saved ({savedGames.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, viewMode === 'aggregate' && { backgroundColor: palette.overlay10 }]}
            onPress={() => handleTabPress('aggregate')}>
            <MaterialCommunityIcons
              name="chart-box-outline"
              size={18}
              color={viewMode === 'aggregate' ? palette.accent : palette.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                { color: palette.textMuted },
                viewMode === 'aggregate' && { color: palette.accent },
              ]}>
              Aggregate
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView key={scrollKey} contentContainerStyle={styles.scrollContent}>
        {viewMode === 'current' || selectedGame ? (
          <StatsContent
            team1Name={displayData.team1Name}
            team2Name={displayData.team2Name}
            team1Score={'team1Score' in displayData ? displayData.team1Score : undefined}
            team2Score={'team2Score' in displayData ? displayData.team2Score : undefined}
            events={displayData.events}
            roster={displayData.roster}
            isSavedGame={!!selectedGame}
            startingPossession={displayData.startingPossession}
            gameTo={displayData.gameTo}
            games={selectedGame ? [selectedGame] : undefined}
            pointLines={displayData.pointLines}
          />
        ) : viewMode === 'aggregate' ? (
          showingAggregatedStats && aggregatedData ? (
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
              pointLines={aggregatedData.games.flatMap((g) => g.pointLines ?? [])}
            />
          ) : (
            <AggregateGamesList
              games={savedGames}
              selectedTeam={selectedTeam}
              selectedGameIds={selectedGameIds}
              onSelectTeam={handleSelectTeam}
              onBackToTeams={handleBackToTeams}
              onToggleGameSelection={handleToggleGameSelection}
              onViewAggregated={handleViewAggregated}
              onToggleAllGames={handleToggleAllGames}
            />
          )
        ) : (
          <SavedGamesList
            games={savedGames}
            onSelectGame={handleSelectGame}
            selectedGameIds={selectedSavedGameIds}
            onToggleGameSelection={handleToggleSavedGameSelection}
            onClearSelection={() => setSelectedSavedGameIds(new Set())}
          />
        )}
      </ScrollView>

      <AggregateBottomBar
        isVisible={viewMode === 'aggregate' && !!selectedTeam && !showingAggregatedStats}
        selectedCount={selectedGameIds.size}
        onViewAggregated={handleViewAggregated}
      />

      <SavedGamesBulkActions
        isVisible={viewMode === 'saved' && selectedSavedGameIds.size > 0}
        selectedCount={selectedSavedGameIds.size}
        onDelete={handleBulkDeleteGames}
        onShare={handleBulkShareGames}
        onCancel={() => setSelectedSavedGameIds(new Set())}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 40,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  scrollContent: {
    padding: 24,
    paddingTop: 8,
    paddingBottom: 100, // Extra padding for bottom bar
  },
  selectButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
