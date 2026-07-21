import type { Participant } from '@/lib/advancedTracking/types';
import {
  getMaestroSeedPlayerId,
  MAESTRO_SEED_GAME_ID,
  MAESTRO_SEED_PLAYERS,
  MAESTRO_SEED_TEAM_ID,
} from '@/lib/maestroConstants';
import type { SavedTeam } from '@/lib/storage/types';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';
import { useGameSessionStore } from '@/store/gameSessionStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTutorialStore } from '@/store/tutorialStore';

const FOCUS_SIDE_ID = 'focus-side';
const OPP_SIDE_ID = 'opp-side';
const MAESTRO_SEED_TEAM_NAME = 'Zoboomafoo';
const MAESTRO_CAP_SOFT_ACTIVE_ELAPSED_MS = 75 * 60 * 1000;

export type MaestroCapMode = 'both' | 'hard' | 'soft' | 'none' | 'softActive';

type PersistHydrationApi = {
  hasHydrated: () => boolean;
  onFinishHydration: (callback: () => void) => () => void;
};

function waitForHydration(persist: PersistHydrationApi) {
  if (persist.hasHydrated()) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const unsubscribe = persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
    if (persist.hasHydrated()) {
      unsubscribe();
      resolve();
    }
  });
}

export async function waitForMaestroStoresToHydrate() {
  await Promise.all([
    waitForHydration(useAdvancedTrackingStore.persist),
    waitForHydration(useGameStore.persist),
    waitForHydration(useGameSessionStore.persist),
    waitForHydration(useLinePresetsStore.persist),
    waitForHydration(useSettingsStore.persist),
    waitForHydration(useTutorialStore.persist),
  ]);
}

export function buildSeedTeam(): SavedTeam {
  return {
    id: MAESTRO_SEED_TEAM_ID,
    name: MAESTRO_SEED_TEAM_NAME,
    roster: MAESTRO_SEED_PLAYERS.map((name) => ({
      id: getMaestroSeedPlayerId(name),
      name,
      isActive: true,
      matchingType: null,
      role: null,
    })),
  };
}

export async function seedTestTeam() {
  const { saveCurrentTeam, setCurrentTeam } = useGameStore.getState();
  const team = buildSeedTeam();
  setCurrentTeam(team);
  await saveCurrentTeam(team);
}

async function clearActiveAdvancedGame() {
  const activeAdvancedGameId = useAdvancedTrackingStore.getState().currentGameId;
  useAdvancedTrackingStore.getState().resetCurrentGame();
  if (activeAdvancedGameId != null) {
    await useSavedAdvancedGamesStore.getState().deleteGame(activeAdvancedGameId);
  }
}

function resetMaestroSetupState() {
  const settingsStore = useSettingsStore.getState();
  settingsStore.resetMatchingTypeColors();
  settingsStore.setGenderRatioEnabled(false);
  settingsStore.setFirstPointRatio(null);
  settingsStore.setLineCallingEnabled(false);
  settingsStore.setNumPlayers(7);
  settingsStore.setRosterViewMode('chips');
  settingsStore.setOrientationMode('portrait');
  settingsStore.setHardCapMins(90);
  settingsStore.setSoftCapMins(20);
  settingsStore.setAdvancedSoftCapAtMins(70);
  settingsStore.setAdvancedHardCapEnabled(true);
  settingsStore.setAdvancedSoftCapEnabled(true);
  settingsStore.setStatEntryOrder('goal_first');
  settingsStore.setLinePlayerSortOrder('alpha');

  const gameStore = useGameStore.getState();
  gameStore.setTeam2Name('Team 2');
  gameStore.setAutoHalftimeEnabled(true);
  gameStore.setFloaterEnabled(true);
  gameStore.setGameTo(15);
  gameStore.resetTimeouts(2);

  const linePresetsStore = useLinePresetsStore.getState();
  linePresetsStore.clearPresetsForTeam(MAESTRO_SEED_TEAM_ID);
  linePresetsStore.setLineConfirmedForNextPoint(false);
}

export async function seedMaestroTeamPrerequisites(options: { clearActiveGame?: boolean } = {}) {
  resetMaestroSetupState();

  if (options.clearActiveGame === true) {
    await clearActiveAdvancedGame();
    useGameStore.getState().resetGame();
    useGameSessionStore.getState().clearActiveGame();
  }

  await seedTestTeam();
  useTutorialStore.getState().completeAdvancedTutorial();
}

function getSeedCapFormat(capMode: MaestroCapMode) {
  if (capMode === 'hard') {
    return {
      softCapEnabled: false,
      hardCapEnabled: true,
    };
  }

  if (capMode === 'soft' || capMode === 'softActive') {
    return {
      softCapEnabled: true,
      hardCapEnabled: false,
    };
  }

  if (capMode === 'none') {
    return {
      softCapEnabled: false,
      hardCapEnabled: false,
    };
  }

  return {
    softCapEnabled: true,
    hardCapEnabled: true,
  };
}

function setSeedCapTiming() {
  const settingsStore = useSettingsStore.getState();
  settingsStore.setHardCapMins(90);
  settingsStore.setAdvancedSoftCapAtMins(70);
}

function backdateCurrentPointStartForSoftCapActive() {
  const game = useAdvancedTrackingStore.getState().currentGame;
  const firstPoint = game?.points[0];
  if (game == null || firstPoint == null) {
    return;
  }

  const startedAt = Date.now() - MAESTRO_CAP_SOFT_ACTIVE_ELAPSED_MS;
  useAdvancedTrackingStore.setState({
    currentGame: {
      ...game,
      updatedAt: Date.now(),
      points: game.points.map((point, index) => {
        if (index !== 0) {
          return point;
        }

        return {
          ...point,
          startedAt,
        };
      }),
    },
  });
}

export async function seedAdvancedTrackerTestGame(options: { capMode?: MaestroCapMode } = {}) {
  const advancedStore = useAdvancedTrackingStore.getState();
  const gameStore = useGameStore.getState();
  const sessionStore = useGameSessionStore.getState();
  const savedAdvancedGamesStore = useSavedAdvancedGamesStore.getState();
  const capMode = options.capMode ?? 'both';

  await clearActiveAdvancedGame();
  gameStore.resetGame();
  sessionStore.setActiveGameType('advanced');
  await seedMaestroTeamPrerequisites();
  setSeedCapTiming();
  await savedAdvancedGamesStore.deleteGame(MAESTRO_SEED_GAME_ID);
  const team = buildSeedTeam();

  const participants: Participant[] = team.roster.map((player) => ({
    id: player.id,
    name: player.name,
    sourcePlayerId: player.id,
    matchingType: player.matchingType,
    role: player.role,
  }));

  advancedStore.createGame({
    id: MAESTRO_SEED_GAME_ID,
    focusSideId: FOCUS_SIDE_ID,
    initialReceivingSideId: FOCUS_SIDE_ID,
    sides: [
      {
        id: FOCUS_SIDE_ID,
        label: team.name,
        sourceTeamId: team.id,
        trackingMode: 'full-roster',
      },
      {
        id: OPP_SIDE_ID,
        label: gameStore.team2Name,
        trackingMode: 'anonymous',
      },
    ],
    participants,
    format: {
      gameTo: 15,
      halftimeEnabled: true,
      ...getSeedCapFormat(capMode),
      timeoutsPerHalf: 2,
      floaterEnabled: true,
    },
  });

  advancedStore.recordPull({
    lines: [
      {
        sideId: FOCUS_SIDE_ID,
        participantIds: participants.map((participant) => participant.id),
      },
    ],
    puller: { refType: 'untracked' },
    result: 'inbound',
  });

  if (capMode === 'softActive') {
    backdateCurrentPointStartForSoftCapActive();
  }

  const seededGame = useAdvancedTrackingStore.getState().currentGame;
  if (seededGame != null) {
    await savedAdvancedGamesStore.saveGame(seededGame);
  }
}
