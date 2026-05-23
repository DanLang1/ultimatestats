import * as SQLite from 'expo-sqlite';

import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { AdvancedGameSummary, deriveAdvancedGameSummary } from '@/lib/advancedTracking/summary';

const DATABASE_NAME = 'ultimatestats_advanced_tracking.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

type SummaryRow = {
  id: string;
  schema_version: number;
  created_at: number;
  updated_at: number;
  imported_at: number | null;
  played_at: number | null;
  sort_timestamp: number;
  status: AdvancedGameSummary['status'];
  game_type: AdvancedGameSummary['gameType'];
  focus_side_id: string;
  focus_source_team_id: string | null;
  my_team_name: string;
  opponent_name: string;
  my_score: number;
  opponent_score: number;
  points_tracked: number;
};

type RecordRow = {
  data_json: string;
};

function isAdvancedTrackedGame(value: unknown): value is AdvancedTrackedGame {
  if (typeof value !== 'object' || value == null) return false;
  const id = Reflect.get(value, 'id');
  const schemaVersion = Reflect.get(value, 'schemaVersion');
  const createdAt = Reflect.get(value, 'createdAt');
  const updatedAt = Reflect.get(value, 'updatedAt');
  const sides = Reflect.get(value, 'sides');
  const participants = Reflect.get(value, 'participants');
  const points = Reflect.get(value, 'points');
  return (
    typeof id === 'string' &&
    typeof schemaVersion === 'number' &&
    typeof createdAt === 'number' &&
    typeof updatedAt === 'number' &&
    Array.isArray(sides) &&
    Array.isArray(participants) &&
    Array.isArray(points)
  );
}

async function getDb() {
  if (dbPromise == null) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await migrateAdvancedTrackingDb(db);
      return db;
    });
  }
  return dbPromise;
}

async function migrateAdvancedTrackingDb(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS advanced_game_summaries (
      id TEXT PRIMARY KEY NOT NULL,
      schema_version INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      imported_at INTEGER,
      played_at INTEGER,
      sort_timestamp INTEGER NOT NULL,
      status TEXT NOT NULL,
      game_type TEXT NOT NULL,
      focus_side_id TEXT NOT NULL,
      focus_source_team_id TEXT,
      my_team_name TEXT NOT NULL,
      opponent_name TEXT NOT NULL,
      my_score INTEGER NOT NULL,
      opponent_score INTEGER NOT NULL,
      points_tracked INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_advanced_game_summaries_sort_timestamp
      ON advanced_game_summaries(sort_timestamp DESC);

    CREATE TABLE IF NOT EXISTS advanced_game_records (
      id TEXT PRIMARY KEY NOT NULL,
      schema_version INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      data_json TEXT NOT NULL
    );
  `);
}

function rowToSummary(row: SummaryRow): AdvancedGameSummary {
  return {
    id: row.id,
    schemaVersion: row.schema_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    importedAt: row.imported_at ?? undefined,
    playedAt: row.played_at,
    sortTimestamp: row.sort_timestamp,
    status: row.status,
    gameType: row.game_type,
    focusSideId: row.focus_side_id,
    focusSourceTeamId: row.focus_source_team_id,
    myTeamName: row.my_team_name,
    opponentName: row.opponent_name,
    myScore: row.my_score,
    opponentScore: row.opponent_score,
    pointsTracked: row.points_tracked,
  };
}

export async function loadAdvancedGameSummaries(): Promise<AdvancedGameSummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SummaryRow>(
    'SELECT * FROM advanced_game_summaries ORDER BY sort_timestamp DESC, updated_at DESC',
  );
  return rows.map(rowToSummary);
}

export async function loadAdvancedGame(gameId: string): Promise<AdvancedTrackedGame | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<RecordRow>(
    'SELECT data_json FROM advanced_game_records WHERE id = ?',
    gameId,
  );
  if (row == null) return null;
  const parsed: unknown = JSON.parse(row.data_json);
  if (!isAdvancedTrackedGame(parsed)) {
    throw new Error(`Stored advanced game "${gameId}" is invalid.`);
  }
  return parsed;
}

export async function loadAdvancedGames(gameIds: string[]): Promise<AdvancedTrackedGame[]> {
  const games = await Promise.all(gameIds.map((id) => loadAdvancedGame(id)));
  return games.filter((game): game is AdvancedTrackedGame => game != null);
}

export async function upsertAdvancedGame(game: AdvancedTrackedGame): Promise<AdvancedGameSummary> {
  return enqueueWrite(async () => {
    const db = await getDb();
    const summary = deriveAdvancedGameSummary(game);
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT OR REPLACE INTO advanced_game_summaries (
        id,
        schema_version,
        created_at,
        updated_at,
        imported_at,
        played_at,
        sort_timestamp,
        status,
        game_type,
        focus_side_id,
        focus_source_team_id,
        my_team_name,
        opponent_name,
        my_score,
        opponent_score,
        points_tracked
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        summary.id,
        summary.schemaVersion,
        summary.createdAt,
        summary.updatedAt,
        summary.importedAt ?? null,
        summary.playedAt,
        summary.sortTimestamp,
        summary.status,
        summary.gameType,
        summary.focusSideId,
        summary.focusSourceTeamId,
        summary.myTeamName,
        summary.opponentName,
        summary.myScore,
        summary.opponentScore,
        summary.pointsTracked,
      );
      await db.runAsync(
        `INSERT OR REPLACE INTO advanced_game_records (
        id,
        schema_version,
        updated_at,
        data_json
      ) VALUES (?, ?, ?, ?)`,
        game.id,
        game.schemaVersion,
        game.updatedAt,
        JSON.stringify(game),
      );
    });
    return summary;
  });
}

export async function deleteAdvancedGameRecord(gameId: string): Promise<void> {
  await enqueueWrite(async () => {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM advanced_game_summaries WHERE id = ?', gameId);
      await db.runAsync('DELETE FROM advanced_game_records WHERE id = ?', gameId);
    });
  });
}

function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => undefined);
  return next;
}
