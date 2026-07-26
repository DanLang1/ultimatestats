import { Redirect, router, Stack } from 'expo-router';
import React from 'react';

import { TrackerLineScreen } from '@/components/advancedTracking/TrackerLineScreen';
import { useLiveRosterParticipants } from '@/hooks/advancedTracking/useLiveRosterParticipants';
import { getActiveSideId } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { areBothSidesFullyTracked } from '@/lib/advancedTracking/trackingModeUtils';
import { getCurrentPoint, getCurrentPossession } from '@/lib/advancedTracking/trackingUtils';
import { getSequenceNumber } from '@/lib/genderRatioUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';

export default function TrackerEditLineScreen() {
  const { currentGameId, currentGame: game, correctPointLine } = useAdvancedTrackingStore();
  const participants = useLiveRosterParticipants(game?.participants ?? []);
  const point = game ? getCurrentPoint(game) : null;
  const possession = game ? getCurrentPossession(game) : null;

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
  const baseLine = point.lines.find((l) => l.sideId === sideId)?.participantIds ?? [];
  const sideSubs = point.subs?.filter((s) => s.sideId === sideId) ?? [];
  const pointNumber = game.points.findIndex((p) => p.id === point.id) + 1;
  const sequenceNumber = point.genderRatio != null ? getSequenceNumber(pointNumber) : undefined;
  const sideLabel = game.sides.find((side) => side.id === sideId)?.label ?? '';
  const editLineTitle = tracksBothSides ? `Edit ${sideLabel} Line` : 'Edit Line';

  let warningText: string | undefined;
  if (sideSubs.length > 0) {
    const allIds = new Set<string>();
    for (const sub of sideSubs) {
      for (const id of sub.inIds) allIds.add(id);
      for (const id of sub.outIds) allIds.add(id);
    }
    const names = [...allIds]
      .map((id) => participants.find((p) => p.id === id)?.name ?? 'Unknown')
      .join(', ');
    warningText =
      sideSubs.length === 1
        ? `Saving will clear 1 injury sub involving ${names} and replace the starting line.`
        : `Saving will clear ${sideSubs.length} injury subs involving ${names} and replace the starting line.`;
  }

  const handleConfirm = (nextIds: string[]) => {
    correctPointLine({ sideId, participantIds: nextIds });
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <TrackerLineScreen
        participants={selectableParticipants}
        initialSelectedIds={baseLine}
        title={editLineTitle}
        confirmLabel="SAVE LINE"
        expectedRatio={point.genderRatio}
        sequenceNumber={sequenceNumber}
        requireChanges
        warningText={warningText}
        onBack={() => router.back()}
        onConfirm={handleConfirm}
      />
    </>
  );
}
