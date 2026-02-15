import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ShareConfirmModal } from '@/components/ui/ShareConfirmModal';
import StatsContent from '@/components/view-stats/StatsContent';
import { useTheme } from '@/context/ThemeContext';
import { useLayout } from '@/hooks/useLayout';
import { resolveTeamName } from '@/lib/playerUtils';
import { serializeGame, uploadPayload } from '@/lib/sharing';
import { formatDate, generateSavedGameCSV } from '@/lib/statsUtils';
import { useGameStore } from '@/store/gameStore';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { File, Paths } from 'expo-file-system';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SavedGameStatsScreen() {
  const { gameId } = useLocalSearchParams<{ gameId?: string }>();
  const { showAlert } = useAlert();
  const { palette } = useTheme();
  const { isLandscape } = useLayout();
  const insets = useSafeAreaInsets();
  const styles = createStyles(isLandscape);
  const { savedGames, savedTeams, loadSavedGames } = useGameStore();
  const [isHeaderMenuVisible, setIsHeaderMenuVisible] = useState(false);
  const [pendingShareAction, setPendingShareAction] = useState<(() => Promise<string>) | null>(
    null,
  );

  useEffect(() => {
    loadSavedGames();
  }, [loadSavedGames]);

  const selectedGame = gameId ? (savedGames.find((game) => game.id === gameId) ?? null) : null;
  const hasMissingParam = !gameId;
  const gameTeamName = selectedGame
    ? resolveTeamName(selectedGame.team1.id, selectedGame.team1.name, savedTeams)
    : null;

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

  const headerActions: {
    key: 'timeline' | 'share' | 'csv';
    label: string;
    onPress: () => void;
  }[] = [
    { key: 'timeline', label: 'Timeline', onPress: handleOpenTimeline },
    { key: 'share', label: 'Share', onPress: handleShareGame },
    { key: 'csv', label: 'Export CSV', onPress: handleExportCSV },
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
        rightSlot={
          isLandscape ? (
            <View style={styles.headerRight}>
              <Pressable
                onPress={handleOpenTimeline}
                style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
                hitSlop={12}
                disabled={!selectedGame}>
                <MaterialCommunityIcons
                  name="chart-timeline-variant"
                  size={24}
                  color={selectedGame ? palette.accent : palette.textMuted}
                />
              </Pressable>
              <Pressable
                onPress={handleShareGame}
                style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
                hitSlop={12}
                disabled={!selectedGame}>
                <MaterialCommunityIcons
                  name="share-variant"
                  size={20}
                  color={selectedGame ? palette.accent : palette.textMuted}
                />
              </Pressable>
              <Pressable
                onPress={handleExportCSV}
                style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
                hitSlop={12}
                disabled={!selectedGame}>
                <FontAwesome6
                  name="file-csv"
                  size={20}
                  color={selectedGame ? palette.accent : palette.textMuted}
                />
              </Pressable>
            </View>
          ) : (
            <View style={styles.headerRightPortrait}>
              <Pressable
                onPress={() => setIsHeaderMenuVisible(true)}
                style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
                hitSlop={12}
                disabled={!selectedGame}>
                <MaterialCommunityIcons
                  name="dots-horizontal"
                  size={22}
                  color={selectedGame ? palette.accent : palette.textMuted}
                />
              </Pressable>
            </View>
          )
        }
      />

      <Modal
        visible={isHeaderMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsHeaderMenuVisible(false)}>
        <View style={StyleSheet.absoluteFill}>
          <Pressable
            style={[styles.menuOverlay, { backgroundColor: palette.overlayDark40 }]}
            onPress={() => setIsHeaderMenuVisible(false)}
          />
          <View
            style={[
              styles.menuSheet,
              {
                backgroundColor: palette.modalBg,
                borderColor: palette.overlay15,
                bottom: Math.max(insets.bottom, 12),
              },
            ]}>
            {headerActions.map((action) => (
              <Pressable
                key={action.key}
                style={({ pressed }) => [styles.menuActionRow, pressed && styles.buttonPressed]}
                onPress={() => {
                  setIsHeaderMenuVisible(false);
                  action.onPress();
                }}>
                {action.key === 'csv' ? (
                  <FontAwesome6 name="file-csv" size={18} color={palette.accent} />
                ) : (
                  <MaterialCommunityIcons
                    name={action.key === 'timeline' ? 'chart-timeline-variant' : 'share-variant'}
                    size={20}
                    color={palette.accent}
                  />
                )}
                <Text style={[styles.menuActionText, { color: palette.modalText }]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={({ pressed }) => [
                styles.menuCancelButton,
                { backgroundColor: palette.overlay10 },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => setIsHeaderMenuVisible(false)}>
              <Text style={[styles.menuCancelText, { color: palette.modalText }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {hasMissingParam || !selectedGame ? (
        <View style={styles.centeredState}>
          <MaterialCommunityIcons name="alert-circle-outline" size={42} color={palette.textMuted} />
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
            games={[selectedGame]}
            pointLines={selectedGame.pointLines}
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

function createStyles(isLandscape: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    backButton: {
      padding: 8,
      borderRadius: 20,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerRightPortrait: {
      minWidth: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
    },
    menuOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    menuSheet: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 24,
      borderRadius: 14,
      borderWidth: 1,
      padding: 12,
      gap: 6,
    },
    menuActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    menuActionText: {
      fontSize: 15,
      fontWeight: '600',
    },
    menuCancelButton: {
      marginTop: 6,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    menuCancelText: {
      fontSize: 14,
      fontWeight: '600',
    },
    buttonPressed: {
      opacity: 0.8,
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
      fontSize: 15,
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
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
