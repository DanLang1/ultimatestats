import { getDefaultHalftimeTimerState } from '@/lib/advancedTracking/halftimeTimerUtils';
import type { AdvancedGameType, Participant, PlayerRef } from '@/lib/advancedTracking/types';
import {
  getMaestroSeedPlayerId,
  MAESTRO_SEED_GAME_ID,
  MAESTRO_SEED_PLAYERS,
  MAESTRO_SCRIMMAGE_PLAYERS,
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
import { palette } from '@/theme/theme';

const FOCUS_SIDE_ID = 'focus-side';
const OPP_SIDE_ID = 'opp-side';
const MAESTRO_SEED_TEAM_NAME = 'Zoboomafoo';
const MAESTRO_CAP_SOFT_ACTIVE_ELAPSED_MS = 75 * 60 * 1000;

export type MaestroCapMode = 'both' | 'hard' | 'soft' | 'none' | 'softActive' | 'bothActive';
export type MaestroSeedGameType = AdvancedGameType;
export type MaestroTrackerState = 'awaitingPickup' | 'focusPossession' | 'opponentPossession';

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

export function buildSeedTeam(playerNames: string[] = MAESTRO_SEED_PLAYERS): SavedTeam {
  return {
    id: MAESTRO_SEED_TEAM_ID,
    name: MAESTRO_SEED_TEAM_NAME,
    roster: playerNames.map((name) => ({
      id: getMaestroSeedPlayerId(name),
      name,
      isActive: true,
      matchingType: null,
      role: null,
    })),
  };
}

function seedTestTeamWithPlayers(playerNames?: string[]) {
  const team = buildSeedTeam(playerNames);
  setSeedTeam(team);
}

function setSeedTeam(team: SavedTeam) {
  useGameStore.setState((state) => {
    state.currentTeam = team;
    const savedTeamIndex = state.savedTeams.findIndex((savedTeam) => savedTeam.id === team.id);
    if (savedTeamIndex === -1) {
      state.savedTeams.push(team);
      return;
    }

    state.savedTeams[savedTeamIndex] = team;
  });
}

export function seedTestTeam() {
  seedTestTeamWithPlayers();
}

async function clearAdvancedGames(additionalGameIds: string[] = []) {
  const activeAdvancedGameId = useAdvancedTrackingStore.getState().currentGameId;
  useAdvancedTrackingStore.setState((state) => {
    state.currentGame = null;
    state.currentGameId = null;
    state.undoStack = [];
    state.pendingNextPointLineSelection = null;
    state.isHalftimeBreakActive = false;
    Object.assign(state, getDefaultHalftimeTimerState());
  });

  const gameIdsToDelete = new Set(additionalGameIds);
  if (activeAdvancedGameId != null) {
    gameIdsToDelete.add(activeAdvancedGameId);
  }

  for (const gameId of gameIdsToDelete) {
    await useSavedAdvancedGamesStore.getState().deleteGame(gameId);
  }
}

function resetMaestroSetupState(team: SavedTeam) {
  useSettingsStore.setState({
    mmpColor: palette.mmpColor,
    fmpColor: palette.fmpColor,
    genderRatioEnabled: false,
    firstPointRatio: null,
    lineCallingEnabled: false,
    numPlayers: 7,
    rosterViewMode: 'chips',
    orientationMode: 'portrait',
    hardCapMins: 90,
    softCapMins: 20,
    advancedSoftCapAtMins: 70,
    advancedHardCapEnabled: true,
    advancedSoftCapEnabled: true,
    statEntryOrder: 'goal_first',
    linePlayerSortOrder: 'alpha',
  });

  useGameStore.setState((state) => {
    state.currentTeam = team;
    state.team2Name = 'Team 2';
    state.autoHalftimeEnabled = true;
    state.floaterEnabled = true;
    state.gameTo = 15;
    state.baseGameTo = 15;
    state.team1Timeouts = [true, true];
    state.team2Timeouts = [true, true];

    const savedTeamIndex = state.savedTeams.findIndex((savedTeam) => savedTeam.id === team.id);
    if (savedTeamIndex === -1) {
      state.savedTeams.push(team);
      return;
    }

    state.savedTeams[savedTeamIndex] = team;
  });

  useLinePresetsStore.setState((state) => {
    state.presets = state.presets.filter((preset) => preset.teamId !== MAESTRO_SEED_TEAM_ID);
    state.lineConfirmedForNextPoint = false;
  });
}

export async function seedMaestroTeamPrerequisites(
  options: { clearActiveGame?: boolean; gameType?: MaestroSeedGameType } = {},
) {
  const team = buildSeedTeam(
    options.gameType === 'scrimmage' ? MAESTRO_SCRIMMAGE_PLAYERS : undefined,
  );
  resetMaestroSetupState(team);
  setSeedTeam(team);

  if (options.clearActiveGame === true) {
    await clearAdvancedGames();
    useGameStore.getState().resetGame();
    useGameSessionStore.getState().clearActiveGame();
  }

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

function backdateCurrentPointStartForActiveCap() {
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

function getSeedReceivingSideId(trackerState: MaestroTrackerState) {
  if (trackerState === 'opponentPossession') return OPP_SIDE_ID;
  return FOCUS_SIDE_ID;
}

function getSeedPuller(gameType: MaestroSeedGameType, receivingSideId: string): PlayerRef {
  if (receivingSideId === OPP_SIDE_ID) {
    return {
      refType: 'participant',
      participantId: getMaestroSeedPlayerId(MAESTRO_SEED_PLAYERS[0]),
    };
  }

  if (gameType === 'scrimmage') {
    return {
      refType: 'participant',
      participantId: getMaestroSeedPlayerId(MAESTRO_SCRIMMAGE_PLAYERS[7]),
    };
  }

  return { refType: 'untracked' };
}

function seedTrackerState(trackerState: MaestroTrackerState, gameType: MaestroSeedGameType) {
  if (trackerState === 'awaitingPickup') return;

  if (trackerState === 'focusPossession') {
    useAdvancedTrackingStore.getState().recordCaptureIntent({
      kind: 'pickup',
      player: {
        refType: 'participant',
        participantId: getMaestroSeedPlayerId(MAESTRO_SEED_PLAYERS[0]),
      },
    });
    return;
  }

  const opponentPlayer: PlayerRef =
    gameType === 'scrimmage'
      ? {
          refType: 'participant',
          participantId: getMaestroSeedPlayerId(MAESTRO_SCRIMMAGE_PLAYERS[7]),
        }
      : { refType: 'untracked' };
  useAdvancedTrackingStore
    .getState()
    .recordCaptureIntent({ kind: 'pickup', player: opponentPlayer });
}

export async function seedAdvancedTrackerTestGame(
  options: {
    capMode?: MaestroCapMode;
    gameTo?: number;
    gameType?: MaestroSeedGameType;
    rosterView?: 'chips' | 'cards';
    trackerState?: MaestroTrackerState;
  } = {},
) {
  const advancedStore = useAdvancedTrackingStore.getState();
  const gameStore = useGameStore.getState();
  const sessionStore = useGameSessionStore.getState();
  const savedAdvancedGamesStore = useSavedAdvancedGamesStore.getState();
  const capMode = options.capMode ?? 'both';
  const gameTo = options.gameTo ?? 15;
  const gameType = options.gameType ?? 'game';
  const trackerState = options.trackerState ?? 'awaitingPickup';
  const isScrimmage = gameType === 'scrimmage';
  const receivingSideId = getSeedReceivingSideId(trackerState);

  await clearAdvancedGames([MAESTRO_SEED_GAME_ID]);
  gameStore.resetGame();
  sessionStore.setActiveGameType('advanced');
  await seedMaestroTeamPrerequisites({ gameType });
  if (options.rosterView != null) {
    useSettingsStore.setState({ rosterViewMode: options.rosterView });
  }
  const team = buildSeedTeam(isScrimmage ? MAESTRO_SCRIMMAGE_PLAYERS : undefined);

  const participants: Participant[] = team.roster.map((player) => ({
    id: player.id,
    name: player.name,
    sourcePlayerId: player.id,
    matchingType: player.matchingType,
    role: player.role,
  }));

  const focusLineIds = participants
    .slice(0, MAESTRO_SEED_PLAYERS.length)
    .map((participant) => participant.id);
  const lines = [
    {
      sideId: FOCUS_SIDE_ID,
      participantIds: focusLineIds,
    },
  ];
  if (isScrimmage) {
    lines.push({
      sideId: OPP_SIDE_ID,
      participantIds: participants
        .slice(MAESTRO_SEED_PLAYERS.length, MAESTRO_SEED_PLAYERS.length * 2)
        .map((participant) => participant.id),
    });
  }

  advancedStore.createGame({
    id: MAESTRO_SEED_GAME_ID,
    gameType,
    focusSideId: FOCUS_SIDE_ID,
    initialReceivingSideId: receivingSideId,
    sides: [
      {
        id: FOCUS_SIDE_ID,
        label: isScrimmage ? 'Light' : team.name,
        sourceTeamId: team.id,
        trackingMode: 'full-roster',
      },
      {
        id: OPP_SIDE_ID,
        label: isScrimmage ? 'Dark' : gameStore.team2Name,
        sourceTeamId: isScrimmage ? team.id : undefined,
        trackingMode: isScrimmage ? 'full-roster' : 'anonymous',
      },
    ],
    participants,
    format: {
      gameTo,
      halftimeEnabled: true,
      ...getSeedCapFormat(capMode),
      timeoutsPerHalf: 2,
      floaterEnabled: true,
    },
  });

  advancedStore.recordPull({
    lines,
    puller: getSeedPuller(gameType, receivingSideId),
    result: 'inbound',
  });

  seedTrackerState(trackerState, gameType);

  if (capMode === 'softActive' || capMode === 'bothActive') {
    backdateCurrentPointStartForActiveCap();
  }

  const seededGame = useAdvancedTrackingStore.getState().currentGame;
  if (seededGame != null) {
    await savedAdvancedGamesStore.saveGame(seededGame);
  }
}
