import legacyV2Game from '@/lib/storage/__fixtures__/games/v2/halftime-by-math.json';
import { CURRENT_SCHEMA_VERSION, type SavedGame } from '@/lib/storage/types';
import { createSavedBasicGame } from '@/test/fixtures/domain';

// Runs real SQL in an in-memory database; see test/mocks/expoSqlite.ts.
const DATABASE_NAME = 'ultimatestats_basic_games.db';

type InMemoryDevice = typeof import('@/test/mocks/expoSqlite');

/**
 * Starts the storage module as a new app process would, with nothing opened yet. Without a device
 * it is a clean install; pass the device from an earlier start to restart on its databases.
 */
function coldStartStorage(existingDevice?: InMemoryDevice) {
  jest.resetModules();
  if (existingDevice) {
    jest.doMock('expo-sqlite', () => existingDevice);
  } else {
    jest.doMock('expo-sqlite', () => jest.requireActual('@/test/mocks/expoSqlite'));
  }
  const device = jest.requireMock<InMemoryDevice>('expo-sqlite');
  const storage = jest.requireActual<typeof import('@/lib/basic/savedGameStorage')>(
    '@/lib/basic/savedGameStorage',
  );

  return { storage, device, openDatabase: () => device.openDatabaseAsync(DATABASE_NAME) };
}

function savedGame(overrides: Partial<SavedGame> = {}): SavedGame {
  // Saving a game always records the halftime setting; loading fills it in when it is absent.
  return { ...createSavedBasicGame(), autoHalftimeEnabled: true, ...overrides };
}

describe('saved basic game storage', () => {
  it('saves a game and loads back the game and its summary', async () => {
    const { storage } = coldStartStorage();
    const game = savedGame();

    await storage.upsertBasicGames([game]);

    expect(await storage.loadBasicGame(game.id)).toEqual(game);
    expect(await storage.loadBasicGameSummaries()).toEqual([
      {
        id: game.id,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        createdAt: game.createdAt,
        sortTimestamp: game.createdAt,
        team1Id: 'team-windchill',
        team1Name: 'Windchill',
        team2Name: 'Rivals',
        team1Score: 15,
        team2Score: 12,
      },
    ]);
  });

  it('returns nothing for a game that was never saved', async () => {
    const { storage } = coldStartStorage();

    expect(await storage.loadBasicGame('missing-game')).toBeNull();
    expect(await storage.loadBasicGameSummaries()).toEqual([]);
  });

  it('keeps saved games across a restart', async () => {
    const firstStart = coldStartStorage();
    const game = savedGame();
    await firstStart.storage.upsertBasicGames([game]);

    const secondStart = coldStartStorage(firstStart.device);

    expect(await secondStart.storage.loadBasicGame(game.id)).toEqual(game);
    expect(await secondStart.storage.loadBasicGameSummaries()).toHaveLength(1);
  });

  it('replaces the summary and record when the same game is saved again', async () => {
    const { storage } = coldStartStorage();
    await storage.upsertBasicGames([savedGame({ team1Score: 14 })]);

    await storage.upsertBasicGames([savedGame({ team1Score: 15 })]);

    expect((await storage.loadBasicGame('saved-basic-game-1'))?.team1Score).toBe(15);
    expect(await storage.loadBasicGameSummaries()).toEqual([
      expect.objectContaining({ id: 'saved-basic-game-1', team1Score: 15 }),
    ]);
  });

  it('dates a game by when it was played, falling back to when it was saved', async () => {
    const { storage } = coldStartStorage();
    await storage.upsertBasicGames([
      savedGame({ id: 'game-without-played-date', createdAt: 200 }),
      savedGame({ id: 'game-with-played-date', createdAt: 300, playedAt: 100 }),
    ]);

    const summaries = await storage.loadBasicGameSummaries();

    expect(summaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'game-without-played-date', sortTimestamp: 200 }),
        expect.objectContaining({ id: 'game-with-played-date', sortTimestamp: 100 }),
      ]),
    );
  });

  it('loads only the requested games and leaves out ids that match none', async () => {
    const { storage } = coldStartStorage();
    await storage.upsertBasicGames([
      savedGame({ id: 'game-a' }),
      savedGame({ id: 'game-b' }),
      savedGame({ id: 'game-c' }),
    ]);

    const games = await storage.loadBasicGames(['game-a', 'game-c', 'missing-game']);

    expect(games.map((game) => game.id).sort()).toEqual(['game-a', 'game-c']);
    expect(await storage.loadBasicGames([])).toEqual([]);
  });

  it('brings a game stored in an older schema up to the current one when loading it', async () => {
    const { storage } = coldStartStorage();
    // A v2 record predates today's SavedGame type.
    const storedV2Game = legacyV2Game as unknown as SavedGame;
    await storage.upsertBasicGames([storedV2Game]);

    const loaded = await storage.loadBasicGame(storedV2Game.id);
    const [loadedInBulk] = await storage.loadBasicGames([storedV2Game.id]);

    expect(storedV2Game.schemaVersion).toBe(2);
    expect(loaded?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(loadedInBulk).toEqual(loaded);
  });

  it('saves none of the games in a request when one of them fails', async () => {
    const { storage, openDatabase } = coldStartStorage();
    const db = await openDatabase();
    const runStatement = db.runAsync.bind(db);
    jest.spyOn(db, 'runAsync').mockImplementation(async (source, ...bindValues) => {
      if (bindValues.includes('game-b')) throw new Error('write failed');
      return runStatement(source, ...bindValues);
    });

    await expect(
      storage.upsertBasicGames([savedGame({ id: 'game-a' }), savedGame({ id: 'game-b' })]),
    ).rejects.toThrow('write failed');

    expect(await storage.loadBasicGameSummaries()).toEqual([]);
    expect(await storage.loadBasicGame('game-a')).toBeNull();
  });

  it('saves two games requested at the same time', async () => {
    const { storage } = coldStartStorage();

    await Promise.all([
      storage.upsertBasicGames([savedGame({ id: 'game-a' })]),
      storage.upsertBasicGames([savedGame({ id: 'game-b' })]),
    ]);

    expect((await storage.loadBasicGame('game-a'))?.id).toBe('game-a');
    expect((await storage.loadBasicGame('game-b'))?.id).toBe('game-b');
  });

  it('keeps saving later games after a failed write', async () => {
    const { storage, openDatabase } = coldStartStorage();
    const db = await openDatabase();
    jest.spyOn(db, 'withTransactionAsync').mockRejectedValueOnce(new Error('write failed'));

    const first = storage.upsertBasicGames([savedGame({ id: 'game-a' })]);
    const second = storage.upsertBasicGames([savedGame({ id: 'game-b' })]);

    await expect(first).rejects.toThrow('write failed');
    await second;
    expect((await storage.loadBasicGame('game-b'))?.id).toBe('game-b');
  });

  it('deletes the chosen games with their summaries and keeps the rest', async () => {
    const { storage } = coldStartStorage();
    await storage.upsertBasicGames([
      savedGame({ id: 'game-a' }),
      savedGame({ id: 'game-b' }),
      savedGame({ id: 'game-c' }),
    ]);

    await storage.deleteBasicGames(['game-a', 'game-c']);

    expect(await storage.loadBasicGame('game-a')).toBeNull();
    expect(await storage.loadBasicGame('game-c')).toBeNull();
    expect((await storage.loadBasicGame('game-b'))?.id).toBe('game-b');
    expect((await storage.loadBasicGameSummaries()).map((summary) => summary.id)).toEqual([
      'game-b',
    ]);
  });
});
