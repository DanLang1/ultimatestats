import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import {
  ResponsiveHeaderAction,
  ResponsiveHeaderActions,
} from '@/components/ui/ResponsiveHeaderActions';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ShareConfirmModal } from '@/components/ui/ShareConfirmModal';
import StatsContent from '@/components/view-stats/StatsContent';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useLoadSavedGamesWithAlert } from '@/hooks/useLoadSavedGamesWithAlert';
import { resolveTeamName } from '@/lib/playerUtils';
import { serializeGame, uploadPayload } from '@/lib/sharing';
import { formatDate, generateSavedGameCSV } from '@/lib/statsUtils';
import { useGameStore } from '@/store/gameStore';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { File, Paths } from 'expo-file-system';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

export default function SavedGameStatsScreen() {
  const { gameId } = useLocalSearchParams<{ gameId?: string }>();
  const { showAlert } = useAlert();
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const { savedGames, savedTeams } = useGameStore();
  useLoadSavedGamesWithAlert();
  const [pendingShareAction, setPendingShareAction] = useState<(() => Promise<string>) | null>(
    null,
  );

  const selectedGame = gameId ? (savedGames.find((game) => game.id === gameId) ?? null) : null;

  const hasMissingParam = !gameId;
  const gameTeamName = selectedGame
    ? resolveTeamName(selectedGame.team1.id, selectedGame.team1.name, savedTeams)
    : null;
  const actionIconColor = selectedGame ? palette.accent : palette.textMuted;

  const handleExportCSV = async () => {
    if (!selectedGame || !gameTeamName) return;

    const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '_');
    const dateText = formatDate(selectedGame.createdAt).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${sanitize(gameTeamName)}_vs_${sanitize(selectedGame.team2Name)}_${dateText}`;

    try {
      const csv = generateSavedGameCSV(selectedGame);
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

  const handleShareGame = () => {
    if (!selectedGame) return;

    setPendingShareAction(() => async () => {
      const payload = serializeGame(selectedGame);
      const { url } = await uploadPayload(payload);
      return url;
    });
  };

  const handleGoToSavedGames = () => {
    router.replace({ pathname: '/ViewStats', params: { tab: 'saved' } });
  };

  const handleOpenTimeline = () => {
    if (!selectedGame) return;
    router.push({
      pathname: '/GameTimeline',
      params: { gameId: selectedGame.id },
    });
  };

  const headerActions: ResponsiveHeaderAction[] = [
    {
      key: 'timeline',
      label: 'Timeline',
      onPress: handleOpenTimeline,
      disabled: !selectedGame,
      inlineIcon: (
        <MaterialCommunityIcons
          name="chart-timeline-variant"
          size={scaleBySizeClass(24, sizeClass)}
          color={actionIconColor}
        />
      ),
      menuIcon: (
        <MaterialCommunityIcons
          name="chart-timeline-variant"
          size={scaleBySizeClass(20, sizeClass)}
          color={actionIconColor}
        />
      ),
    },
    {
      key: 'share',
      label: 'Share',
      onPress: handleShareGame,
      disabled: !selectedGame,
      inlineIcon: (
        <MaterialCommunityIcons
          name="share-variant"
          size={scaleBySizeClass(20, sizeClass)}
          color={actionIconColor}
        />
      ),
      menuIcon: (
        <MaterialCommunityIcons
          name="share-variant"
          size={scaleBySizeClass(20, sizeClass)}
          color={actionIconColor}
        />
      ),
    },
    {
      key: 'csv',
      label: 'Export CSV',
      onPress: handleExportCSV,
      disabled: !selectedGame,
      inlineIcon: (
        <FontAwesome6
          name="file-csv"
          size={scaleBySizeClass(20, sizeClass)}
          color={actionIconColor}
        />
      ),
      menuIcon: (
        <FontAwesome6
          name="file-csv"
          size={scaleBySizeClass(18, sizeClass)}
          color={actionIconColor}
        />
      ),
    },
  ];

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="SAVED GAME"
        onBack={() => router.back()}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        centerTitleInLandscape={false}
        rightSlot={<ResponsiveHeaderActions actions={headerActions} />}
      />

      {hasMissingParam || !selectedGame ? (
        <View style={styles.centeredState}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={scaleBySizeClass(42, sizeClass)}
            color={palette.textMuted}
          />
          <Text style={[styles.stateText, { color: palette.textMuted }]}>
            {hasMissingParam ? 'Missing game link.' : 'Saved game not found.'}
          </Text>
          <Pressable
            onPress={handleGoToSavedGames}
            style={[styles.recoverButton, { backgroundColor: palette.overlay10 }]}>
            <Text style={[styles.recoverButtonText, { color: palette.accent }]}>
              Go to Saved Games
            </Text>
          </Pressable>
        </View>
      ) : null}

      {selectedGame ? (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}>
          <StatsContent
            team1Name={gameTeamName ?? selectedGame.team1.name}
            team2Name={selectedGame.team2Name}
            team1Score={selectedGame.team1Score}
            team2Score={selectedGame.team2Score}
            events={selectedGame.events}
            roster={selectedGame.team1.roster}
            isSavedGame
            startingPossession={selectedGame.startingPossession}
            gameTo={selectedGame.gameTo}
            autoHalftimeEnabled={selectedGame.autoHalftimeEnabled ?? true}
            games={[selectedGame]}
            pointLines={selectedGame.pointLines}
            team1Color={selectedGame.team1Color}
            team2Color={selectedGame.team2Color}
          />
        </ScrollView>
      ) : null}
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
      gap: 18,
    },
    centeredState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: 24,
    },
    stateText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      textAlign: 'center',
      fontWeight: '600',
    },
    recoverButton: {
      marginTop: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },
    recoverButtonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '700',
    },
  });
}
