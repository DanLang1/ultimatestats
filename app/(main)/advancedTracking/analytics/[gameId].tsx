import AdvancedStatsContent from '@/components/advancedTracking/AdvancedStatsContent';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { buildAnalyticsGame, getFinalScores } from '@/lib/advancedTracking/buildAnalyticsGame';
import { formatDate } from '@/lib/statsUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

export default function AdvancedGameStatsScreen() {
  const { gameId } = useLocalSearchParams<{ gameId?: string }>();
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const { showAlert } = useAlert();
  const { savedGames, deleteSavedGame } = useAdvancedTrackingStore();

  const rawGame = gameId ? (savedGames.find((g) => g.id === gameId) ?? null) : null;

  const analyticsGame = rawGame ? buildAnalyticsGame(rawGame) : null;

  if (!gameId || !rawGame || !analyticsGame) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader
          title="ADVANCED GAME"
          onBack={() => router.back()}
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
            router.back();
          },
        },
      ],
    });
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="ADVANCED GAME"
        onBack={() => router.back()}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        centerTitleInLandscape={false}
        rightSlot={
          <View style={styles.headerActions}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/advancedTracking/analytics/timeline/[gameId]',
                  params: { gameId },
                })
              }
              style={[styles.headerButton, { backgroundColor: palette.overlay05 }]}
              hitSlop={8}>
              <MaterialCommunityIcons
                name="timeline-outline"
                size={scaleBySizeClass(20, sizeClass)}
                color={palette.accent}
              />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              style={[styles.headerButton, { backgroundColor: palette.overlay05 }]}
              hitSlop={8}>
              <MaterialCommunityIcons
                name="delete-outline"
                size={scaleBySizeClass(20, sizeClass)}
                color={palette.danger}
              />
            </Pressable>
          </View>
        }
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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerButton: {
      width: scaleBySizeClass(36, sizeClass),
      height: scaleBySizeClass(36, sizeClass),
      borderRadius: scaleBySizeClass(18, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
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
