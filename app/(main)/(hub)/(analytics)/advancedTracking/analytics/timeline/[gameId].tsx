import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AdvancedPointNoteModal } from '@/components/advancedTracking/AdvancedPointNoteModal';
import { AdvancedTouchCorrectionModal } from '@/components/advancedTracking/AdvancedTouchCorrectionModal';
import AdvancedEventTimeline from '@/components/advancedTracking/timeline/AdvancedEventTimeline';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { useAdvancedGame } from '@/hooks/advancedTracking/useAdvancedGameQueries';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { canCorrectAdvancedPointFromTimeline } from '@/lib/advancedTracking/advancedPointLineCorrectionUtils';
import {
  findTouchEditingTarget,
  getEditableTouchActionIds,
} from '@/lib/advancedTracking/advancedTimelineTouchCorrectionUtils';
import { buildAdvancedTimeline } from '@/lib/advancedTracking/advancedTimelineUtils';
import {
  type AdvancedStandaloneCorrectionContext,
  type AdvancedTouchCorrectionSegment,
  getCorrectableAdvancedTouchContexts,
} from '@/lib/advancedTracking/advancedTouchCorrectionUtils';
import { supportsTimelineLineCorrection } from '@/lib/advancedTracking/trackingModeUtils';
import { getLiveInProgressGame } from '@/lib/advancedTracking/trackingUtils';
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
  const correctTouch = useSavedAdvancedGamesStore((state) => state.correctTouch);
  const liveGame = useAdvancedTrackingStore((state) => {
    const game = getLiveInProgressGame(state);
    return game?.id === gameId ? game : null;
  });
  const correctCurrentTouch = useAdvancedTrackingStore((state) => state.correctCurrentTouch);
  const updateCurrentPointNote = useAdvancedTrackingStore((state) => state.updatePointNote);
  const updateSavedPointNote = useSavedAdvancedGamesStore((state) => state.updatePointNote);
  const [editingTouch, setEditingTouch] = useState<{
    context: AdvancedTouchCorrectionSegment | AdvancedStandaloneCorrectionContext;
    initialTouchId?: string;
  } | null>(null);
  const [editingPointNoteId, setEditingPointNoteId] = useState<string | null>(null);

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

  const game = liveGame ?? rawGame;
  const isCurrentInProgressGame = liveGame != null;
  const timelinePoints = buildAdvancedTimeline(game);
  const correctableTouchContexts =
    game.status === 'in_progress' && !isCurrentInProgressGame
      ? []
      : getCorrectableAdvancedTouchContexts(game);
  const editableTouchActionIds = getEditableTouchActionIds(correctableTouchContexts);
  const editableLinePointIds = new Set(
    supportsTimelineLineCorrection(game)
      ? game.points
          .filter((point) => canCorrectAdvancedPointFromTimeline(game, point))
          .map((point) => point.id)
      : [],
  );
  const editingPointNote = game.points.find((point) => point.id === editingPointNoteId);
  const editingTimelinePoint = timelinePoints.find(
    (point) => point.pointId === editingPointNote?.id,
  );

  const focusSideId = game.focusSideId;
  const oppSideId = game.sides.find((s) => s.id !== focusSideId)?.id ?? '';
  const sideLabels = Object.fromEntries(game.sides.map((s) => [s.id, s.label]));
  const focusSideLabel = sideLabels[focusSideId] ?? 'My Team';
  const oppSideLabel = sideLabels[oppSideId] ?? 'Opponent';
  const editingPointNoteContext =
    editingTimelinePoint?.state === 'terminated' ? 'Game ended during point' : undefined;

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
          {focusSideLabel} vs {game.metadata?.opponentName ?? oppSideLabel}
        </ThemedText>
      </View>

      {hasItems(timelinePoints) ? (
        <AdvancedEventTimeline
          points={timelinePoints}
          gameStatus={game.status}
          focusSideId={focusSideId}
          oppSideId={oppSideId}
          sideLabels={sideLabels}
          editableTouchActionIds={editableTouchActionIds}
          onEditTouch={(request) => {
            const target = findTouchEditingTarget(correctableTouchContexts, request);
            if (target == null) {
              throw new Error(`Could not resolve editable timeline action "${request.actionId}".`);
            }
            setEditingTouch(target);
          }}
          editableLinePointIds={editableLinePointIds}
          onEditLineups={(point) => {
            router.push({
              pathname: '/advancedTracking/TimelineEditLine',
              params: { gameId: game.id, pointId: point.pointId },
            });
          }}
          onEditPointNote={(point) => setEditingPointNoteId(point.pointId)}
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

      {editingTouch != null && (
        <AdvancedTouchCorrectionModal
          context={editingTouch.context}
          initialTouchId={editingTouch.initialTouchId}
          onClose={() => setEditingTouch(null)}
          onSave={async (locator, participantId) => {
            const input = { ...locator, participantId };
            if (isCurrentInProgressGame) {
              await correctCurrentTouch(input);
              return;
            }
            await correctTouch(game.id, input);
          }}
        />
      )}
      {editingPointNote != null && (
        <AdvancedPointNoteModal
          initialNote={editingPointNote.note}
          context={editingPointNoteContext}
          onClose={() => setEditingPointNoteId(null)}
          onSave={async (note) => {
            if (isCurrentInProgressGame) {
              await updateCurrentPointNote({ pointId: editingPointNote.id, note });
            } else {
              await updateSavedPointNote(game.id, editingPointNote.id, note);
            }
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
