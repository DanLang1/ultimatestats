import type { AdvancedGameHistorySnapshot } from '@/lib/advancedTracking/persistenceTypes';
import {
  loadAdvancedGame,
  loadAdvancedGameHistorySnapshot,
  loadAdvancedGameSummaries,
  upsertAdvancedGame,
  upsertAdvancedLiveSnapshot,
} from '@/lib/advancedTracking/storage';
import {
  ADVANCED_TRACKING_SCHEMA_VERSION,
  type AdvancedTrackedGame,
} from '@/lib/advancedTracking/types';

jest.unmock('@/lib/advancedTracking/storage');

const mockGetAllAsync = jest.fn(async () => [{ name: 'data_json' }]);
const mockGetFirstAsync = jest.fn();
const mockRunAsync = jest.fn<Promise<undefined>, [string, ...unknown[]]>(async () => undefined);
const mockWithTransactionAsync = jest.fn(async (task: () => Promise<void>) => task());
const mockDb = {
  execAsync: jest.fn(async () => undefined),
  getAllAsync: mockGetAllAsync,
  getFirstAsync: mockGetFirstAsync,
  runAsync: mockRunAsync,
  withTransactionAsync: mockWithTransactionAsync,
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => mockDb),
}));

function makeLegacyGame(): AdvancedTrackedGame {
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
  };
}

const undoEntry = {
  kind: 'action' as const,
  pointId: 'point-1',
  possessionId: 'possession-1',
  actionId: 'action-1',
};

function getRecordWrite() {
  return mockRunAsync.mock.calls.find(([sql]) =>
    sql.includes('INSERT OR REPLACE INTO advanced_game_records'),
  );
}

describe('advanced tracking storage migration boundary', () => {
  beforeEach(() => {
    mockGetFirstAsync.mockReset();
    mockRunAsync.mockClear();
    mockWithTransactionAsync.mockReset();
    mockWithTransactionAsync.mockImplementation(async (task: () => Promise<void>) => task());
  });

  it('adds nullable undo metadata to a production-shaped database and migrates its game', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({
      data_json: JSON.stringify(makeLegacyGame()),
    });

    const loaded = await loadAdvancedGame('legacy-game');

    expect(loaded?.schemaVersion).toBe(ADVANCED_TRACKING_SCHEMA_VERSION);
    expect(mockGetAllAsync).toHaveBeenCalledWith('PRAGMA table_info(advanced_game_records)');
    expect(mockRunAsync).toHaveBeenCalledWith(
      'ALTER TABLE advanced_game_records ADD COLUMN undo_json TEXT',
    );
    expect(mockGetFirstAsync).toHaveBeenCalledWith(
      'SELECT data_json FROM advanced_game_records WHERE id = ?',
      'legacy-game',
    );
  });

  it('loads the game and supported undo history from the same row', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({
      data_json: JSON.stringify(makeLegacyGame()),
      undo_json: JSON.stringify({ version: 1, entries: [undoEntry] }),
    });

    const snapshot = await loadAdvancedGameHistorySnapshot('legacy-game');

    expect(snapshot?.game.schemaVersion).toBe(ADVANCED_TRACKING_SCHEMA_VERSION);
    expect(snapshot?.undoStack).toEqual([undoEntry]);
    expect(mockGetFirstAsync).toHaveBeenCalledWith(
      'SELECT data_json, undo_json FROM advanced_game_records WHERE id = ?',
      'legacy-game',
    );
  });

  it.each([null, JSON.stringify({ version: 99, entries: [undoEntry] }), '{broken'])(
    'discards missing or unsupported undo metadata while preserving the game',
    async (undoJson) => {
      mockGetFirstAsync.mockResolvedValueOnce({
        data_json: JSON.stringify(makeLegacyGame()),
        undo_json: undoJson,
      });

      const snapshot = await loadAdvancedGameHistorySnapshot('legacy-game');

      expect(snapshot?.game.id).toBe('legacy-game');
      expect(snapshot?.undoStack).toEqual([]);
    },
  );

  it('writes the game and undo payload in one transaction from the captured pair', async () => {
    const snapshot: AdvancedGameHistorySnapshot = {
      game: makeLegacyGame(),
      undoStack: [undoEntry],
    };

    const save = upsertAdvancedLiveSnapshot(snapshot);
    snapshot.game.metadata = { title: 'mutated after capture' };
    snapshot.undoStack.push({ ...undoEntry, actionId: 'later-action' });
    await save;

    expect(mockWithTransactionAsync).toHaveBeenCalledTimes(1);
    const recordWrite = getRecordWrite();
    expect(recordWrite).toBeDefined();
    expect(JSON.parse(String(recordWrite![4]))).not.toHaveProperty('metadata');
    expect(JSON.parse(String(recordWrite![5]))).toEqual({
      version: 1,
      entries: [undoEntry],
    });
  });

  it('explicit saved-game writes clear undo metadata', async () => {
    await upsertAdvancedGame(makeLegacyGame());

    expect(getRecordWrite()?.[5]).toBeNull();
  });

  it('continues the queue after a failed transaction without mixing snapshots', async () => {
    mockWithTransactionAsync
      .mockRejectedValueOnce(new Error('write failed'))
      .mockImplementationOnce(async (task: () => Promise<void>) => task());
    const first = upsertAdvancedLiveSnapshot({
      game: makeLegacyGame(),
      undoStack: [undoEntry],
    });
    const secondGame = { ...makeLegacyGame(), id: 'second-game', updatedAt: 3 };
    const second = upsertAdvancedLiveSnapshot({
      game: secondGame,
      undoStack: [],
    });

    await expect(first).rejects.toThrow('write failed');
    await expect(second).resolves.toMatchObject({ id: 'second-game' });
    expect(getRecordWrite()?.[1]).toBe('second-game');
  });
});

describe('advanced game summaries', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockGetAllAsync.mockImplementation(async () => [{ name: 'data_json' }]);
  });

  const summaryRow = (id: string, focusSourceTeamId: string | null) => ({
    id,
    schema_version: ADVANCED_TRACKING_SCHEMA_VERSION,
    created_at: 1,
    updated_at: 2,
    imported_at: null,
    played_at: null,
    sort_timestamp: 1,
    status: 'final',
    game_type: 'game',
    focus_side_id: 'home',
    focus_source_team_id: focusSourceTeamId,
    my_team_name: 'Home',
    opponent_name: 'Away',
    my_score: 1,
    opponent_score: 0,
    points_tracked: 1,
  });

  it('skips and reports a summary without a focus team instead of failing the whole list', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockGetAllAsync.mockImplementation((async (sql: string) =>
      sql.includes('advanced_game_summaries')
        ? [summaryRow('good', 'team-1'), summaryRow('bad', null)]
        : [{ name: 'data_json' }]) as never);

    const summaries = await loadAdvancedGameSummaries();

    expect(summaries.map((summary) => summary.id)).toEqual(['good']);
    expect(consoleError).toHaveBeenCalledWith(
      '[advanced-game-summary-missing-team]',
      expect.any(Error),
    );
  });
});
