import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import SavedGamesList from '@/components/view-stats/SavedGamesList';
import StatsContent from '@/components/view-stats/StatsContent';
import { useTheme } from '@/context/ThemeContext';
import { computePlayerStats, formatDate, generateCSV } from '@/lib/statsUtils';
import { SavedGame } from '@/lib/storage';
import { StatRecord, TurnoverRecord, useGameStore } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { File, Paths } from 'expo-file-system';
import { router, Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type ViewMode = 'current' | 'saved';

export default function ViewStatsScreen() {
  const {
    team1Name,
    team2Name,
    statRecords,
    turnoverRecords,
    savedGames,
    loadSavedGames,
    deleteSavedGame,
  } = useGameStore();
  const { showAlert } = useAlert();
  const { palette } = useTheme();

  const [viewMode, setViewMode] = useState<ViewMode>('current');
  const [selectedGame, setSelectedGame] = useState<SavedGame | null>(null);

  // Load saved games on mount
  useEffect(() => {
    loadSavedGames();
  }, [loadSavedGames]);

  // Derive which data to display
  const displayData = selectedGame
    ? {
        team1Name: selectedGame.team1Name,
        team2Name: selectedGame.team2Name,
        team1Score: selectedGame.team1Score,
        team2Score: selectedGame.team2Score,
        statRecords: selectedGame.statRecords as StatRecord[],
        turnoverRecords: selectedGame.turnoverRecords as TurnoverRecord[],
      }
    : {
        team1Name,
        team2Name,
        statRecords,
        turnoverRecords,
      };

  const playerStats = computePlayerStats(
    displayData.statRecords,
    displayData.turnoverRecords,
    'team1',
  );

  const handleExport = async () => {
    try {
      const csv = generateCSV(
        displayData.statRecords,
        displayData.turnoverRecords,
        playerStats,
        displayData.team1Name,
        displayData.team2Name,
      );
      const filename = selectedGame
        ? `game_${formatDate(selectedGame.createdAt).replace(/[^a-zA-Z0-9]/g, '_')}.csv`
        : 'game_stats.csv';
      const file = new File(Paths.cache, filename);
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
        <Text style={[styles.headerTitle, { color: palette.textMuted }]}>
          {selectedGame ? 'SAVED GAME' : viewMode === 'current' ? 'CURRENT GAME' : 'SAVED GAMES'}
        </Text>
        {selectedGame ? (
          <Pressable
            onPress={handleBackToList}
            style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
            hitSlop={12}>
            <MaterialCommunityIcons name="close" size={24} color={palette.textInverse} />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
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
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {viewMode === 'current' || selectedGame ? (
          <StatsContent
            team1Name={displayData.team1Name}
            team2Name={displayData.team2Name}
            team1Score={'team1Score' in displayData ? displayData.team1Score : undefined}
            team2Score={'team2Score' in displayData ? displayData.team2Score : undefined}
            statRecords={displayData.statRecords}
            turnoverRecords={displayData.turnoverRecords}
            onExport={handleExport}
            isSavedGame={!!selectedGame}
          />
        ) : (
          <SavedGamesList
            games={savedGames}
            onSelectGame={handleSelectGame}
            onDeleteGame={handleDeleteGame}
          />
        )}
      </ScrollView>
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
    paddingBottom: 40,
  },
});
