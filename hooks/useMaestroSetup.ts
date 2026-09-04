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
  bench?: string;
  capMode?: string;
  gameTo?: string;
  gameType?: string;
  mode?: string;
  rosterView?: string;
  trackerState?: string;
}

const MAESTRO_SETUP_HANDSHAKE_MS = 250;

export function useMaestroSetup(params: MaestroSetupParams) {
  const { bench, capMode, gameTo, gameType, mode, rosterView, trackerState } = params;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!__DEV__) return undefined;

    let isCancelled = false;

    const runSetup = async () => {
      try {
        await waitForMaestroStoresToHydrate();
        const destination = await seedMaestroState({
          bench,
          capMode,
          gameTo,
          gameType,
          mode,
          rosterView,
          trackerState,
        });
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
  }, [bench, capMode, gameTo, gameType, mode, rosterView, trackerState]);

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
    includeBench: params.bench === 'true',
    capMode: parseCapMode(params.capMode),
    gameTo: parseGameTo(params.gameTo),
    gameType: parseGameType(params.gameType),
    rosterView: parseRosterView(params.rosterView),
    trackerState: parseTrackerState(params.trackerState),
  });
  return '/advancedTracking/Tracker';
}

function parseGameTo(gameTo: string | undefined): number {
  const parsedGameTo = Number(gameTo);
  return Number.isInteger(parsedGameTo) && parsedGameTo > 0 ? parsedGameTo : 15;
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

function parseRosterView(rosterView: string | undefined): 'chips' | 'cards' {
  return rosterView === 'cards' ? 'cards' : 'chips';
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
