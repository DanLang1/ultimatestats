import { TrackerLineScreen } from '@/components/advancedTracking/TrackerLineScreen';
import { getCurrentPoint } from '@/lib/advancedTracking/trackingUtils';
import { getSequenceNumber } from '@/lib/genderRatioUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Redirect, router, Stack } from 'expo-router';
import React from 'react';

export default function TrackerEditLineScreen() {
  const { currentGameId, currentGame: game, correctPointLine } = useAdvancedTrackingStore();
  const point = game ? getCurrentPoint(game) : null;

  if (!currentGameId || !game || !point) {
    return <Redirect href="/Dashboard" />;
  }

  const sideId = game.focusSideId;
  const baseLine = point.lines.find((l) => l.sideId === sideId)?.participantIds ?? [];
  const sideSubs = point.subs?.filter((s) => s.sideId === sideId) ?? [];
  const pointNumber = game.points.findIndex((p) => p.id === point.id) + 1;
  const sequenceNumber = point.genderRatio != null ? getSequenceNumber(pointNumber) : undefined;

  let warningText: string | undefined;
  if (sideSubs.length > 0) {
    const allIds = new Set<string>();
    for (const sub of sideSubs) {
      for (const id of sub.inIds) allIds.add(id);
      for (const id of sub.outIds) allIds.add(id);
    }
    const names = [...allIds]
      .map((id) => game.participants.find((p) => p.id === id)?.name ?? 'Unknown')
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
        participants={game.participants}
        initialSelectedIds={baseLine}
        title="Edit Line"
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
