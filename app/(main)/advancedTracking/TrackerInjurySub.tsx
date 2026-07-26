import { Redirect, router, Stack } from 'expo-router';
import React from 'react';

import { TrackerLineScreen } from '@/components/advancedTracking/TrackerLineScreen';
import { useLiveRosterParticipants } from '@/hooks/advancedTracking/useLiveRosterParticipants';
import {
  getActiveStoppage,
  getActiveSideId,
  getEffectiveLineParticipantIds,
  getLineParticipantIdsBeforeSub,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import { areBothSidesFullyTracked } from '@/lib/advancedTracking/trackingModeUtils';
import { getCurrentPoint, getCurrentPossession } from '@/lib/advancedTracking/trackingUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';

export default function TrackerInjurySubScreen() {
  const {
    currentGameId,
    currentGame: game,
    recordStoppage,
    recordSub,
    updateSub,
  } = useAdvancedTrackingStore();
  const participants = useLiveRosterParticipants(game?.participants ?? []);
  const point = game ? getCurrentPoint(game) : null;
  const possession = game ? getCurrentPossession(game) : null;
  const existingStoppage = getActiveStoppage(possession);
  const isEdit = existingStoppage?.reason === 'injury';

  if (!currentGameId || !game || !point) {
    return <Redirect href="/Dashboard" />;
  }

  const tracksBothSides = areBothSidesFullyTracked(game);
  const sideId = tracksBothSides ? getActiveSideId(possession, game) : game.focusSideId;
  const otherLineParticipantIds =
    point.lines.find((line) => line.sideId !== sideId)?.participantIds ?? [];
  const selectableParticipants = tracksBothSides
    ? participants.filter((participant) => !otherLineParticipantIds.includes(participant.id))
    : participants;
  const effectiveLine = getEffectiveLineParticipantIds(point, sideId);
  const lineBeforeEditedSub =
    isEdit && existingStoppage != null
      ? getLineParticipantIdsBeforeSub(point, sideId, existingStoppage.id)
      : effectiveLine;

  const handleConfirm = (nextIds: string[]) => {
    const baselineIds = isEdit ? lineBeforeEditedSub : effectiveLine;
    const inIds = nextIds.filter((id) => !baselineIds.includes(id));
    const outIds = baselineIds.filter((id) => !nextIds.includes(id));

    if (isEdit) {
      updateSub({ stoppageActionId: existingStoppage.id, sideId, inIds, outIds });
    } else {
      const stoppageId = recordStoppage({ reason: 'injury', sideId });
      if (inIds.length > 0 || outIds.length > 0) {
        recordSub({ stoppageActionId: stoppageId, sideId, inIds, outIds });
      }
    }
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <TrackerLineScreen
        participants={selectableParticipants}
        initialSelectedIds={effectiveLine}
        title="Injury Sub"
        confirmLabel="CONFIRM SUB"
        requireChanges
        onBack={() => router.back()}
        onConfirm={handleConfirm}
      />
    </>
  );
}
