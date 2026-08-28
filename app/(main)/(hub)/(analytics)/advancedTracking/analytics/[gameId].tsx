import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import { File, Paths } from 'expo-file-system';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AdvancedGameNoteCard } from '@/components/advancedTracking/AdvancedGameNoteCard';
import { AdvancedGameNoteModal } from '@/components/advancedTracking/AdvancedGameNoteModal';
import AdvancedStatsContent from '@/components/advancedTracking/AdvancedStatsContent';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import {
  ResponsiveHeaderAction,
  ResponsiveHeaderActions,
} from '@/components/ui/ResponsiveHeaderActions';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ShareConfirmModal } from '@/components/ui/ShareConfirmModal';
import { useTheme } from '@/context/ThemeContext';
import { useAdvancedGame } from '@/hooks/advancedTracking/useAdvancedGameQueries';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { generateAdvancedGameCSV } from '@/lib/advancedTracking/advancedCSVUtils';
import {
  getAnalyticsSidePerspective,
  resolveAnalyticsSideId,
} from '@/lib/advancedTracking/analyticsPerspectiveUtils';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import { withAdvancedGameNote } from '@/lib/advancedTracking/gameNoteUtils';
import { areBothSidesFullyTracked } from '@/lib/advancedTracking/trackingModeUtils';
import { MIN_PLAYED_AT_YEAR } from '@/lib/constants';
import { formatTimestampForDisplay as formatDate } from '@/lib/dateUtils';
import { shareFileAndDelete } from '@/lib/shareFileAndDelete';
import { serializeAdvancedGame, uploadPayload } from '@/lib/sharing';
import {
  runPendingShareAction,
  SHARE_DATA_UPLOAD_ERROR_MESSAGE,
} from '@/lib/sharing/shareActionUtils';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useTournamentStore } from '@/store/tournamentStore';
import { Fonts } from '@/theme/theme';

type AdvancedGameStatsOrigin = 'gameComplete';

const MIN_PLAYED_AT_DATE = new Date(MIN_PLAYED_AT_YEAR, 0, 1);

export default function AdvancedGameStatsScreen() {
  const { gameId, from } = useLocalSearchParams<{
    gameId?: string;
    from?: AdvancedGameStatsOrigin;
  }>();
  const { palette, themeMode } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const { showAlert } = useAlert();
  const { deleteSavedGame } = useAdvancedTrackingStore();
  const removeGameFromTournament = useTournamentStore((state) => state.removeGameFromTournament);
  const saveAdvancedGame = useSavedAdvancedGamesStore((state) => state.saveGame);
  const { data: rawGame, isLoading } = useAdvancedGame(gameId!);
  const [pendingShareAction, setPendingShareAction] = useState<(() => Promise<string>) | null>(
    null,
  );
  const [selectedSideId, setSelectedSideId] = useState<string | null>(null);
  const [showGameNote, setShowGameNote] = useState(false);

  const analyticsGame = rawGame ? buildAnalyticsGame(rawGame) : null;
  let emptyStateText = 'Game not found.';
  if (isLoading) {
    emptyStateText = 'Loading game...';
  }

  const handleBack = () => {
    if (from === 'gameComplete') {
      router.replace('/Dashboard');
      return;
    }

    router.back();
  };

  if (!gameId || isLoading || !rawGame || !analyticsGame) {
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
          {isLoading ? (
            <ActivityIndicator color={palette.accent} size="large" />
          ) : (
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={scaleBySizeClass(42, sizeClass)}
              color={palette.textMuted}
            />
          )}
          <ThemedText style={[styles.stateText, { color: palette.textMuted }]}>
            {emptyStateText}
          </ThemedText>
          {!isLoading && (
            <Pressable
              onPress={() => router.replace('/SavedGameStats')}
              style={[styles.recoverButton, { backgroundColor: palette.overlay10 }]}>
              <ThemedText style={[styles.recoverButtonText, { color: palette.accent }]}>
                Go to Saved Games
              </ThemedText>
            </Pressable>
          )}
        </View>
      </ThemedView>
    );
  }

  const canSelectEitherSide = areBothSidesFullyTracked(rawGame);
  const perspectiveSideId = canSelectEitherSide
    ? resolveAnalyticsSideId(analyticsGame, selectedSideId)
    : analyticsGame.focusSideId;
  const perspective = getAnalyticsSidePerspective(analyticsGame, perspectiveSideId);

  const timestamp = analyticsGame.metadata?.date
    ? new Date(analyticsGame.metadata.date).getTime() || analyticsGame.createdAt
    : analyticsGame.createdAt;
  const hasPlayedAt = Boolean(rawGame.metadata?.date);

  const handleUpdatePlayedAt = async (playedAt: number) => {
    await saveAdvancedGame(
      {
        ...rawGame,
        metadata: {
          ...rawGame.metadata,
          date: new Date(playedAt).toISOString(),
        },
      },
      { touchUpdatedAt: true },
    );
  };

  const handleSaveGameNote = async (note: string) => {
    await saveAdvancedGame(
      {
        ...rawGame,
        metadata: withAdvancedGameNote(rawGame.metadata, note),
      },
      { touchUpdatedAt: true },
    );
  };

  const handleDateChange = async (_event: DateTimePickerChangeEvent, selectedValue: Date) => {
    const now = new Date();
    if (selectedValue.getTime() > now.getTime()) return;
    await handleUpdatePlayedAt(selectedValue.getTime());
  };

  const handleOpenAndroidDatePicker = () => {
    const now = new Date();
    DateTimePickerAndroid.open({
      value: new Date(timestamp),
      mode: 'date',
      maximumDate: now,
      minimumDate: MIN_PLAYED_AT_DATE,
      onValueChange: (_event, date) => {
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          is24Hour: false,
          onValueChange: async (_timeEvent, finalDate) => {
            if (finalDate.getTime() <= now.getTime()) {
              await handleUpdatePlayedAt(finalDate.getTime());
            }
          },
        });
      },
    });
  };

  const handleExportCSV = async () => {
    try {
      const csv = generateAdvancedGameCSV(analyticsGame, perspective.sideId);
      const safeName = perspective.sideName.replace(/[^a-zA-Z0-9]/g, '_');
      const safeOpp = perspective.opposingSideName.replace(/[^a-zA-Z0-9]/g, '_');
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
          onPress: async () => {
            await deleteSavedGame(gameId);
            await removeGameFromTournament('advanced', gameId);
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
      visible: rawGame.status === 'final' || rawGame.status === 'terminated',
      onPress: handleShareGame,
      advancedMenuIcon: 'share-variant',
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
      advancedMenuIcon: 'file-delimited-outline',
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
      advancedMenuIcon: 'chart-timeline-variant',
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
      advancedMenuIcon: 'delete-outline',
      advancedMenuTone: 'danger',
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
        rightSlot={
          <ResponsiveHeaderActions
            actions={headerActions}
            menuVariant="advanced"
            menuTitle="GAME ACTIONS"
          />
        }
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}>
        {Platform.OS === 'ios' ? (
          <View
            style={[
              styles.dateCard,
              { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
            ]}>
            <View style={styles.dateCardContent}>
              <ThemedText style={[styles.dateLabel, { color: palette.textMuted }]}>
                PLAYED AT
              </ThemedText>
              <DateTimePicker
                value={new Date(timestamp)}
                mode="datetime"
                display="compact"
                maximumDate={new Date()}
                minimumDate={MIN_PLAYED_AT_DATE}
                onValueChange={handleDateChange}
                themeVariant={themeMode}
                accentColor={palette.accent}
              />
              {hasPlayedAt ? (
                <ThemedText style={[styles.dateSecondary, { color: palette.textMuted }]}>
                  Recorded {formatDate(rawGame.createdAt)}
                </ThemedText>
              ) : null}
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
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.dateCard,
              { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
              pressed && styles.dateCardPressed,
            ]}
            onPress={handleOpenAndroidDatePicker}>
            <View style={styles.dateCardContent}>
              <ThemedText style={[styles.dateLabel, { color: palette.textMuted }]}>
                PLAYED AT
              </ThemedText>
              <ThemedText style={[styles.dateValue, { color: palette.textInverse }]}>
                {formatDate(timestamp)}
              </ThemedText>
              {hasPlayedAt ? (
                <ThemedText style={[styles.dateSecondary, { color: palette.textMuted }]}>
                  Recorded {formatDate(rawGame.createdAt)}
                </ThemedText>
              ) : null}
            </View>
            <View style={styles.dateCardTrailing}>
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
              <MaterialCommunityIcons
                name="calendar-edit"
                size={scaleBySizeClass(20, sizeClass)}
                color={palette.textMuted}
              />
            </View>
          </Pressable>
        )}

        {canSelectEitherSide && (
          <SegmentedControl
            label="STATS FOR"
            options={rawGame.sides.map((side, index) => ({
              value: side.id,
              label: side.label,
              testID: `advanced-stats-side-${side.id}`,
              activeColor: index === 0 ? palette.accent : palette.success,
            }))}
            value={perspective.sideId}
            onChange={setSelectedSideId}
          />
        )}

        <AdvancedGameNoteCard
          note={rawGame.metadata?.notes}
          onPress={() => setShowGameNote(true)}
        />

        <AdvancedStatsContent
          game={analyticsGame}
          gameId={gameId}
          myTeamName={perspective.sideName}
          opponentName={perspective.opposingSideName}
          myScore={perspective.score}
          opponentScore={perspective.opposingScore}
          perspectiveSideId={perspective.sideId}
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
      {showGameNote && (
        <AdvancedGameNoteModal
          initialNote={rawGame.metadata?.notes}
          onClose={() => setShowGameNote(false)}
          onSave={handleSaveGameNote}
        />
      )}
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    dateCardPressed: {
      opacity: 0.8,
    },
    dateCardContent: {
      flex: 1,
      gap: 4,
    },
    dateCardTrailing: {
      alignItems: 'flex-end',
      gap: 8,
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
    dateSecondary: {
      fontSize: scaleBySizeClass(12, sizeClass),
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
