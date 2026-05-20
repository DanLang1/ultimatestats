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
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { generateAdvancedGameCSV } from '@/lib/advancedTracking/advancedCSVUtils';
import { buildAnalyticsGame, getFinalScores } from '@/lib/advancedTracking/buildAnalyticsGame';
import { shareFileAndDelete } from '@/lib/shareFileAndDelete';
import { serializeAdvancedGame, uploadPayload } from '@/lib/sharing';
import {
  runPendingShareAction,
  SHARE_DATA_UPLOAD_ERROR_MESSAGE,
} from '@/lib/sharing/shareActionUtils';
import { formatDate } from '@/lib/statsUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { File, Paths } from 'expo-file-system';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

type AdvancedGameStatsOrigin = 'gameComplete';

export default function AdvancedGameStatsScreen() {
  const { gameId, from } = useLocalSearchParams<{
    gameId?: string;
    from?: AdvancedGameStatsOrigin;
  }>();
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const { showAlert } = useAlert();
  const { savedGames, deleteSavedGame } = useAdvancedTrackingStore();
  const [pendingShareAction, setPendingShareAction] = useState<(() => Promise<string>) | null>(
    null,
  );

  const rawGame = gameId ? (savedGames.find((g) => g.id === gameId) ?? null) : null;

  const analyticsGame = rawGame ? buildAnalyticsGame(rawGame) : null;

  const handleBack = () => {
    if (from === 'gameComplete') {
      router.replace('/Dashboard');
      return;
    }

    router.back();
  };

  if (!gameId || !rawGame || !analyticsGame) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader
          title="ADVANCED GAME"
          onBack={handleBack}
          titleColor={palette.textMuted}
          backButtonBackgroundColor={palette.overlay10}
          centerTitleInLandscape={false}
        />
        <View style={styles.centeredState}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={scaleBySizeClass(42, sizeClass)}
            color={palette.textMuted}
          />
          <ThemedText style={[styles.stateText, { color: palette.textMuted }]}>
            {!gameId ? 'Missing game link.' : 'Game not found.'}
          </ThemedText>
          <Pressable
            onPress={() => router.replace('/SavedGameStats')}
            style={[styles.recoverButton, { backgroundColor: palette.overlay10 }]}>
            <ThemedText style={[styles.recoverButtonText, { color: palette.accent }]}>
              Go to Saved Games
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const myTeamName = analyticsGame.sideLabels[analyticsGame.focusSideId] ?? 'My Team';
  const opponentName =
    analyticsGame.metadata?.opponentName ??
    analyticsGame.sideLabels[analyticsGame.oppSideId] ??
    'Opponent';
  const finalScores = getFinalScores(analyticsGame);
  const myScore = finalScores[analyticsGame.focusSideId] ?? 0;
  const opponentScore = finalScores[analyticsGame.oppSideId] ?? 0;

  const timestamp = analyticsGame.metadata?.date
    ? new Date(analyticsGame.metadata.date).getTime() || analyticsGame.createdAt
    : analyticsGame.createdAt;

  const handleExportCSV = async () => {
    try {
      const csv = generateAdvancedGameCSV(analyticsGame);
      const safeName = myTeamName.replace(/[^a-zA-Z0-9]/g, '_');
      const safeOpp = opponentName.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${safeName}_vs_${safeOpp}_advanced`;
      const file = new File(Paths.cache, `${filename}.csv`);
      file.write(csv);

      if (await shareFileAndDelete(file)) {
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
    setPendingShareAction(() => async () => {
      const payload = serializeAdvancedGame(rawGame);
      const { url } = await uploadPayload(payload);
      return url;
    });
  };

  const handleConfirmShare = () => runPendingShareAction(pendingShareAction);

  const handleCancelShare = () => {
    setPendingShareAction(null);
  };

  const handleDelete = () => {
    showAlert({
      title: 'Delete Game?',
      message: 'Are you sure you want to delete this saved game?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteSavedGame(gameId);
            router.replace('/SavedGameStats');
          },
        },
      ],
    });
  };

  const headerActions: ResponsiveHeaderAction[] = [
    {
      key: 'share',
      label: 'Share',
      visible: rawGame.status === 'final',
      onPress: handleShareGame,
      inlineIcon: (
        <MaterialCommunityIcons
          name="share-variant"
          size={scaleBySizeClass(22, sizeClass)}
          color={palette.accent}
        />
      ),
      menuIcon: (
        <MaterialCommunityIcons
          name="share-variant"
          size={scaleBySizeClass(20, sizeClass)}
          color={palette.accent}
        />
      ),
    },
    {
      key: 'csv',
      label: 'Export CSV',
      onPress: handleExportCSV,
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
    {
      key: 'timeline',
      label: 'Timeline',
      onPress: () =>
        router.push({
          pathname: '/advancedTracking/analytics/timeline/[gameId]',
          params: { gameId },
        }),
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
      key: 'delete',
      label: 'Delete',
      onPress: handleDelete,
      inlineIcon: (
        <MaterialCommunityIcons
          name="delete-outline"
          size={scaleBySizeClass(20, sizeClass)}
          color={palette.danger}
        />
      ),
      menuIcon: (
        <MaterialCommunityIcons
          name="delete-outline"
          size={scaleBySizeClass(20, sizeClass)}
          color={palette.danger}
        />
      ),
    },
  ];

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="ADVANCED GAME"
        onBack={handleBack}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        centerTitleInLandscape={false}
        rightSlot={<ResponsiveHeaderActions actions={headerActions} />}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}>
        {/* Date card */}
        <View
          style={[
            styles.dateCard,
            { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
          ]}>
          <View style={styles.dateCardContent}>
            <ThemedText style={[styles.dateLabel, { color: palette.textMuted }]}>
              PLAYED AT
            </ThemedText>
            <ThemedText style={[styles.dateValue, { color: palette.textInverse }]}>
              {formatDate(timestamp)}
            </ThemedText>
          </View>
          {analyticsGame.metadata?.location ? (
            <View style={styles.locationRow}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={scaleBySizeClass(14, sizeClass)}
                color={palette.textMuted}
              />
              <ThemedText style={[styles.locationText, { color: palette.textMuted }]}>
                {analyticsGame.metadata.location}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <AdvancedStatsContent
          game={analyticsGame}
          gameId={gameId}
          myTeamName={myTeamName}
          opponentName={opponentName}
          myScore={myScore}
          opponentScore={opponentScore}
          focusSideId={analyticsGame.focusSideId}
          participantNames={analyticsGame.participantNames}
        />
      </ScrollView>

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
      fontFamily: Fonts.semiBold,
    },
    recoverButton: {
      marginTop: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },
    recoverButtonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
    },
    dateCard: {
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 8,
    },
    dateCardContent: {
      gap: 4,
    },
    dateLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
    },
    dateValue: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    locationText: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
  });
}
