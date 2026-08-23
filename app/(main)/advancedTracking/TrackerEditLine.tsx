import { Redirect, router, Stack } from 'expo-router';

import { AdvancedActiveLineCorrectionScreen } from '@/components/advancedTracking/AdvancedActiveLineCorrectionScreen';
import { useLiveRosterParticipants } from '@/hooks/advancedTracking/useLiveRosterParticipants';
import { getActiveSideId, getActiveStoppage } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { areBothSidesFullyTracked } from '@/lib/advancedTracking/trackingModeUtils';
import {
  getCurrentPoint,
  getCurrentPossession,
  hasPointEnded,
} from '@/lib/advancedTracking/trackingUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';

export default function TrackerEditLineScreen() {
  const currentGameId = useAdvancedTrackingStore((state) => state.currentGameId);
  const game = useAdvancedTrackingStore((state) => state.currentGame);
  const correctCurrentGamePointActiveLines = useAdvancedTrackingStore(
    (state) => state.correctCurrentGamePointActiveLines,
  );
  const participants = useLiveRosterParticipants(game?.participants ?? []);
  const point = game ? getCurrentPoint(game) : null;
  const possession = game ? getCurrentPossession(game) : null;

  if (!currentGameId || !game || !point) {
    return <Redirect href="/Dashboard" />;
  }
  if (hasPointEnded(point) || getActiveStoppage(possession) != null) {
    return <Redirect href="/advancedTracking/Tracker" />;
  }

  const preferredFirstSideId = areBothSidesFullyTracked(game)
    ? getActiveSideId(possession, game)
    : game.focusSideId;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AdvancedActiveLineCorrectionScreen
        game={game}
        point={point}
        availableParticipants={participants}
        preferredFirstSideId={preferredFirstSideId}
        boundary="current"
        destinationLabel="tracker"
        onBack={() => router.back()}
        onSave={correctCurrentGamePointActiveLines}
      />
    </>
  );
}
