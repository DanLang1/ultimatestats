import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  resetStartupMigrationRunnerForTests,
  runReadyStartupMigrations,
  type StartupMigration,
} from '@/hooks/useStartupMigrations';
import { SavedGame, Tournament } from '@/lib/storage/types';
import { useGameStore } from '../basic/gameStore';
import { useStartupMigrationStore } from '../startupMigrationStore';
import { useTournamentStore } from '../tournamentStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

function makeSavedGame(overrides: Partial<SavedGame> = {}): SavedGame {
  return {
    id: 'game-1',
    schemaVersion: 6,
    createdAt: 1000,
    team1: { id: 'team-1', name: 'Timber', roster: [] },
    team2Name: 'Rivals',
    team1Score: 15,
    team2Score: 10,
    events: [],
    gameTo: 15,
    startingPossession: 'team1',
    ...overrides,
  };
}

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 'tournament-1',
    schemaVersion: 1,
    kind: 'basic',
    name: 'Spring Fling',
    startDate: '2026-03-14',
    endDate: '2026-03-15',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

describe('startupMigrationStore', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    resetStartupMigrationRunnerForTests();
    useStartupMigrationStore.setState({ migrations: {} });
    useTournamentStore.setState({ tournaments: [], gameLinks: [] });
    useGameStore.setState({ savedGames: [] });
  });

  it('marks migrations complete by id and version', () => {
    expect(useStartupMigrationStore.getState().isComplete('migration-a', 1)).toBe(false);

    useStartupMigrationStore.getState().markComplete('migration-a', 1);

    expect(useStartupMigrationStore.getState().isComplete('migration-a', 1)).toBe(true);
    expect(useStartupMigrationStore.getState().isComplete('migration-a', 2)).toBe(false);
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      'ultimatestats_startup_migrations',
      expect.any(String),
    );
  });

  it('waits for all registered stores before running the tournament link migration', async () => {
    useGameStore.setState({
      savedGames: [makeSavedGame({ tournamentId: 'tournament-1' })],
    });
    useTournamentStore.setState({
      tournaments: [makeTournament()],
      gameLinks: [],
    });

    const gameHydrated = jest.spyOn(useGameStore.persist, 'hasHydrated').mockReturnValue(false);
    jest.spyOn(useTournamentStore.persist, 'hasHydrated').mockReturnValue(true);
    jest.spyOn(useStartupMigrationStore.persist, 'hasHydrated').mockReturnValue(true);

    await runReadyStartupMigrations();

    expect(useTournamentStore.getState().gameLinks).toHaveLength(0);
    expect(useStartupMigrationStore.getState().isComplete('basic-tournament-links', 1)).toBe(false);

    gameHydrated.mockReturnValue(true);

    await runReadyStartupMigrations();

    expect(useTournamentStore.getState().gameLinks[0]).toMatchObject({
      tournamentId: 'tournament-1',
      gameKind: 'basic',
      gameId: 'game-1',
    });
    expect(useStartupMigrationStore.getState().isComplete('basic-tournament-links', 1)).toBe(true);
  });

  it('shares one in-flight startup migration run across concurrent calls', async () => {
    let resolveRun = () => {};
    const run = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRun = resolve;
        }),
    );
    const migration: StartupMigration = {
      id: 'concurrent-migration',
      version: 1,
      isReady: () => true,
      isComplete: () => false,
      run,
    };

    const firstRun = runReadyStartupMigrations([migration]);
    const secondRun = runReadyStartupMigrations([migration]);
    await Promise.resolve();

    expect(run).toHaveBeenCalledTimes(1);
    resolveRun();
    await Promise.all([firstRun, secondRun]);
    expect(useStartupMigrationStore.getState().isComplete('concurrent-migration', 1)).toBe(true);
  });
});
