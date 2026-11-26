import type { AdvancedGameHistorySnapshot } from '@/lib/advancedTracking/persistenceTypes';
import {
  ADVANCED_TRACKING_SCHEMA_VERSION,
  type AdvancedTrackedGame,
} from '@/lib/advancedTracking/types';

// Runs real SQL in an in-memory database; see test/mocks/expoSqlite.ts.
const DATABASE_NAME = 'ultimatestats_advanced_tracking.db';

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
  const storage = jest.requireActual<typeof import('@/lib/advancedTracking/storage')>(
    '@/lib/advancedTracking/storage',
  );

  return { storage, device, openDatabase: () => device.openDatabaseAsync(DATABASE_NAME) };
}

function makeLegacyGame(overrides: Partial<AdvancedTrackedGame> = {}): AdvancedTrackedGame {
  return {
    id: 'legacy-game',
    schemaVersion: 2,
    createdAt: 1,
    updatedAt: 2,
    gameType: 'game',
    status: 'in_progress',
    focusSideId: 'home',
    initialReceivingSideId: 'home',
    settings: { locationMode: 'none' },
    sides: [
      { id: 'home', label: 'Home', sourceTeamId: 'focus-team', trackingMode: 'full-roster' },
      { id: 'away', label: 'Away', trackingMode: 'anonymous' },
    ],
    participants: [],
    points: [],
    ...overrides,
  };
}

const undoEntry = {
  kind: 'action' as const,
  pointId: 'point-1',
  possessionId: 'possession-1',
  actionId: 'action-1',
};

describe('advanced tracking storage', () => {
  it('saves a game and loads back the game and its summary', async () => {
    const { storage } = coldStartStorage();

    await storage.upsertAdvancedGame(makeLegacyGame());

    const loaded = await storage.loadAdvancedGame('legacy-game');
    expect(loaded).toMatchObject({ id: 'legacy-game', focusSideId: 'home' });
    expect(loaded?.schemaVersion).toBe(ADVANCED_TRACKING_SCHEMA_VERSION);
    expect(await storage.loadAdvancedGameSummaries()).toEqual([
      expect.objectContaining({
        id: 'legacy-game',
        status: 'in_progress',
        focusSourceTeamId: 'focus-team',
        myTeamName: 'Home',
        opponentName: 'Away',
      }),
    ]);
  });

  it('returns nothing for a game that was never saved', async () => {
    const { storage } = coldStartStorage();

    expect(await storage.loadAdvancedGame('missing')).toBeNull();
    expect(await storage.loadAdvancedGameHistorySnapshot('missing')).toBeNull();
  });

  it('adds undo history to a database created before it existed and keeps its game', async () => {
    const { storage, openDatabase } = coldStartStorage();
    const db = await openDatabase();
    await db.execAsync(`
      CREATE TABLE advanced_game_records (
        id TEXT PRIMARY KEY NOT NULL,
        schema_version INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        data_json TEXT NOT NULL
      );
    `);
    await db.runAsync(
      'INSERT INTO advanced_game_records (id, schema_version, updated_at, data_json) VALUES (?, ?, ?, ?)',
      'legacy-game',
      2,
      2,
      JSON.stringify(makeLegacyGame()),
    );

    const snapshotBeforeSave = await storage.loadAdvancedGameHistorySnapshot('legacy-game');
    await storage.upsertAdvancedLiveSnapshot({ game: makeLegacyGame(), undoStack: [undoEntry] });
    const snapshotAfterSave = await storage.loadAdvancedGameHistorySnapshot('legacy-game');

    expect(snapshotBeforeSave?.game.schemaVersion).toBe(ADVANCED_TRACKING_SCHEMA_VERSION);
    expect(snapshotBeforeSave?.undoStack).toEqual([]);
    expect(snapshotAfterSave?.undoStack).toEqual([undoEntry]);
  });

  it('keeps saved games across a restart', async () => {
    const firstStart = coldStartStorage();
    await firstStart.storage.upsertAdvancedLiveSnapshot({
      game: makeLegacyGame(),
      undoStack: [undoEntry],
    });

    const { storage } = coldStartStorage(firstStart.device);

    const snapshot = await storage.loadAdvancedGameHistorySnapshot('legacy-game');
    expect(snapshot?.game.id).toBe('legacy-game');
    expect(snapshot?.undoStack).toEqual([undoEntry]);
    expect((await storage.loadAdvancedGameSummaries()).map((summary) => summary.id)).toEqual([
      'legacy-game',
    ]);
  });

  it.each([
    { undoHistory: 'missing', undoJson: null },
    {
      undoHistory: 'from an unsupported version',
      undoJson: JSON.stringify({ version: 99, entries: [undoEntry] }),
    },
    { undoHistory: 'unparseable', undoJson: '{broken' },
  ])('discards undo history that is $undoHistory while keeping the game', async ({ undoJson }) => {
    const { storage, openDatabase } = coldStartStorage();
    await storage.upsertAdvancedLiveSnapshot({ game: makeLegacyGame(), undoStack: [undoEntry] });
    const db = await openDatabase();
    await db.runAsync(
      'UPDATE advanced_game_records SET undo_json = ? WHERE id = ?',
      undoJson,
      'legacy-game',
    );

    const snapshot = await storage.loadAdvancedGameHistorySnapshot('legacy-game');

    expect(snapshot?.game.id).toBe('legacy-game');
    expect(snapshot?.undoStack).toEqual([]);
  });

  it('saves the game and undo history as they were when the save was requested', async () => {
    const { storage } = coldStartStorage();
    const snapshot: AdvancedGameHistorySnapshot = {
      game: makeLegacyGame(),
      undoStack: [undoEntry],
    };

    const save = storage.upsertAdvancedLiveSnapshot(snapshot);
    snapshot.game.metadata = { title: 'mutated after capture' };
    snapshot.undoStack.push({ ...undoEntry, actionId: 'later-action' });
    await save;

    const saved = await storage.loadAdvancedGameHistorySnapshot('legacy-game');
    expect(saved?.game).not.toHaveProperty('metadata');
    expect(saved?.undoStack).toEqual([undoEntry]);
  });

  it('clears undo history when the game is saved as a finished record', async () => {
    const { storage } = coldStartStorage();
    await storage.upsertAdvancedLiveSnapshot({ game: makeLegacyGame(), undoStack: [undoEntry] });

    await storage.upsertAdvancedGame(makeLegacyGame());

    const saved = await storage.loadAdvancedGameHistorySnapshot('legacy-game');
    expect(saved?.undoStack).toEqual([]);
  });

  it('replaces the summary and record when the same game is saved again', async () => {
    const { storage } = coldStartStorage();
    await storage.upsertAdvancedGame(makeLegacyGame());

    await storage.upsertAdvancedGame(makeLegacyGame({ status: 'final', updatedAt: 5 }));

    expect(await storage.loadAdvancedGameSummaries()).toEqual([
      expect.objectContaining({ id: 'legacy-game', status: 'final', updatedAt: 5 }),
    ]);
    expect((await storage.loadAdvancedGame('legacy-game'))?.status).toBe('final');
  });

  it('writes neither the summary nor the record when the record write fails', async () => {
    const { storage, openDatabase } = coldStartStorage();
    const db = await openDatabase();
    const runAsync = db.runAsync;
    jest.spyOn(db, 'runAsync').mockImplementation(async (source, ...params) => {
      if (source.includes('INTO advanced_game_records')) throw new Error('disk full');
      return runAsync(source, ...params);
    });

    await expect(storage.upsertAdvancedGame(makeLegacyGame())).rejects.toThrow('disk full');

    expect(await storage.loadAdvancedGameSummaries()).toEqual([]);
    expect(await storage.loadAdvancedGame('legacy-game')).toBeNull();
  });

  it('saves two games requested at the same time', async () => {
    const { storage } = coldStartStorage();

    await Promise.all([
      storage.upsertAdvancedLiveSnapshot({ game: makeLegacyGame(), undoStack: [] }),
      storage.upsertAdvancedLiveSnapshot({
        game: makeLegacyGame({ id: 'second-game', updatedAt: 3 }),
        undoStack: [],
      }),
    ]);

    expect((await storage.loadAdvancedGame('legacy-game'))?.id).toBe('legacy-game');
    expect((await storage.loadAdvancedGame('second-game'))?.id).toBe('second-game');
  });

  it('keeps saving later games after a failed write', async () => {
    const { storage, openDatabase } = coldStartStorage();
    const db = await openDatabase();
    jest.spyOn(db, 'withTransactionAsync').mockRejectedValueOnce(new Error('write failed'));

    const first = storage.upsertAdvancedLiveSnapshot({
      game: makeLegacyGame(),
      undoStack: [undoEntry],
    });
    const second = storage.upsertAdvancedLiveSnapshot({
      game: makeLegacyGame({ id: 'second-game', updatedAt: 3 }),
      undoStack: [],
    });

    await expect(first).rejects.toThrow('write failed');
    await expect(second).resolves.toMatchObject({ id: 'second-game' });
    expect(await storage.loadAdvancedGame('legacy-game')).toBeNull();
    expect((await storage.loadAdvancedGame('second-game'))?.id).toBe('second-game');
  });

  it('deletes a game together with its summary', async () => {
    const { storage } = coldStartStorage();
    await storage.upsertAdvancedGame(makeLegacyGame());
    await storage.upsertAdvancedGame(makeLegacyGame({ id: 'kept-game' }));

    await storage.deleteAdvancedGameRecord('legacy-game');

    expect(await storage.loadAdvancedGame('legacy-game')).toBeNull();
    const summaries = await storage.loadAdvancedGameSummaries();
    expect(summaries.map((summary) => summary.id)).toEqual(['kept-game']);
  });
});

describe('advanced game summaries', () => {
  it('lists games newest first', async () => {
    const { storage } = coldStartStorage();
    await storage.upsertAdvancedGame(makeLegacyGame({ id: 'older', createdAt: 100 }));
    await storage.upsertAdvancedGame(makeLegacyGame({ id: 'newest', createdAt: 300 }));
    await storage.upsertAdvancedGame(makeLegacyGame({ id: 'middle', createdAt: 200 }));

    const summaries = await storage.loadAdvancedGameSummaries();

    expect(summaries.map((summary) => summary.id)).toEqual(['newest', 'middle', 'older']);
  });

  it('skips and reports a summary without a focus team instead of failing the whole list', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { storage, openDatabase } = coldStartStorage();
    await storage.upsertAdvancedGame(makeLegacyGame({ id: 'good' }));
    await storage.upsertAdvancedGame(makeLegacyGame({ id: 'bad' }));
    const db = await openDatabase();
    await db.runAsync(
      'UPDATE advanced_game_summaries SET focus_source_team_id = NULL WHERE id = ?',
      'bad',
    );

    const summaries = await storage.loadAdvancedGameSummaries();

    expect(summaries.map((summary) => summary.id)).toEqual(['good']);
    expect(consoleError).toHaveBeenCalledWith(
      '[advanced-game-summary-missing-team]',
      expect.any(Error),
    );
  });
});
