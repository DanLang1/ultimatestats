import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AdvancedActiveLineCorrectionScreen } from '@/components/advancedTracking/AdvancedActiveLineCorrectionScreen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { useAdvancedGame } from '@/hooks/advancedTracking/useAdvancedGameQueries';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  canCorrectAdvancedPointFromTimeline,
  type CorrectAdvancedPointActiveLinesInput,
} from '@/lib/advancedTracking/advancedPointLineCorrectionUtils';
import { supportsTimelineLineCorrection } from '@/lib/advancedTracking/trackingModeUtils';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';

export default function TimelineEditLineScreen() {
  const { gameId, pointId } = useLocalSearchParams<{ gameId?: string; pointId?: string }>();
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { data: savedGame, isLoading } = useAdvancedGame(gameId!);
  const currentGameId = useAdvancedTrackingStore((state) => state.currentGameId);
  const currentGame = useAdvancedTrackingStore((state) => state.currentGame);
  const correctCurrentGamePointActiveLines = useAdvancedTrackingStore(
    (state) => state.correctCurrentGamePointActiveLines,
  );
  const correctSavedPointActiveLines = useSavedAdvancedGamesStore(
    (state) => state.correctPointActiveLines,
  );

  if (gameId == null || pointId == null) {
    return <Redirect href="/Dashboard" />;
  }

  const isCurrentGame = currentGameId === gameId && currentGame?.id === gameId;
  const game = isCurrentGame ? currentGame : savedGame;

  if ((!isCurrentGame && isLoading) || game == null) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centeredState}>
          <ActivityIndicator color={palette.accent} size="large" />
          <ThemedText style={[styles.stateText, { color: palette.textMuted }]}>
            Loading line editor…
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const point = game.points.find((candidate) => candidate.id === pointId);
  const hasWritableGameSource = !isCurrentGame || game.status === 'in_progress';
  if (
    point == null ||
    !hasWritableGameSource ||
    !canCorrectAdvancedPointFromTimeline(game, point) ||
    !supportsTimelineLineCorrection(game)
  ) {
    return (
      <Redirect
        href={{
          pathname: '/advancedTracking/analytics/timeline/[gameId]',
          params: { gameId },
        }}
      />
    );
  }

  const saveActiveLines = isCurrentGame
    ? correctCurrentGamePointActiveLines
    : (input: CorrectAdvancedPointActiveLinesInput) =>
        correctSavedPointActiveLines(game.id, input).then(() => undefined);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AdvancedActiveLineCorrectionScreen
        game={game}
        point={point}
        availableParticipants={game.participants}
        preferredFirstSideId={game.focusSideId}
        boundary="final"
        destinationLabel="timeline"
        onBack={() => router.back()}
        onSave={saveActiveLines}
      />
    </>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    centeredState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    stateText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
