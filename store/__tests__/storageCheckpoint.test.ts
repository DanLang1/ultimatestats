import AsyncStorage from '@react-native-async-storage/async-storage';

import { CURRENT_SCHEMA_VERSION, SavedGame, SavedTeam } from '@/lib/storage/types';
import {
  coldStartApp,
  readCheckpointFile,
  readStorage,
  seedStorage,
  type StorageCheckpoint,
} from '@/test/storageCheckpoint';

import { PersistedTeamState } from '../teamStore.types';

const BASIC_GAME_STORAGE_KEY = 'ultimatestats-game-storage';
const LINE_PRESETS_STORAGE_KEY = 'ultimatestats-line-presets';
const TEAM_STORAGE_KEY = 'ultimatestats-team-storage';
const STARTUP_MIGRATIONS_STORAGE_KEY = 'ultimatestats_startup_migrations';

type PersistedBasicGameEntry = {
  state: {
    currentTeam: SavedTeam;
    savedGames: SavedGame[];
    savedTeams: SavedTeam[];
  };
  version: number;
};

function getBasicGameEntry(storage: StorageCheckpoint) {
  return storage[BASIC_GAME_STORAGE_KEY] as PersistedBasicGameEntry;
}

type PersistedTeamEntry = {
  state: PersistedTeamState;
  version: number;
};

function getTeamEntry(storage: StorageCheckpoint) {
  return storage[TEAM_STORAGE_KEY] as PersistedTeamEntry;
}

type PersistedStartupMigrationsEntry = {
  state: { migrations: Record<string, { completedAt: number; version: number }> };
};

type PersistedEntryWithLineConfirmedFlag = {
  state: { lineConfirmedForNextPoint?: boolean };
};

type PersistedBasicGameEntryChangedSince260 = {
  state: { lineConfirmedForNextPoint?: boolean; currentTeam?: SavedTeam; savedTeams?: SavedTeam[] };
};

/**
 * The complete storage difference from 2.6.0: the basic-game entry gains
 * `lineConfirmedForNextPoint` (default false) and drops `currentTeam` and `savedTeams`, the
 * line-presets entry drops the flag, a team entry appears, and the copy of saved basic games into
 * SQLite is recorded as done.
 */
function withStorageChangesSince260(
  checkpoint: StorageCheckpoint,
  expectedTeamEntry: PersistedTeamEntry,
): StorageCheckpoint {
  const expectedStorage = structuredClone(checkpoint);
  const basicGameEntry = expectedStorage[
    BASIC_GAME_STORAGE_KEY
  ] as PersistedBasicGameEntryChangedSince260;
  const linePresetsEntry = expectedStorage[
    LINE_PRESETS_STORAGE_KEY
  ] as PersistedEntryWithLineConfirmedFlag;

  basicGameEntry.state.lineConfirmedForNextPoint = false;
  delete basicGameEntry.state.currentTeam;
  delete basicGameEntry.state.savedTeams;
  delete linePresetsEntry.state.lineConfirmedForNextPoint;
  expectedStorage[TEAM_STORAGE_KEY] = expectedTeamEntry;
  const startupMigrationsEntry = expectedStorage[
    STARTUP_MIGRATIONS_STORAGE_KEY
  ] as PersistedStartupMigrationsEntry;
  startupMigrationsEntry.state.migrations['basic-games-sqlite'] = {
    completedAt: expect.any(Number),
    version: 1,
  };

  return expectedStorage;
}

function getSavedGameIds(savedGames: SavedGame[]) {
  return savedGames.map((game) => game.id);
}

describe('storage checkpoints', () => {
  // mid-game holds a game in progress (events, lines, running clocks, an open timeout), so a live
  // field that failed to hydrate cannot hide behind its default. multiple-teams holds four saved
  // teams, a current team that differs from its saved copy, and a preset whose team was deleted.
  //
  // The team entry is seeded from the basic-game entry. In mid-game the current team equals its
  // saved copy, so the teams are the saved teams. In multiple-teams the current copy replaces the
  // stale saved one, which the expected file spells out.
  it.each([
    {
      checkpointPath: '2.6.0/mid-game.json',
      getExpectedTeamEntry: (checkpoint: StorageCheckpoint): PersistedTeamEntry => {
        const { currentTeam, savedTeams } = getBasicGameEntry(checkpoint).state;
        return { state: { teams: savedTeams, currentTeamId: currentTeam.id }, version: 0 };
      },
    },
    {
      checkpointPath: '2.6.0/multiple-teams.json',
      getExpectedTeamEntry: () =>
        getTeamEntry(
          readCheckpointFile('expected/multiple-teams.team-storage.after-cold-start.json'),
        ),
    },
  ])(
    'cold-starts $checkpointPath, moves the teams to the team entry and the line-confirmed flag to the basic-game entry, and writes the rest back',
    async ({ checkpointPath, getExpectedTeamEntry }) => {
      const checkpoint = readCheckpointFile(checkpointPath);
      const {
        currentTeam: _legacyCurrentTeam,
        savedTeams: _legacySavedTeams,
        ...persistedBasicGame
      } = getBasicGameEntry(checkpoint).state;
      const expectedTeamEntry = getExpectedTeamEntry(checkpoint);
      await seedStorage(checkpoint);

      const app = await coldStartApp();

      expect(app.reportedErrors).toEqual([]);
      // Seeded by the team store's own storage read, before any store has written.
      expect(getTeamEntry(await readStorage())).toEqual(expectedTeamEntry);
      expect(app.useTeamStore.getState()).toMatchObject(expectedTeamEntry.state);
      const hydratedBasicGame = app.useGameStore.getState();
      expect(getSavedGameIds(hydratedBasicGame.savedGames)).toEqual(
        getSavedGameIds(persistedBasicGame.savedGames),
      );
      expect(hydratedBasicGame).toMatchObject(persistedBasicGame);

      await app.writeAllPersistedStores();

      expect(await readStorage()).toEqual(
        withStorageChangesSince260(checkpoint, expectedTeamEntry),
      );
    },
  );

  // On a device the basic-game and team entries stay absent until the first state change; the
  // harness forces that write so the persisted defaults can be read.
  it('cold-starts a fresh install with the default team in the team entry only and stays stable', async () => {
    await seedStorage({});

    const firstStart = await coldStartApp();
    await firstStart.writeAllPersistedStores();
    const storageAfterFirstStart = await readStorage();

    expect(firstStart.reportedErrors).toEqual([]);
    const persistedBasicGame = getBasicGameEntry(storageAfterFirstStart).state;
    expect(persistedBasicGame).not.toHaveProperty('currentTeam');
    expect(persistedBasicGame).not.toHaveProperty('savedTeams');
    expect(persistedBasicGame.savedGames).toEqual([]);
    const persistedTeams = getTeamEntry(storageAfterFirstStart).state;
    expect(persistedTeams.teams).toEqual([
      { id: persistedTeams.currentTeamId, name: 'Team 1', roster: [] },
    ]);

    const secondStart = await coldStartApp();
    await secondStart.writeAllPersistedStores();

    expect(secondStart.reportedErrors).toEqual([]);
    expect(await readStorage()).toEqual(storageAfterFirstStart);
  });

  it.each(['2.6.0/mid-game.json', '2.6.0/multiple-teams.json', '2.6.0/legacy-saved-games.json'])(
    'leaves storage identical after a second cold start of %s',
    async (checkpointPath) => {
      await seedStorage(readCheckpointFile(checkpointPath));

      const firstStart = await coldStartApp();
      await firstStart.writeAllPersistedStores();
      const storageAfterFirstStart = await readStorage();

      const secondStart = await coldStartApp();
      await secondStart.writeAllPersistedStores();

      expect(secondStart.reportedErrors).toEqual([]);
      expect(await readStorage()).toEqual(storageAfterFirstStart);
    },
  );

  it('seeds one team from an unsaved default team', async () => {
    await seedStorage(readCheckpointFile('2.6.0/legacy-saved-games.json'));

    const app = await coldStartApp();

    expect(app.reportedErrors).toEqual([]);
    expect(getTeamEntry(await readStorage())).toEqual({
      state: {
        teams: [{ id: 'checkpoint-default-team', name: 'Team 1', roster: [] }],
        currentTeamId: 'checkpoint-default-team',
      },
      version: 0,
    });
  });

  it('migrates legacy saved games at hydration and persists the result', async () => {
    const checkpoint = readCheckpointFile('2.6.0/legacy-saved-games.json');
    const legacySavedGames = getBasicGameEntry(checkpoint).state.savedGames;
    await seedStorage(checkpoint);

    const app = await coldStartApp();

    expect(app.reportedErrors).toEqual([]);
    const persistedBasicGame = getBasicGameEntry(await readStorage());
    const migratedSavedGames = persistedBasicGame.state.savedGames;
    expect(getSavedGameIds(migratedSavedGames)).toEqual(getSavedGameIds(legacySavedGames));
    expect(migratedSavedGames.map((game) => game.schemaVersion)).toEqual([
      CURRENT_SCHEMA_VERSION,
      CURRENT_SCHEMA_VERSION,
      CURRENT_SCHEMA_VERSION,
    ]);
    expect({ [BASIC_GAME_STORAGE_KEY]: persistedBasicGame }).toEqual(
      readCheckpointFile('expected/legacy-saved-games.after-cold-start.json'),
    );
  });

  it.each(['2.6.0/mid-game.json', '2.6.0/legacy-saved-games.json'])(
    'copies every saved basic game of %s into SQLite as the app holds it',
    async (checkpointPath) => {
      await seedStorage(readCheckpointFile(checkpointPath));

      const app = await coldStartApp();

      expect(app.reportedErrors).toEqual([]);
      const savedGames = app.useGameStore.getState().savedGames;
      expect(savedGames.length).toBeGreaterThan(0);
      const copiedGames = await app.basicGameStorage.loadBasicGames(getSavedGameIds(savedGames));
      expect(copiedGames).toHaveLength(savedGames.length);
      expect(copiedGames).toEqual(expect.arrayContaining(savedGames));
      // Loading a game upgrades it, so only the summaries show the schema that was stored.
      const storedSchemaVersions = (await app.basicGameStorage.loadBasicGameSummaries()).map(
        (summary) => summary.schemaVersion,
      );
      expect(storedSchemaVersions).toEqual(savedGames.map(() => CURRENT_SCHEMA_VERSION));
    },
  );

  it('copies saved basic games on the next start when the first copy fails', async () => {
    await seedStorage(readCheckpointFile('2.6.0/mid-game.json'));
    const copyError = new Error('disk full');
    const device = jest.requireMock<typeof import('@/test/mocks/expoSqlite')>('expo-sqlite');
    const db = await device.openDatabaseAsync('ultimatestats_basic_games.db');
    const failingCopy = jest.spyOn(db, 'withTransactionAsync').mockRejectedValueOnce(copyError);
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const firstStart = await coldStartApp();

    expect(firstStart.reportedErrors.map(([error]) => error)).toEqual([copyError]);
    expect(firstStart.useGameStore.getState().savedGames).toHaveLength(11);
    expect(await firstStart.basicGameStorage.loadBasicGameSummaries()).toEqual([]);

    const secondStart = await coldStartApp();

    expect(await secondStart.basicGameStorage.loadBasicGameSummaries()).toHaveLength(11);
    // The database outlives this test, so the spy would too.
    failingCopy.mockRestore();
  });

  it('hydrates the seeded teams even when writing the seeded team entry fails', async () => {
    await seedStorage(readCheckpointFile('2.6.0/multiple-teams.json'));
    const seedWriteError = new Error('disk full');
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(seedWriteError);
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const app = await coldStartApp();

    expect(app.reportedErrors.map(([error]) => error)).toEqual([seedWriteError]);
    expect(app.useTeamStore.getState().teams.map((team) => team.name)).toEqual([
      'Hammers',
      'Rookies',
      'Imports',
      'Cleared',
    ]);
  });
});
