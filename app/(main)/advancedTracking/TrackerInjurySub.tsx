import { TrackerLineScreen } from '@/components/advancedTracking/TrackerLineScreen';
import {
  getActiveStoppage,
  getEffectiveLineParticipantIds,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import { getCurrentPoint, getCurrentPossession } from '@/lib/advancedTracking/trackingUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Redirect, router, Stack } from 'expo-router';
import React from 'react';

export default function TrackerInjurySubScreen() {
  const { currentGameId, savedGames, recordStoppage, recordSub, undoLastOperation } =
    useAdvancedTrackingStore();
  const game = savedGames.find((g) => g.id === currentGameId);
  const point = game ? getCurrentPoint(game) : null;
  const possession = game ? getCurrentPossession(game) : null;
  const existingStoppage = getActiveStoppage(possession);
  const isEdit = existingStoppage?.reason === 'injury';

  if (!currentGameId || !game || !point) {
    return <Redirect href="/Dashboard" />;
  }

  const sideId = game.focusSideId;
  const effectiveLine = getEffectiveLineParticipantIds(point, sideId);

  const handleConfirm = (nextIds: string[]) => {
    const inIds = nextIds.filter((id) => !effectiveLine.includes(id));
    const outIds = effectiveLine.filter((id) => !nextIds.includes(id));

    if (isEdit) {
      undoLastOperation(); // undo previous sub
      recordSub({ stoppageActionId: existingStoppage!.id, sideId, inIds, outIds });
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
        participants={game.participants}
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
