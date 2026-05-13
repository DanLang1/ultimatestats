import { TrackerLineScreen } from '@/components/advancedTracking/TrackerLineScreen';
import { getEffectiveLineParticipantIds } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { getCurrentPoint } from '@/lib/advancedTracking/trackingUtils';
import { getSequenceNumber } from '@/lib/genderRatioUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Redirect, router, Stack } from 'expo-router';
import React from 'react';

export default function TrackerEditLineScreen() {
  const { currentGameId, savedGames, correctPointLine } = useAdvancedTrackingStore();
  const game = savedGames.find((g) => g.id === currentGameId);
  const point = game ? getCurrentPoint(game) : null;

  if (!currentGameId || !game || !point) {
    return <Redirect href="/Dashboard" />;
  }

  const sideId = game.focusSideId;
  const effectiveLine = getEffectiveLineParticipantIds(point, sideId);
  const pointNumber = game.points.findIndex((p) => p.id === point.id) + 1;
  const sequenceNumber = point.genderRatio != null ? getSequenceNumber(pointNumber) : undefined;

  const handleConfirm = (nextIds: string[]) => {
    correctPointLine({ sideId, participantIds: nextIds });
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <TrackerLineScreen
        participants={game.participants}
        initialSelectedIds={effectiveLine}
        title="Edit Line"
        confirmLabel="SAVE LINE"
        expectedRatio={point.genderRatio}
        sequenceNumber={sequenceNumber}
        requireChanges
        onBack={() => router.back()}
        onConfirm={handleConfirm}
      />
    </>
  );
}
