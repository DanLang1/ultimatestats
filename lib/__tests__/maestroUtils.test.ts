import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCurrentPossession } from '@/lib/advancedTracking/trackingUtils';
import {
  getMaestroSeedPlayerId,
  MAESTRO_SCRIMMAGE_BENCH_PLAYERS,
  MAESTRO_SEED_BASIC_GAME_ID,
  MAESTRO_SCRIMMAGE_PLAYERS,
  MAESTRO_SEED_PLAYERS,
  MAESTRO_SEED_TEAM_ID,
} from '@/lib/maestroConstants';
import {
  MaestroTrackerState,
  seedAdvancedTrackerTestGame,
  seedMaestroBasicSavedGame,
  seedMaestroTeamPrerequisites,
} from '@/lib/maestroUtils';
import { CURRENT_SCHEMA_VERSION } from '@/lib/storage/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';
import { useTutorialStore } from '@/store/tutorialStore';

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

  it('seeds a single-team bench without adding bench players to the starting line', async () => {
    await seedAdvancedTrackerTestGame({ includeBench: true, trackerState: 'focusPossession' });

    const game = useAdvancedTrackingStore.getState().currentGame;
    const currentTeam = useGameStore.getState().currentTeam;
    expect(currentTeam.roster.map((player) => player.name)).toEqual([
      ...MAESTRO_SEED_PLAYERS,
      ...MAESTRO_SCRIMMAGE_BENCH_PLAYERS,
    ]);
    expect(game?.points[0].lines[0].participantIds).toEqual(
      MAESTRO_SEED_PLAYERS.map(getMaestroSeedPlayerId),
    );
    expect(game?.participants.map((participant) => participant.id)).toEqual(
      currentTeam.roster.map((player) => player.id),
    );
  });

  it('seeds a configured game target', async () => {
    await seedAdvancedTrackerTestGame({ gameTo: 1 });

    expect(useAdvancedTrackingStore.getState().currentGame?.settings.format?.gameTo).toBe(1);
  });

  it('seeds the current team used by roster-backed advanced games', async () => {
    await seedAdvancedTrackerTestGame();

    const currentTeam = useGameStore.getState().currentTeam;
    const game = useAdvancedTrackingStore.getState().currentGame;

    expect(currentTeam.id).toBe(MAESTRO_SEED_TEAM_ID);
    expect(game?.sides[0].sourceTeamId).toBe(currentTeam.id);
    expect(currentTeam.roster.map((player) => player.name)).toEqual(MAESTRO_SEED_PLAYERS);
  });
});

describe('basic Maestro seeds', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useGameStore.setState({ savedGames: [], savedTeams: [] });
  });

  it('seeds one saved basic game whose score matches its goal events', async () => {
    await seedMaestroBasicSavedGame();
    await seedMaestroBasicSavedGame();

    const savedGames = useGameStore.getState().savedGames;
    expect(savedGames.map((game) => game.id)).toEqual([MAESTRO_SEED_BASIC_GAME_ID]);

    const [game] = savedGames;
    expect(game.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(game.team1.id).toBe(MAESTRO_SEED_TEAM_ID);
    const goals = game.events.filter((event) => event.type === 'goal');
    expect(goals.filter((goal) => goal.team === 'team1')).toHaveLength(game.team1Score);
    expect(goals.filter((goal) => goal.team === 'team2')).toHaveLength(game.team2Score);
    expect(game.events.every((event) => event.gameId === game.id)).toBe(true);
  });

  it('clears Maestro-owned saved games and teams without touching other data', async () => {
    await seedMaestroBasicSavedGame();
    const otherTeam = { id: 'real-team', name: 'Real Team', roster: [] };
    const otherGame = {
      ...useGameStore.getState().savedGames[0],
      id: 'real-game',
      team1: otherTeam,
    };
    useGameStore.setState((state) => {
      state.savedGames.push(otherGame);
      state.savedTeams.push(otherTeam, { id: 'leaked', name: 'Maestro Leaked', roster: [] });
    });

    await seedMaestroTeamPrerequisites({ clearActiveGame: true });

    const { savedGames, savedTeams } = useGameStore.getState();
    expect(savedGames.map((game) => game.id)).toEqual(['real-game']);
    expect(savedTeams.map((team) => team.id).sort()).toEqual([MAESTRO_SEED_TEAM_ID, 'real-team']);
  });

  it('marks onboarding as seen so relaunching flows skip the welcome screen', async () => {
    useTutorialStore.setState({ hasSeenOnboarding: false });

    await seedMaestroTeamPrerequisites({ clearActiveGame: true });

    expect(useTutorialStore.getState().hasSeenOnboarding).toBe(true);
  });
});
