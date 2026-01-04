import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import AggregateBottomBar from '@/components/view-stats/AggregateBottomBar';
import AggregateGamesList from '@/components/view-stats/AggregateGamesList';
import SavedGamesList from '@/components/view-stats/SavedGamesList';
import StatsContent from '@/components/view-stats/StatsContent';
import { useTheme } from '@/context/ThemeContext';
import {
  formatDate,
  generateAggregateCSV,
  generateCurrentGameCSV,
  generateSavedGameCSV,
} from '@/lib/statsUtils';
import { GameEvent, Player, SavedGame } from '@/lib/storage';
import { useGameStore } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { File, Paths } from 'expo-file-system';
import { router, Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type ViewMode = 'current' | 'saved' | 'aggregate';

export default function ViewStatsScreen() {
  const {
    currentTeam,
    team2Name,
    team1Score,
    team2Score,
    events,
    savedGames,
    loadSavedGames,
    deleteSavedGame,
    startingPossession,
    gameTo,
  } = useGameStore();
  const { showAlert } = useAlert();
  const { palette } = useTheme();

  const team1Name = currentTeam?.name ?? 'Team 1';

  const [viewMode, setViewMode] = useState<ViewMode>('current');
  const [selectedGame, setSelectedGame] = useState<SavedGame | null>(null);

  // Aggregate mode state
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [showingAggregatedStats, setShowingAggregatedStats] = useState(false);

  // Load saved games on mount
  useEffect(() => {
    loadSavedGames();
  }, [loadSavedGames]);

  // Derive unique key for scroll view to force reset
  const scrollKey = `stats-${viewMode}-${selectedGame?.id ?? 'current'}-${showingAggregatedStats ? 'agg' : 'list'}-${selectedTeam ?? ''}`;

  // Derive which data to display
  const displayData = selectedGame
    ? {
        team1Name: selectedGame.team1.name,
        team2Name: selectedGame.team2Name,
        team1Score: selectedGame.team1Score,
        team2Score: selectedGame.team2Score,
        events: selectedGame.events,
        startingPossession: selectedGame.startingPossession,
        gameTo: selectedGame.gameTo,
        roster: selectedGame.team1.roster,
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
      };

  const handleExport = () => {
    const defaultFilename = selectedGame
      ? `game_${formatDate(selectedGame.createdAt).replace(/[^a-zA-Z0-9]/g, '_')}`
      : showingAggregatedStats && aggregatedData
        ? `${aggregatedData.teamName.replace(/[^a-zA-Z0-9]/g, '_')}_${aggregatedData.gameCount}_games`
        : 'game_stats';

    showAlert({
      title: 'Export CSV',
      message: 'Enter a filename for the export:',
      prompt: {
        placeholder: 'filename',
        defaultValue: defaultFilename,
        onSubmit: async (filename: string) => {
          try {
            // Use appropriate export function based on context
            let csv: string;
            if (selectedGame) {
              csv = generateSavedGameCSV(selectedGame);
            } else if (showingAggregatedStats && aggregatedData) {
              csv = generateAggregateCSV(
                aggregatedData.games,
                aggregatedData.teamName,
                aggregatedData.roster,
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
            }
            const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
            const file = new File(Paths.cache, `${sanitizedFilename}.csv`);
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
        },
      },
    });
  };

  const handleSelectGame = (game: SavedGame) => {
    setSelectedGame(game);
  };

  const handleBackToList = () => {
    setSelectedGame(null);
  };

  const handleDeleteGame = async (id: string) => {
    await deleteSavedGame(id);
    if (selectedGame?.id === id) {
      setSelectedGame(null);
    }
  };

  const handleTabPress = (mode: ViewMode) => {
    setViewMode(mode);
    setSelectedGame(null);
    // Reset aggregate state when switching tabs
    setSelectedTeam(null);
    setSelectedGameIds(new Set());
    setShowingAggregatedStats(false);
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
    aggregatedData = {
      teamName: selectedTeam || 'Combined',
      gameCount: games.length,
      events: mergedEvents,
      games: games, // Pass the games list for CSV
      roster: mergedRoster,
    };
  }

  const handleSelectTeam = (teamName: string) => {
    setSelectedTeam(teamName);
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
      // Select all games for this team
      const games = savedGames.filter((g) => g.team1.name === selectedTeam);
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
      return selectedTeam ? selectedTeam.toUpperCase() : 'AGGREGATE';
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
          {/* Export button - show when stats are visible */}
          {(viewMode === 'current' || selectedGame || showingAggregatedStats) && (
            <Pressable
              onPress={handleExport}
              style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
              hitSlop={12}>
              <MaterialCommunityIcons name="export-variant" size={24} color={palette.accent} />
            </Pressable>
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
            onDeleteGame={handleDeleteGame}
          />
        )}
      </ScrollView>

      <AggregateBottomBar
        isVisible={viewMode === 'aggregate' && !!selectedTeam && !showingAggregatedStats}
        selectedCount={selectedGameIds.size}
        onViewAggregated={handleViewAggregated}
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
});
