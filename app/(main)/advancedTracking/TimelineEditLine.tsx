import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { TrackerLineContinuationMenu } from '@/components/advancedTracking/TrackerLineContinuationMenu';
import { TrackerLineScreen } from '@/components/advancedTracking/TrackerLineScreen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import { useTheme } from '@/context/ThemeContext';
import { useAdvancedGame } from '@/hooks/advancedTracking/useAdvancedGameQueries';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  areBothSidesFullyTracked,
  supportsTimelineLineCorrection,
} from '@/lib/advancedTracking/trackingModeUtils';
import {
  getParticipantIdsUsedBySide,
  getScrimmageLineSelectionGroups,
  getPointActionParticipantIds,
  getOtherSideId,
  hasPointEnded,
  haveSameParticipantIds,
} from '@/lib/advancedTracking/trackingUtils';
import { getSequenceNumber } from '@/lib/genderRatioUtils';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';

export default function TimelineEditLineScreen() {
  const { gameId, pointId } = useLocalSearchParams<{ gameId?: string; pointId?: string }>();
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { showAlert } = useAlert();
  const { data: savedGame, isLoading } = useAdvancedGame(gameId!);
  const currentGameId = useAdvancedTrackingStore((state) => state.currentGameId);
  const currentGame = useAdvancedTrackingStore((state) => state.currentGame);
  const correctCurrentPointLines = useAdvancedTrackingStore(
    (state) => state.correctCurrentPointLines,
  );
  const correctSavedPointLines = useSavedAdvancedGamesStore((state) => state.correctPointLines);
  const [sideIndex, setSideIndex] = useState(0);
  const [draftLinesBySide, setDraftLinesBySide] = useState<Record<string, string[]>>({});
  const [showContinuationMenu, setShowContinuationMenu] = useState(false);

  if (gameId == null || pointId == null) {
    return <Redirect href="/Dashboard" />;
  }

  const isCurrentGame = currentGameId === gameId && currentGame?.id === gameId;
  const game = isCurrentGame ? currentGame : savedGame;

  if (isLoading || game == null) {
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

  if (!point || !hasPointEnded(point) || !supportsTimelineLineCorrection(game)) {
    return (
      <Redirect
        href={{
          pathname: '/advancedTracking/analytics/timeline/[gameId]',
          params: { gameId },
        }}
      />
    );
  }

  const tracksBothSides = game.gameType === 'scrimmage' && areBothSidesFullyTracked(game);
  const selectedSideIds = tracksBothSides
    ? [game.focusSideId, getOtherSideId(game, game.focusSideId)]
    : [game.focusSideId];
  const sideId = selectedSideIds[sideIndex];
  const sideLabel = game.sides.find((side) => side.id === sideId)?.label ?? 'Side';
  const otherSideId = tracksBothSides ? selectedSideIds[1] : null;
  const otherSideLabel = game.sides.find((side) => side.id === otherSideId)?.label ?? 'other side';
  const otherSide = game.sides.find((side) => side.id !== sideId);
  const unavailableParticipantIds = new Set([
    ...(otherSide == null ? [] : getParticipantIdsUsedBySide(point, otherSide.id)),
    ...(otherSide == null ? [] : (draftLinesBySide[otherSide.id] ?? [])),
  ]);
  const eligibleParticipants = tracksBothSides
    ? game.participants.filter((participant) => !unavailableParticipantIds.has(participant.id))
    : game.participants;
  const { defaultParticipants, otherSideLabels } = getScrimmageLineSelectionGroups(
    game,
    sideId,
    eligibleParticipants,
  );
  const baseLine = point.lines.find((line) => line.sideId === sideId)?.participantIds ?? [];
  const pointNumber = game.points.findIndex((candidate) => candidate.id === point.id) + 1;
  const sequenceNumber = point.genderRatio != null ? getSequenceNumber(pointNumber) : undefined;
  const initialSelectedIds = draftLinesBySide[sideId] ?? baseLine;
  const actionParticipantIds = new Set(getPointActionParticipantIds(point));
  const lockedParticipantIds = baseLine.filter((participantId) =>
    actionParticipantIds.has(participantId),
  );

  const buildCorrectedLines = (linesBySide: Record<string, string[]>) =>
    selectedSideIds
      .map((selectedSideId) => ({
        sideId: selectedSideId,
        participantIds:
          linesBySide[selectedSideId] ??
          point.lines.find((line) => line.sideId === selectedSideId)?.participantIds ??
          [],
      }))
      .filter((line) => {
        const currentIds =
          point.lines.find((currentLine) => currentLine.sideId === line.sideId)?.participantIds ??
          [];
        return !haveSameParticipantIds(line.participantIds, currentIds);
      });

  const saveChanges = async (linesBySide: Record<string, string[]>) => {
    const correctedLines = buildCorrectedLines(linesBySide);
    if (correctedLines.length === 0) {
      router.back();
      return;
    }

    try {
      if (isCurrentGame) {
        await correctCurrentPointLines({ pointId: point.id, lines: correctedLines });
      } else {
        await correctSavedPointLines(game.id, { pointId: point.id, lines: correctedLines });
      }
      router.back();
    } catch (error) {
      showAlert({
        title: 'Unable to correct lineup',
        message: error instanceof Error ? error.message : 'The corrected lines are invalid.',
      });
    }
  };

  const handleConfirm = async (nextIds: string[]) => {
    const nextDraftLines = { ...draftLinesBySide, [sideId]: nextIds };
    setDraftLinesBySide(nextDraftLines);

    if (tracksBothSides && sideIndex === 0) {
      const currentIds =
        point.lines.find((currentLine) => currentLine.sideId === sideId)?.participantIds ?? [];
      const lineChanged = !haveSameParticipantIds(nextIds, currentIds);
      if (!lineChanged) {
        setSideIndex(1);
        return;
      }

      setShowContinuationMenu(true);
      return;
    }

    await saveChanges(nextDraftLines);
  };

  const handleBack = () => {
    if (sideIndex > 0) {
      setSideIndex(sideIndex - 1);
      return;
    }
    router.back();
  };

  const handleLockedParticipantPress = (participantId: string) => {
    const participantName =
      game.participants.find((participant) => participant.id === participantId)?.name ??
      'This player';
    showAlert({
      title: 'Player locked',
      message: `${participantName} has recorded an action this point and cannot be removed from the lineup.`,
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <TrackerLineScreen
        key={sideId}
        participants={defaultParticipants}
        allParticipants={game.gameType === 'scrimmage' ? eligibleParticipants : undefined}
        rosterParticipants={game.participants}
        playerStatusLabels={otherSideLabels}
        initialSelectedIds={initialSelectedIds}
        title={tracksBothSides ? `Edit ${sideLabel} Line` : 'Edit Line'}
        confirmLabel={tracksBothSides && sideIndex === 0 ? 'CONTINUE' : 'SAVE LINE'}
        expectedRatio={point.genderRatio}
        sequenceNumber={sequenceNumber}
        requireChanges={!tracksBothSides}
        participantLock={{
          lockedIds: lockedParticipantIds,
          onPress: handleLockedParticipantPress,
        }}
        onBack={handleBack}
        onConfirm={handleConfirm}
      />
      <TrackerLineContinuationMenu
        visible={showContinuationMenu}
        kind="line-correction"
        destinationLabel="timeline"
        currentSideLabel={sideLabel}
        otherSideLabel={otherSideLabel}
        onClose={() => setShowContinuationMenu(false)}
        onFinish={() => {
          setShowContinuationMenu(false);
          void saveChanges(draftLinesBySide);
        }}
        onEditOtherSide={() => {
          setShowContinuationMenu(false);
          setSideIndex(1);
        }}
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
