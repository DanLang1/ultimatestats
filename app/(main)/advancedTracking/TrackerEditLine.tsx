import { Redirect, router, Stack } from 'expo-router';
import { useState } from 'react';

import { TrackerLineContinuationMenu } from '@/components/advancedTracking/TrackerLineContinuationMenu';
import { TrackerLineScreen } from '@/components/advancedTracking/TrackerLineScreen';
import { useAlert } from '@/components/ui/AlertProvider';
import { useLiveRosterParticipants } from '@/hooks/advancedTracking/useLiveRosterParticipants';
import { getActiveSideId } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { areBothSidesFullyTracked } from '@/lib/advancedTracking/trackingModeUtils';
import {
  getCurrentPoint,
  getCurrentPossession,
  getOtherSideId,
  getParticipantIdsUsedBySide,
  getPointActionParticipantIds,
  getScrimmageLineSelectionGroups,
  haveSameParticipantIds,
} from '@/lib/advancedTracking/trackingUtils';
import { getSequenceNumber } from '@/lib/genderRatioUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';

export default function TrackerEditLineScreen() {
  const { currentGameId, currentGame: game, correctPointLines } = useAdvancedTrackingStore();
  const { showAlert } = useAlert();
  const [sideIndex, setSideIndex] = useState(0);
  const [draftLinesBySide, setDraftLinesBySide] = useState<Record<string, string[]>>({});
  const [showContinuationMenu, setShowContinuationMenu] = useState(false);
  const participants = useLiveRosterParticipants(game?.participants ?? []);
  const point = game ? getCurrentPoint(game) : null;
  const possession = game ? getCurrentPossession(game) : null;

  if (!currentGameId || !game || !point) {
    return <Redirect href="/Dashboard" />;
  }

  const tracksBothSides = areBothSidesFullyTracked(game);
  const isScrimmage = game.gameType === 'scrimmage';
  const firstSideId = tracksBothSides ? getActiveSideId(possession, game) : game.focusSideId;
  const selectedSideIds = tracksBothSides
    ? [firstSideId, getOtherSideId(game, firstSideId)]
    : [firstSideId];
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
    ? participants.filter((participant) => !unavailableParticipantIds.has(participant.id))
    : participants;
  const { defaultParticipants, otherSideLabels } = getScrimmageLineSelectionGroups(
    game,
    sideId,
    eligibleParticipants,
  );
  const baseLine = point.lines.find((l) => l.sideId === sideId)?.participantIds ?? [];
  const pointNumber = game.points.findIndex((p) => p.id === point.id) + 1;
  const sequenceNumber = point.genderRatio != null ? getSequenceNumber(pointNumber) : undefined;
  const editLineTitle = tracksBothSides ? `Edit ${sideLabel} Line` : 'Edit Line';
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

  const saveChanges = (linesBySide: Record<string, string[]>) => {
    const correctedLines = buildCorrectedLines(linesBySide);
    if (correctedLines.length === 0) {
      router.back();
      return;
    }

    try {
      correctPointLines({ lines: correctedLines });
      router.back();
    } catch (error) {
      showAlert({
        title: 'Unable to correct lineup',
        message: error instanceof Error ? error.message : 'The corrected lines are invalid.',
      });
    }
  };

  const handleConfirm = (nextIds: string[]) => {
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

    saveChanges(nextDraftLines);
  };

  const handleBack = () => {
    if (sideIndex > 0) {
      setSideIndex(sideIndex - 1);
      return;
    }
    router.back();
  };

  const confirmLabel = tracksBothSides && sideIndex === 0 ? 'CONTINUE' : 'SAVE LINE';
  const handleLockedParticipantPress = (participantId: string) => {
    const participantName =
      game.participants.find((participant) => participant.id === participantId)?.name ??
      'This player';
    showAlert({
      title: 'Player locked',
      message: `${participantName} has recorded an action this point. Undo or edit that action before removing them from the lineup.`,
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <TrackerLineScreen
        key={sideId}
        participants={defaultParticipants}
        allParticipants={isScrimmage ? eligibleParticipants : undefined}
        rosterParticipants={participants}
        playerStatusLabels={otherSideLabels}
        initialSelectedIds={initialSelectedIds}
        title={editLineTitle}
        confirmLabel={confirmLabel}
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
        currentSideLabel={sideLabel}
        otherSideLabel={otherSideLabel}
        onClose={() => setShowContinuationMenu(false)}
        onFinish={() => {
          setShowContinuationMenu(false);
          saveChanges(draftLinesBySide);
        }}
        onEditOtherSide={() => {
          setShowContinuationMenu(false);
          setSideIndex(1);
        }}
      />
    </>
  );
}
