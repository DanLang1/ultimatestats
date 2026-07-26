import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  MaestroCapMode,
  MaestroSeedGameType,
  MaestroTrackerState,
  seedAdvancedTrackerTestGame,
  seedMaestroTeamPrerequisites,
  waitForMaestroStoresToHydrate,
} from '@/lib/maestroUtils';

interface MaestroSetupParams {
  capMode?: string;
  gameType?: string;
  mode?: string;
  trackerState?: string;
}

const MAESTRO_SETUP_HANDSHAKE_MS = 250;

export function useMaestroSetup(params: MaestroSetupParams) {
  const { capMode, gameType, mode, trackerState } = params;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!__DEV__) return undefined;

    let isCancelled = false;

    const runSetup = async () => {
      try {
        await waitForMaestroStoresToHydrate();
        const destination = await seedMaestroState({ capMode, gameType, mode, trackerState });
        if (isCancelled) return;
        router.replace(destination);
      } catch (error) {
        if (isCancelled) return;
        setErrorMessage(error instanceof Error ? error.message : 'Unknown Maestro setup error');
      }
    };

    const setupTimer = setTimeout(() => {
      void runSetup();
    }, MAESTRO_SETUP_HANDSHAKE_MS);

    return () => {
      isCancelled = true;
      clearTimeout(setupTimer);
    };
  }, [capMode, gameType, mode, trackerState]);

  return errorMessage;
}

async function seedMaestroState(
  params: MaestroSetupParams,
): Promise<'/Dashboard' | '/advancedTracking/Tracker'> {
  if (params.mode === 'team') {
    await seedMaestroTeamPrerequisites({ clearActiveGame: true });
    return '/Dashboard';
  }

  if (params.mode === 'scrimmageTeam') {
    await seedMaestroTeamPrerequisites({ clearActiveGame: true, gameType: 'scrimmage' });
    return '/Dashboard';
  }

  await seedAdvancedTrackerTestGame({
    capMode: parseCapMode(params.capMode),
    gameType: parseGameType(params.gameType),
    trackerState: parseTrackerState(params.trackerState),
  });
  return '/advancedTracking/Tracker';
}

function parseCapMode(capMode: string | undefined): MaestroCapMode {
  if (
    capMode === 'both' ||
    capMode === 'hard' ||
    capMode === 'soft' ||
    capMode === 'none' ||
    capMode === 'softActive' ||
    capMode === 'bothActive'
  ) {
    return capMode;
  }

  return 'both';
}

function parseGameType(gameType: string | undefined): MaestroSeedGameType {
  if (gameType === 'scrimmage') return 'scrimmage';
  return 'game';
}

function parseTrackerState(trackerState: string | undefined): MaestroTrackerState {
  if (
    trackerState === 'focusPossession' ||
    trackerState === 'opponentPossession' ||
    trackerState === 'awaitingPickup'
  ) {
    return trackerState;
  }

  return 'awaitingPickup';
}
