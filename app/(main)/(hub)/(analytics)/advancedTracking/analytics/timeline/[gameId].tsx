import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AdvancedGoalScorerModal } from '@/components/advancedTracking/AdvancedGoalScorerModal';
import AdvancedEventTimeline from '@/components/advancedTracking/timeline/AdvancedEventTimeline';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { useAdvancedGame } from '@/hooks/advancedTracking/useAdvancedGameQueries';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  type AdvancedActionLocator,
  getCorrectableAdvancedGoalContexts,
} from '@/lib/advancedTracking/advancedActionCorrectionUtils';
import { buildAdvancedTimeline } from '@/lib/advancedTracking/advancedTimelineUtils';
import { supportsTimelineLineCorrection } from '@/lib/advancedTracking/trackingModeUtils';
import { hasPointEnded } from '@/lib/advancedTracking/trackingUtils';
import { hasItems } from '@/lib/utils';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';

export default function AdvancedGameTimelineScreen() {
  const { gameId } = useLocalSearchParams<{ gameId?: string }>();
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { data: rawGame, isLoading } = useAdvancedGame(gameId!);
  const correctGoalScorer = useSavedAdvancedGamesStore((state) => state.correctGoalScorer);
  const currentGameId = useAdvancedTrackingStore((state) => state.currentGameId);
  const loadedCurrentGameId = useAdvancedTrackingStore((state) => state.currentGame?.id ?? null);
  const correctCurrentGoalScorer = useAdvancedTrackingStore(
    (state) => state.correctCurrentGoalScorer,
  );
  const [editingGoal, setEditingGoal] = useState<AdvancedActionLocator | null>(null);

  if (isLoading || !rawGame) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
            hitSlop={12}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={scaleBySizeClass(24, sizeClass)}
              color={palette.textInverse}
            />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: palette.textMuted }]}>
            TIMELINE
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>
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
            {isLoading ? 'Loading game...' : 'Game not found.'}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const timelinePoints = buildAdvancedTimeline(rawGame);
  const isCurrentInProgressGame =
    rawGame.status === 'in_progress' &&
    currentGameId === rawGame.id &&
    loadedCurrentGameId === rawGame.id;
  const correctableGoalContexts =
    rawGame.status === 'in_progress' && !isCurrentInProgressGame
      ? []
      : getCorrectableAdvancedGoalContexts(rawGame);
  const editableGoalActionIds = new Set(
    correctableGoalContexts.map((context) => context.action.id),
  );
  const editableLinePointIds = new Set(
    supportsTimelineLineCorrection(rawGame)
      ? rawGame.points.filter((point) => hasPointEnded(point)).map((point) => point.id)
      : [],
  );
  const editingGoalContext =
    editingGoal == null
      ? null
      : correctableGoalContexts.find(
          (context) =>
            context.point.id === editingGoal.pointId &&
            context.possession.id === editingGoal.possessionId &&
            context.action.id === editingGoal.actionId,
        );

  const focusSideId = rawGame.focusSideId;
  const oppSideId = rawGame.sides.find((s) => s.id !== focusSideId)?.id ?? '';
  const sideLabels = Object.fromEntries(rawGame.sides.map((s) => [s.id, s.label]));
  const focusSideLabel = sideLabels[focusSideId] ?? 'My Team';
  const oppSideLabel = sideLabels[oppSideId] ?? 'Opponent';

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
          hitSlop={12}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={scaleBySizeClass(24, sizeClass)}
            color={palette.textInverse}
          />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: palette.textMuted }]}>
          GAME TIMELINE
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.gameInfo}>
        <ThemedText style={[styles.teamNames, { color: palette.textInverse }]}>
          {focusSideLabel} vs {rawGame.metadata?.opponentName ?? oppSideLabel}
        </ThemedText>
      </View>

      {hasItems(timelinePoints) ? (
        <AdvancedEventTimeline
          points={timelinePoints}
          gameStatus={rawGame.status}
          focusSideId={focusSideId}
          oppSideId={oppSideId}
          sideLabels={sideLabels}
          editableGoalActionIds={editableGoalActionIds}
          onEditGoalScorer={setEditingGoal}
          editableLinePointIds={editableLinePointIds}
          onEditLineups={(point) => {
            router.push({
              pathname: '/advancedTracking/TimelineEditLine',
              params: { gameId: rawGame.id, pointId: point.pointId },
            });
          }}
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="timeline-outline"
            size={scaleBySizeClass(48, sizeClass)}
            color={palette.textMuted}
          />
          <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>
            No points to display
          </ThemedText>
        </View>
      )}

      {editingGoal != null && editingGoalContext != null && (
        <AdvancedGoalScorerModal
          context={editingGoalContext}
          onClose={() => setEditingGoal(null)}
          onSave={async (participantId) => {
            const input = { ...editingGoal, participantId };
            if (isCurrentInProgressGame) {
              await correctCurrentGoalScorer(input);
              return;
            }
            await correctGoalScorer(rawGame.id, input);
          }}
        />
      )}
    </ThemedView>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
    },
    backButton: {
      padding: 8,
      borderRadius: 20,
    },
    headerTitle: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(2, sizeClass, { rounding: 'none' }),
      textTransform: 'uppercase',
    },
    headerSpacer: {
      width: scaleBySizeClass(40, sizeClass),
    },
    gameInfo: {
      alignItems: 'center',
      paddingBottom: 16,
      gap: 4,
    },
    teamNames: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.semiBold,
      textAlign: 'center',
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
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
  });
}
