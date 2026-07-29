import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCurrentPossession } from '@/lib/advancedTracking/trackingUtils';
import {
  getMaestroSeedPlayerId,
  MAESTRO_SCRIMMAGE_BENCH_PLAYERS,
  MAESTRO_SCRIMMAGE_PLAYERS,
  MAESTRO_SEED_PLAYERS,
} from '@/lib/maestroConstants';
import { MaestroTrackerState, seedAdvancedTrackerTestGame } from '@/lib/maestroUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';

describe('seedAdvancedTrackerTestGame tracker state presets', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it.each<{
    trackerState: MaestroTrackerState;
    expectedSideId: string;
    expectedHolderId: string | null;
  }>([
    {
      trackerState: 'awaitingPickup',
      expectedSideId: 'focus-side',
      expectedHolderId: null,
    },
    {
      trackerState: 'focusPossession',
      expectedSideId: 'focus-side',
      expectedHolderId: getMaestroSeedPlayerId(MAESTRO_SEED_PLAYERS[0]),
    },
    {
      trackerState: 'opponentPossession',
      expectedSideId: 'opp-side',
      expectedHolderId: getMaestroSeedPlayerId(MAESTRO_SCRIMMAGE_PLAYERS[7]),
    },
  ])(
    'seeds $trackerState without requiring a UI interaction',
    async ({ trackerState, expectedSideId, expectedHolderId }) => {
      await seedAdvancedTrackerTestGame({
        gameType: 'scrimmage',
        trackerState,
      });

      const game = useAdvancedTrackingStore.getState().currentGame;
      expect(game).not.toBeNull();
      expect(game?.initialReceivingSideId).toBe(expectedSideId);

      const possession = getCurrentPossession(game);
      expect(possession?.sideId).toBe(expectedSideId);

      const pickup = possession?.actions.findLast((action) => action.kind === 'disc_pickup');
      if (expectedHolderId == null) {
        expect(pickup).toBeUndefined();
        return;
      }

      expect(pickup).toMatchObject({
        kind: 'disc_pickup',
        sideId: expectedSideId,
        player: {
          refType: 'participant',
          participantId: expectedHolderId,
        },
      });
    },
  );

  it('keeps scrimmage bench players off both seeded starting lines', async () => {
    await seedAdvancedTrackerTestGame({
      gameType: 'scrimmage',
      trackerState: 'focusPossession',
    });

    const game = useAdvancedTrackingStore.getState().currentGame;
    expect(game?.points[0].lines).toHaveLength(2);
    expect(game?.points[0].lines.every((line) => line.participantIds.length === 7)).toBe(true);

    const startingParticipantIds = new Set(
      game?.points[0].lines.flatMap((line) => line.participantIds),
    );
    for (const benchPlayer of MAESTRO_SCRIMMAGE_BENCH_PLAYERS) {
      expect(startingParticipantIds.has(getMaestroSeedPlayerId(benchPlayer))).toBe(false);
    }
  });
});
