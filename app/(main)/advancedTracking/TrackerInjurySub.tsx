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
  const { currentGameId, savedGames, recordSub } = useAdvancedTrackingStore();
  const game = savedGames.find((g) => g.id === currentGameId);
  const point = game ? getCurrentPoint(game) : null;
  const possession = game ? getCurrentPossession(game) : null;
  const activeStoppage = getActiveStoppage(possession);

  if (!currentGameId || !game || !point) {
    return <Redirect href="/Dashboard" />;
  }

  if (!activeStoppage || activeStoppage.reason !== 'injury') {
    return <Redirect href="/advancedTracking/Tracker" />;
  }

  const sideId = game.focusSideId;
  const effectiveLine = getEffectiveLineParticipantIds(point, sideId);

  const handleConfirm = (nextIds: string[]) => {
    const inIds = nextIds.filter((id) => !effectiveLine.includes(id));
    const outIds = effectiveLine.filter((id) => !nextIds.includes(id));
    if (inIds.length === 0 && outIds.length === 0) {
      router.replace('/advancedTracking/TrackerStoppage');
      return;
    }
    recordSub({ stoppageActionId: activeStoppage.id, sideId, inIds, outIds });
    router.replace('/advancedTracking/TrackerStoppage');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <TrackerLineScreen
        participants={game.participants}
        initialSelectedIds={effectiveLine}
        title="Injury Sub"
        confirmLabel="CONFIRM SUB"
        onBack={() => router.replace('/advancedTracking/TrackerStoppage')}
        onConfirm={handleConfirm}
      />
    </>
  );
}
