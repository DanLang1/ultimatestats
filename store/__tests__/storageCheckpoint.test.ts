import AsyncStorage from '@react-native-async-storage/async-storage';

import { CURRENT_SCHEMA_VERSION, SavedGame, SavedTeam } from '@/lib/storage/types';
import { createSavedBasicGame } from '@/test/fixtures/domain';
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
const SETTINGS_STORAGE_KEY = 'ultimatestats-settings';

/** The basic-game entry fields 2.6.0 kept the pre-game settings in. */
type PersistedPreGameFields = {
  team1BgColor: string;
  team2BgColor: string;
  team2Name: string;
  baseGameTo: number;
  team1Timeouts: boolean[];
  autoHalftimeEnabled: boolean;
  floaterEnabled: boolean;
};

function getMovedPreGameSettings(storage: StorageCheckpoint) {
  const fields = (storage[BASIC_GAME_STORAGE_KEY] as { state: PersistedPreGameFields }).state;
  return {
    team1Color: fields.team1BgColor,
    team2Color: fields.team2BgColor,
    otherSideTeamName: fields.team2Name,
    gameTo: fields.baseGameTo,
    timeoutsPerHalf: fields.team1Timeouts.length,
    autoHalftimeEnabled: fields.autoHalftimeEnabled,
    floaterEnabled: fields.floaterEnabled,
  };
}

type PersistedBasicGameEntry = {
  state: {
    currentTeam: SavedTeam;
    savedGames: SavedGame[];
    savedTeams: SavedTeam[];
    team1BgColor: string;
    team2BgColor: string;
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

type PersistedEntryWithLineConfirmedFlag = {
  state: { lineConfirmedForNextPoint?: boolean };
};

type PersistedBasicGameEntryChangedSince260 = {
  state: {
    lineConfirmedForNextPoint?: boolean;
    team1BgColor?: string;
    team2BgColor?: string;
    currentTeam?: SavedTeam;
    savedTeams?: SavedTeam[];
    savedGames?: SavedGame[];
  };
};

/**
 * The complete storage difference from 2.6.0: the basic-game entry gains
 * `lineConfirmedForNextPoint` (default false) and drops `currentTeam`, `savedTeams`, and
 * `savedGames` (now in SQLite) and its team colors, the settings entry gains the pre-game settings
 * that entry held, the line-presets entry drops the flag, and a team entry appears.
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
  const settingsEntry = expectedStorage[SETTINGS_STORAGE_KEY] as {
    state: Record<string, unknown>;
  };

  basicGameEntry.state.lineConfirmedForNextPoint = false;
  delete basicGameEntry.state.currentTeam;
  delete basicGameEntry.state.savedTeams;
  delete basicGameEntry.state.savedGames;
  delete basicGameEntry.state.team1BgColor;
  delete basicGameEntry.state.team2BgColor;
  settingsEntry.state = { ...settingsEntry.state, ...getMovedPreGameSettings(checkpoint) };
  delete linePresetsEntry.state.lineConfirmedForNextPoint;
  expectedStorage[TEAM_STORAGE_KEY] = expectedTeamEntry;

  return expectedStorage;
}

/** SQLite storage as the running process sees it; its databases persist across cold starts. */
function openBasicGameStorage() {
  return jest.requireActual<typeof import('@/lib/basic/savedGameStorage')>(
    '@/lib/basic/savedGameStorage',
  );
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
    'cold-starts $checkpointPath, moves the teams to the team entry, the pre-game settings to the settings entry and the line-confirmed flag to the basic-game entry, and writes the rest back',
    async ({ checkpointPath, getExpectedTeamEntry }) => {
      const checkpoint = readCheckpointFile(checkpointPath);
      const {
        currentTeam: _legacyCurrentTeam,
        savedTeams: _legacySavedTeams,
        savedGames: persistedSavedGames,
        team1BgColor: _legacyTeam1Color,
        team2BgColor: _legacyTeam2Color,
        ...persistedLiveGame
      } = getBasicGameEntry(checkpoint).state;
      const expectedTeamEntry = getExpectedTeamEntry(checkpoint);
      await seedStorage(checkpoint);

      const app = await coldStartApp();

      expect(app.reportedErrors).toEqual([]);
      // Seeded by the team store's own storage read, before any store has written.
      expect(getTeamEntry(await readStorage())).toEqual(expectedTeamEntry);
      expect(app.useTeamStore.getState()).toMatchObject(expectedTeamEntry.state);
      expect(getSavedGameIds(app.useSavedBasicGamesStore.getState().savedGames)).toEqual(
        getSavedGameIds(persistedSavedGames),
      );
      expect(app.useGameStore.getState()).toMatchObject(persistedLiveGame);

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
    expect(persistedBasicGame).not.toHaveProperty('savedGames');
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

  it('moves the pre-game settings to the settings entry once, so a later change to them stays', async () => {
    const checkpoint = readCheckpointFile('2.6.0/mid-game.json');
    const basicGameEntry = checkpoint[BASIC_GAME_STORAGE_KEY] as { state: PersistedPreGameFields };
    Object.assign(basicGameEntry.state, {
      team1BgColor: '#3F296E',
      team2BgColor: '#4F46E5',
      team2Name: 'Last Opponent',
      baseGameTo: 6,
      team1Timeouts: [true, true, true],
      autoHalftimeEnabled: false,
      floaterEnabled: false,
    });
    await seedStorage(checkpoint);

    const firstStart = await coldStartApp();

    expect(firstStart.reportedErrors).toEqual([]);
    expect(firstStart.useSettingsStore.getState()).toMatchObject({
      team1Color: '#3F296E',
      team2Color: '#4F46E5',
      otherSideTeamName: 'Last Opponent',
      gameTo: 6,
      timeoutsPerHalf: 3,
      autoHalftimeEnabled: false,
      floaterEnabled: false,
    });
    expect(getBasicGameEntry(await readStorage()).state).not.toHaveProperty('team1BgColor');

    firstStart.useSettingsStore.getState().setGameTo(11);
    const secondStart = await coldStartApp();

    expect(secondStart.useSettingsStore.getState().gameTo).toBe(11);
  });

  it('keeps the pre-game settings in the basic-game entry when the settings write fails, and moves them on the next start', async () => {
    const checkpoint = readCheckpointFile('2.6.0/mid-game.json');
    const basicGameEntry = checkpoint[BASIC_GAME_STORAGE_KEY] as { state: PersistedPreGameFields };
    basicGameEntry.state.baseGameTo = 6;
    await seedStorage(checkpoint);
    const setItem = jest.mocked(AsyncStorage.setItem);
    const writeItem = setItem.getMockImplementation();
    if (writeItem == null) throw new Error('Expected the AsyncStorage mock to write.');
    const settingsWriteError = new Error('disk full');
    let didFailSettingsWrite = false;
    setItem.mockImplementation(async (key, value) => {
      if (key === SETTINGS_STORAGE_KEY && !didFailSettingsWrite) {
        didFailSettingsWrite = true;
        throw settingsWriteError;
      }
      return writeItem(key, value);
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const failedStart = await coldStartApp();
    await failedStart.writeAllPersistedStores();

    expect(failedStart.reportedErrors.map(([error]) => error)).toEqual([settingsWriteError]);
    expect(getBasicGameEntry(await readStorage()).state).toMatchObject({
      team1BgColor: '#F8FAFC',
      team2BgColor: '#0F172A',
    });

    setItem.mockImplementation(writeItem);
    const nextStart = await coldStartApp();

    expect(nextStart.useSettingsStore.getState().gameTo).toBe(6);
    expect(getBasicGameEntry(await readStorage()).state).not.toHaveProperty('team1BgColor');
  });

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

  it('takes the saved games out of the basic-game entry once the first start has moved them to SQLite', async () => {
    await seedStorage(readCheckpointFile('2.6.0/legacy-saved-games.json'));

    const app = await coldStartApp();

    expect(app.reportedErrors).toEqual([]);
    const persistedBasicGame = getBasicGameEntry(await readStorage());
    expect({ [BASIC_GAME_STORAGE_KEY]: persistedBasicGame }).toEqual(
      readCheckpointFile('expected/legacy-saved-games.after-cold-start.json'),
    );
  });

  it.each(['2.6.0/mid-game.json', '2.6.0/legacy-saved-games.json'])(
    'makes the saved basic games of %s the games in SQLite on the first start',
    async (checkpointPath) => {
      const checkpoint = readCheckpointFile(checkpointPath);
      const storedGameIds = getSavedGameIds(getBasicGameEntry(checkpoint).state.savedGames);
      await seedStorage(checkpoint);
      // A game an earlier build copied to SQLite and the user has deleted since.
      await openBasicGameStorage().upsertBasicGames([
        { ...createSavedBasicGame(), id: 'game-deleted-since-the-copy' },
      ]);

      const app = await coldStartApp();

      expect(app.reportedErrors).toEqual([]);
      const gamesInSqlite = await app.basicGameStorage.loadAllBasicGames();
      expect(getSavedGameIds(gamesInSqlite).sort()).toEqual([...storedGameIds].sort());
      expect(app.useSavedBasicGamesStore.getState().savedGames).toEqual(gamesInSqlite);
      // Loading a game upgrades it, so only the summaries show the schema that was stored.
      const storedSchemaVersions = (await app.basicGameStorage.loadBasicGameSummaries()).map(
        (summary) => summary.schemaVersion,
      );
      expect(storedSchemaVersions).toEqual(storedGameIds.map(() => CURRENT_SCHEMA_VERSION));
    },
  );

  it('keeps the games in SQLite on a later start when AsyncStorage holds different ones', async () => {
    await seedStorage(readCheckpointFile('2.6.0/mid-game.json'));
    const firstStart = await coldStartApp();
    const gamesAfterFirstStart = await firstStart.basicGameStorage.loadAllBasicGames();
    await firstStart.writeAllPersistedStores();
    // A start whose SQLite load failed keeps the games in the entry.
    const storageWithOneGame = await readStorage();
    getBasicGameEntry(storageWithOneGame).state.savedGames = gamesAfterFirstStart.slice(0, 1);
    await seedStorage(storageWithOneGame);

    const secondStart = await coldStartApp();

    expect(secondStart.reportedErrors).toEqual([]);
    expect(gamesAfterFirstStart).toHaveLength(11);
    expect(await secondStart.basicGameStorage.loadAllBasicGames()).toEqual(gamesAfterFirstStart);
    expect(secondStart.useSavedBasicGamesStore.getState().savedGames).toEqual(gamesAfterFirstStart);
  });

  it('keeps the AsyncStorage games in use when the move to SQLite fails, and moves them on the next start', async () => {
    await seedStorage(readCheckpointFile('2.6.0/mid-game.json'));
    const moveError = new Error('disk full');
    const device = jest.requireMock<typeof import('@/test/mocks/expoSqlite')>('expo-sqlite');
    const db = await device.openDatabaseAsync('ultimatestats_basic_games.db');
    const failingMove = jest.spyOn(db, 'withTransactionAsync').mockRejectedValueOnce(moveError);
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const firstStart = await coldStartApp();

    expect(firstStart.reportedErrors.map(([error]) => error)).toEqual([moveError]);
    expect(firstStart.useSavedBasicGamesStore.getState().savedGames).toHaveLength(11);
    expect(await firstStart.basicGameStorage.loadAllBasicGames()).toEqual([]);
    // A later write must not drop the only copy of the games.
    await firstStart.writeAllPersistedStores();
    expect(getBasicGameEntry(await readStorage()).state.savedGames).toHaveLength(11);
    // A game saved before the next start has to be in the copy that start moves.
    const gameSavedAfterFailedMove = { ...createSavedBasicGame(), id: 'saved-after-failed-move' };
    await firstStart.useSavedBasicGamesStore.getState().importGame(gameSavedAfterFailedMove);
    await firstStart.writeAllPersistedStores();

    const secondStart = await coldStartApp();

    const gameIdsAfterSecondStart = getSavedGameIds(
      await secondStart.basicGameStorage.loadAllBasicGames(),
    );
    expect(gameIdsAfterSecondStart).toHaveLength(12);
    expect(gameIdsAfterSecondStart).toContain(gameSavedAfterFailedMove.id);
    // The database outlives this test, so the spy would too.
    failingMove.mockRestore();
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
