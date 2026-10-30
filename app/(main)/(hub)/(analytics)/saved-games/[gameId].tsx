import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
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
import { formatDate, generateSavedGameCSV } from '@/lib/basic/statsUtils';
import { MIN_PLAYED_AT_YEAR } from '@/lib/constants';
import { resolveTeamName } from '@/lib/playerUtils';
import { getGameDisplayTimestamp } from '@/lib/savedGameUtils';
import { shareCsvExport } from '@/lib/shareCsvExport';
import { serializeGame, uploadPayload } from '@/lib/sharing';
import {
  runPendingShareAction,
  SHARE_DATA_UPLOAD_ERROR_MESSAGE,
} from '@/lib/sharing/shareActionUtils';
import { useGameStore } from '@/store/basic/gameStore';
import { useTournamentStore } from '@/store/tournamentStore';
import { Fonts } from '@/theme/theme';

const MIN_PLAYED_AT_DATE = new Date(MIN_PLAYED_AT_YEAR, 0, 1);

export default function SavedGameStatsScreen() {
  const { gameId } = useLocalSearchParams<{ gameId?: string }>();
  const { showAlert } = useAlert();
  const { palette, themeMode } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const { savedGames, savedTeams, updateSavedGamePlayedAt, deleteSavedGame } = useGameStore();
  const removeGameFromTournament = useTournamentStore((state) => state.removeGameFromTournament);
  const [pendingShareAction, setPendingShareAction] = useState<(() => Promise<string>) | null>(
    null,
  );
  // Upper bound for the iOS picker; the change handler still rejects future dates.
  const [latestPlayedAtDate] = useState(() => new Date());

  const selectedGame = gameId ? (savedGames.find((game) => game.id === gameId) ?? null) : null;

  const hasMissingParam = !gameId;
  const gameTeamName = selectedGame
    ? resolveTeamName(selectedGame.team1.id, selectedGame.team1.name, savedTeams)
    : null;
  const actionIconColor = selectedGame ? palette.accent : palette.textMuted;

  const handleExportCSV = async () => {
    if (!selectedGame || !gameTeamName) return;

    const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '_');
    const dateText = formatDate(getGameDisplayTimestamp(selectedGame)).replace(
      /[^a-zA-Z0-9]/g,
      '_',
    );
    const filename = `${sanitize(gameTeamName)}_vs_${sanitize(selectedGame.team2Name)}_${dateText}`;

    await shareCsvExport(() => ({ csv: generateSavedGameCSV(selectedGame), filename }), showAlert);
  };

  const handleShareGame = () => {
    if (!selectedGame) return;

    setPendingShareAction(() => async () => {
      const payload = serializeGame(selectedGame);
      const { url } = await uploadPayload(payload);
      return url;
    });
  };

  const handleConfirmShare = () => runPendingShareAction(pendingShareAction);

  const handleCancelShare = () => {
    setPendingShareAction(null);
  };

  const handleGoToSavedGames = () => {
    router.dismissTo('/stats');
  };

  const handleOpenTimeline = () => {
    if (!selectedGame) return;
    router.push({
      pathname: '/game-timeline',
      params: { gameId: selectedGame.id },
    });
  };

  const handleDateChange = async (_event: DateTimePickerChangeEvent, selectedValue: Date) => {
    if (!selectedGame) return;
    // oxlint-disable-next-line react/purity -- false positive: runs in an event handler, not render (oxc-project/oxc#27309, fixed after oxlint 1.90). Remove on the next oxlint upgrade.
    const now = new Date();
    if (selectedValue.getTime() > now.getTime()) return;
    await updateSavedGamePlayedAt(selectedGame.id, selectedValue.getTime());
  };

  const handleDeleteGame = () => {
    if (!selectedGame) return;
    showAlert({
      title: 'Delete Game?',
      message: 'Are you sure you want to delete this saved game?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSavedGame(selectedGame.id);
            await removeGameFromTournament('basic', selectedGame.id);
            router.dismissTo('/stats');
          },
        },
      ],
    });
  };

  const handleOpenAndroidDatePicker = () => {
    if (!selectedGame) return;
    // oxlint-disable-next-line react/purity -- false positive: runs in an event handler, not render (oxc-project/oxc#27309, fixed after oxlint 1.90). Remove on the next oxlint upgrade.
    const now = new Date();
    DateTimePickerAndroid.open({
      value: new Date(getGameDisplayTimestamp(selectedGame)),
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
              await updateSavedGamePlayedAt(selectedGame.id, finalDate.getTime());
            }
          },
        });
      },
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
        <MaterialCommunityIcons
          name="file-delimited-outline"
          size={scaleBySizeClass(20, sizeClass)}
          color={actionIconColor}
        />
      ),
      menuIcon: (
        <MaterialCommunityIcons
          name="file-delimited-outline"
          size={scaleBySizeClass(18, sizeClass)}
          color={actionIconColor}
        />
      ),
    },
    {
      key: 'delete',
      label: 'Delete',
      onPress: handleDeleteGame,
      disabled: !selectedGame,
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
          <ThemedText style={[styles.stateText, { color: palette.textMuted }]}>
            {hasMissingParam ? 'Missing game link.' : 'Saved game not found.'}
          </ThemedText>
          <Pressable
            onPress={handleGoToSavedGames}
            style={[styles.recoverButton, { backgroundColor: palette.overlay10 }]}>
            <ThemedText style={[styles.recoverButtonText, { color: palette.accent }]}>
              Go to Saved Games
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {selectedGame ? (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}>
          {Platform.OS === 'ios' ? (
            <View
              style={[
                styles.dateCard,
                { backgroundColor: palette.statsCardBg, borderColor: palette.overlay10 },
              ]}>
              <View style={styles.dateCardContent}>
                <ThemedText style={[styles.dateLabel, { color: palette.textMuted }]}>
                  PLAYED AT
                </ThemedText>
                <DateTimePicker
                  value={new Date(getGameDisplayTimestamp(selectedGame))}
                  mode="datetime"
                  display="compact"
                  maximumDate={latestPlayedAtDate}
                  minimumDate={MIN_PLAYED_AT_DATE}
                  onValueChange={handleDateChange}
                  themeVariant={themeMode}
                  accentColor={palette.accent}
                />
                {selectedGame.playedAt ? (
                  <ThemedText style={[styles.dateSecondary, { color: palette.textMuted }]}>
                    Recorded {formatDate(selectedGame.createdAt)}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.dateCard,
                { backgroundColor: palette.statsCardBg, borderColor: palette.overlay10 },
                pressed && styles.dateCardPressed,
              ]}
              onPress={handleOpenAndroidDatePicker}>
              <View style={styles.dateCardContent}>
                <ThemedText style={[styles.dateLabel, { color: palette.textMuted }]}>
                  PLAYED AT
                </ThemedText>
                <ThemedText style={[styles.dateValue, { color: palette.textInverse }]}>
                  {formatDate(getGameDisplayTimestamp(selectedGame))}
                </ThemedText>
                {selectedGame.playedAt ? (
                  <ThemedText style={[styles.dateSecondary, { color: palette.textMuted }]}>
                    Recorded {formatDate(selectedGame.createdAt)}
                  </ThemedText>
                ) : null}
              </View>
              <MaterialCommunityIcons
                name="calendar-edit"
                size={scaleBySizeClass(20, sizeClass)}
                color={palette.textMuted}
              />
            </Pressable>
          )}
          <StatsContent
            team1Name={gameTeamName ?? selectedGame.team1.name}
            team2Name={selectedGame.team2Name}
            team1Score={selectedGame.team1Score}
            team2Score={selectedGame.team2Score}
            events={selectedGame.events}
            roster={selectedGame.team1.roster}
            routeScope="saved"
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
      lineHeight: scaleBySizeClass(16, sizeClass),
    },
  });
}
