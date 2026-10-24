import { Redirect, router, Stack } from 'expo-router';

import { AdvancedActiveLineCorrectionScreen } from '@/components/advancedTracking/AdvancedActiveLineCorrectionScreen';
import { useLiveRosterParticipants } from '@/hooks/advancedTracking/useLiveRosterParticipants';
import { getLivePlayState } from '@/lib/advancedTracking/livePlayState';
import { canChangeLine } from '@/lib/advancedTracking/trackerCommands';
import { areBothSidesFullyTracked } from '@/lib/advancedTracking/trackingModeUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';

export default function TrackerEditLineScreen() {
  const currentGameId = useAdvancedTrackingStore((state) => state.currentGameId);
  const game = useAdvancedTrackingStore((state) => state.currentGame);
  const correctCurrentGamePointActiveLines = useAdvancedTrackingStore(
    (state) => state.correctCurrentGamePointActiveLines,
  );
  const participants = useLiveRosterParticipants(game?.participants ?? []);

  if (!currentGameId || !game) {
    return <Redirect href="/dashboard" />;
  }
  const { point, activeSideId } = getLivePlayState(game);
  if (!point) {
    return <Redirect href="/dashboard" />;
  }
  if (!canChangeLine(game).ok) {
    return <Redirect href="/advanced-tracking/tracker" />;
  }

  const preferredFirstSideId = areBothSidesFullyTracked(game) ? activeSideId : game.focusSideId;

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
