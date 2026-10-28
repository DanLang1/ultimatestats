import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import {
  ResponsiveHeaderAction,
  ResponsiveHeaderActions,
} from '@/components/ui/ResponsiveHeaderActions';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import LiveGameStats from '@/components/view-stats/LiveGameStats';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getLiveInProgressGame } from '@/lib/advancedTracking/trackingUtils';
import { generateCurrentGameCSV } from '@/lib/basic/statsUtils';
import { shareCsvExport } from '@/lib/shareCsvExport';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';

export default function LiveStatsScreen() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { showAlert } = useAlert();
  const liveAdvancedGame = useAdvancedTrackingStore(getLiveInProgressGame);

  const handleOpenTimeline = () => {
    if (liveAdvancedGame) {
      router.push({
        pathname: '/advanced-tracking/analytics/timeline/[gameId]',
        params: { gameId: liveAdvancedGame.id },
      });
      return;
    }

    router.push('/game-timeline');
  };

  // CSV export covers basic games only.
  const handleExportCsv = () =>
    shareCsvExport(() => {
      const game = useGameStore.getState();
      const team1Name = game.currentTeam.name;
      return {
        csv: generateCurrentGameCSV(
          game.events,
          team1Name,
          game.team2Name,
          game.startingPossession,
          game.gameTo,
          game.autoHalftimeEnabled,
          game.currentTeam.roster,
          game.pointLines,
        ),
        filename: `${sanitizeFilename(team1Name)}_vs_${sanitizeFilename(game.team2Name)}_current`,
      };
    }, showAlert);

  const headerActions: ResponsiveHeaderAction[] = [
    {
      key: 'timeline',
      label: 'Timeline',
      onPress: handleOpenTimeline,
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
      onPress: handleExportCsv,
      visible: liveAdvancedGame == null,
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

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="CURRENT GAME"
        onBack={() => router.back()}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        centerTitleInLandscape={false}
        rightSlot={<ResponsiveHeaderActions actions={headerActions} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LiveGameStats />
      </ScrollView>
    </ThemedView>
  );
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9]/g, '_');
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
      gap: scaleBySizeClass(16, sizeClass),
    },
  });
}
