import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import {
  ResponsiveHeaderAction,
  ResponsiveHeaderActions,
} from '@/components/ui/ResponsiveHeaderActions';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import AnalyticsShortcutCard from '@/components/view-stats/AnalyticsShortcutCard';
import StatsContent from '@/components/view-stats/StatsContent';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useLoadSavedGamesWithAlert } from '@/hooks/useLoadSavedGamesWithAlert';
import { formatDate, generateCurrentGameCSV } from '@/lib/statsUtils';
import { useGameStore } from '@/store/gameStore';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { File, Paths } from 'expo-file-system';
import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type ViewMode = 'current' | 'saved' | 'aggregate';
type ViewStatsOrigin = 'scoreboard';

export default function ViewStatsScreen() {
  const { tab, gameId, from } = useLocalSearchParams<{
    tab?: ViewMode;
    gameId?: string;
    from?: ViewStatsOrigin;
  }>();
  const {
    currentTeam,
    team2Name,
    team1Score,
    team2Score,
    events,
    savedGames,
    startingPossession,
    gameTo,
    autoHalftimeEnabled,
    pointLines,
    team1BgColor,
    team2BgColor,
  } = useGameStore();
  const { showAlert } = useAlert();
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);

  const team1Name = currentTeam?.name ?? 'Team 1';

  // Load saved games on mount
  useLoadSavedGamesWithAlert();

  // Helper to generate filename for single game exports
  const generateGameFilename = (t1Name: string, t2Name: string, date?: number) => {
    const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = date ? formatDate(date).replace(/[^a-zA-Z0-9]/g, '_') : 'current';
    return `${sanitize(t1Name)}_vs_${sanitize(t2Name)}_${dateStr}`;
  };

  const handleExportCSV = async () => {
    try {
      const csv = generateCurrentGameCSV(
        events,
        team1Name,
        team2Name,
        startingPossession,
        gameTo,
        autoHalftimeEnabled,
        currentTeam?.roster,
        pointLines,
      );
      const filename = generateGameFilename(team1Name, team2Name);

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
  const showTimelineAction = true;
  const showExportAction = true;

  const handleOpenTimeline = () => {
    router.push('/GameTimeline');
  };

  const handleBack = () => {
    if (from === 'scoreboard') {
      router.replace('/');
      return;
    }

    router.back();
  };

  const headerActions: ResponsiveHeaderAction[] = [
    {
      key: 'timeline',
      label: 'Timeline',
      onPress: handleOpenTimeline,
      visible: showTimelineAction,
      inlineIcon: (
        <MaterialCommunityIcons
          name="chart-timeline-variant"
          size={scaleBySizeClass(24, sizeClass)}
          color={palette.accent}
        />
      ),
      menuIcon: (
        <MaterialCommunityIcons
          name="chart-timeline-variant"
          size={scaleBySizeClass(20, sizeClass)}
          color={palette.accent}
        />
      ),
    },
    {
      key: 'csv',
      label: 'Export CSV',
      onPress: handleExportCSV,
      visible: showExportAction,
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

  if (gameId) {
    return <Redirect href={{ pathname: '/saved-games/[gameId]', params: { gameId } }} />;
  }

  if (tab === 'saved') {
    return <Redirect href="/SavedGameStats" />;
  }

  if (tab === 'aggregate') {
    return <Redirect href="/AggregateStats" />;
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="CURRENT GAME"
        onBack={handleBack}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        centerTitleInLandscape={false}
        titleOverlayPaddingPortrait={88}
        rightSlot={<ResponsiveHeaderActions actions={headerActions} />}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}>
        <View style={styles.shortcutsSection}>
          <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>More Analytics</Text>
          <View style={styles.shortcutsGrid}>
            <AnalyticsShortcutCard
              title="Saved Games"
              description="Browse, share, manage past games."
              detail={
                savedGames.length === 0
                  ? 'No saved games yet'
                  : `${savedGames.length} saved game${savedGames.length === 1 ? '' : 's'}`
              }
              icon="history"
              onPress={() => router.push('/SavedGameStats')}
            />
            <AnalyticsShortcutCard
              title="Combine Games"
              description="Aggregate games into a combined stat view."
              detail={savedGames.length === 0 ? 'Start by saving a game' : 'Build combined stats'}
              icon="chart-box-outline"
              onPress={() => router.push('/AggregateStats')}
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>Live Stats</Text>
        <StatsContent
          team1Name={team1Name}
          team2Name={team2Name}
          team1Score={team1Score}
          team2Score={team2Score}
          events={events}
          roster={currentTeam?.roster}
          isSavedGame={false}
          startingPossession={startingPossession}
          gameTo={gameTo}
          autoHalftimeEnabled={autoHalftimeEnabled}
          pointLines={pointLines}
          team1Color={team1BgColor}
          team2Color={team2BgColor}
        />
      </ScrollView>
    </ThemedView>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      paddingTop: 8,
      gap: 16,
    },
    shortcutsSection: {
      gap: 10,
    },
    shortcutsGrid: {
      flexDirection: isLandscape ? 'row' : 'column',
      gap: 12,
    },
    sectionLabel: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: scaleBySizeClass(0.6, sizeClass, { rounding: 'none' }),
    },
  });
}
