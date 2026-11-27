import * as SQLite from 'expo-sqlite';

import { type BasicGameSummary, deriveBasicGameSummary } from '@/lib/basic/savedGameSummary';
import { migrateSavedGame } from '@/lib/storage/migrations';
import type { SavedGame } from '@/lib/storage/types';

const DATABASE_NAME = 'ultimatestats_basic_games.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

type SummaryRow = {
  id: string;
  schema_version: number;
  created_at: number;
  sort_timestamp: number;
  team1_id: string;
  team1_name: string;
  team2_name: string;
  team1_score: number;
  team2_score: number;
};

type GameRecordRow = {
  id: string;
  data_json: string;
};

function isSavedGame(value: unknown): value is SavedGame {
  if (typeof value !== 'object' || value == null) return false;
  const id = Reflect.get(value, 'id');
  const schemaVersion = Reflect.get(value, 'schemaVersion');
  const createdAt = Reflect.get(value, 'createdAt');
  const team1 = Reflect.get(value, 'team1');
  const events = Reflect.get(value, 'events');
  return (
    typeof id === 'string' &&
    typeof schemaVersion === 'number' &&
    typeof createdAt === 'number' &&
    typeof team1 === 'object' &&
    team1 != null &&
    Array.isArray(events)
  );
}

async function getDb() {
  if (dbPromise == null) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await createBasicGameTables(db);
      return db;
    });
  }
  return dbPromise;
}

async function createBasicGameTables(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS basic_game_summaries (
      id TEXT PRIMARY KEY NOT NULL,
      schema_version INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      sort_timestamp INTEGER NOT NULL,
      team1_id TEXT NOT NULL,
      team1_name TEXT NOT NULL,
      team2_name TEXT NOT NULL,
      team1_score INTEGER NOT NULL,
      team2_score INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS basic_game_records (
      id TEXT PRIMARY KEY NOT NULL,
      schema_version INTEGER NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS basic_game_async_storage_import (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      imported_at INTEGER NOT NULL
    );
  `);
}

function rowToSummary(row: SummaryRow): BasicGameSummary {
  return {
    id: row.id,
    schemaVersion: row.schema_version,
    createdAt: row.created_at,
    sortTimestamp: row.sort_timestamp,
    team1Id: row.team1_id,
    team1Name: row.team1_name,
    team2Name: row.team2_name,
    team1Score: row.team1_score,
    team2Score: row.team2_score,
  };
}

function recordRowToGame(row: GameRecordRow): SavedGame {
  const parsed: unknown = JSON.parse(row.data_json);
  if (!isSavedGame(parsed)) {
    throw new Error(`Stored basic game "${row.id}" is invalid.`);
  }
  return migrateSavedGame(parsed);
}

/** In no particular order; the screens that list games sort them. */
export async function loadBasicGameSummaries(): Promise<BasicGameSummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SummaryRow>('SELECT * FROM basic_game_summaries');
  return rows.map(rowToSummary);
}

export async function loadBasicGame(gameId: string): Promise<SavedGame | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<GameRecordRow>(
    'SELECT id, data_json FROM basic_game_records WHERE id = ?',
    gameId,
  );
  return row == null ? null : recordRowToGame(row);
}

/** Every saved game, in no particular order. */
export async function loadAllBasicGames(): Promise<SavedGame[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<GameRecordRow>('SELECT id, data_json FROM basic_game_records');
  return rows.map(recordRowToGame);
}

/** The saved games with these ids, in no particular order; ids that match no game are left out. */
export async function loadBasicGames(gameIds: string[]): Promise<SavedGame[]> {
  const db = await getDb();
  const idPlaceholders = gameIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<GameRecordRow>(
    `SELECT id, data_json FROM basic_game_records WHERE id IN (${idPlaceholders})`,
    gameIds,
  );
  return rows.map(recordRowToGame);
}

type BasicGameWrite = {
  summary: BasicGameSummary;
  gameJson: string;
};

function toBasicGameWrite(game: SavedGame): BasicGameWrite {
  return { summary: deriveBasicGameSummary(game), gameJson: JSON.stringify(game) };
}

async function writeBasicGame(db: SQLite.SQLiteDatabase, { summary, gameJson }: BasicGameWrite) {
  await db.runAsync(
    `INSERT OR REPLACE INTO basic_game_summaries (
      id,
      schema_version,
      created_at,
      sort_timestamp,
      team1_id,
      team1_name,
      team2_name,
      team1_score,
      team2_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    summary.id,
    summary.schemaVersion,
    summary.createdAt,
    summary.sortTimestamp,
    summary.team1Id,
    summary.team1Name,
    summary.team2Name,
    summary.team1Score,
    summary.team2Score,
  );
  await db.runAsync(
    `INSERT OR REPLACE INTO basic_game_records (id, schema_version, data_json)
      VALUES (?, ?, ?)`,
    summary.id,
    summary.schemaVersion,
    gameJson,
  );
}

/** Saves every game or none of them. */
export async function upsertBasicGames(games: SavedGame[]): Promise<void> {
  const writes = games.map(toBasicGameWrite);

  await enqueueWrite(async () => {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const write of writes) {
        await writeBasicGame(db, write);
      }
    });
  });
}

/**
 * Makes the games AsyncStorage held the stored games, the first time it is called on a device;
 * later calls change nothing. It replaces what is stored because a copy made by an earlier build
 * may hold games deleted since.
 */
export async function importAsyncStorageGamesOnce(games: SavedGame[]): Promise<void> {
  await enqueueWrite(async () => {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      const completedImport = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM basic_game_async_storage_import',
      );
      if (completedImport != null) return;

      await db.runAsync('DELETE FROM basic_game_summaries');
      await db.runAsync('DELETE FROM basic_game_records');
      for (const game of games) {
        await writeBasicGame(db, toBasicGameWrite(game));
      }
      // Recorded with the games, so the import can never be half done.
      await db.runAsync(
        'INSERT INTO basic_game_async_storage_import (id, imported_at) VALUES (1, ?)',
        Date.now(),
      );
    });
  });
}

export async function deleteBasicGames(gameIds: string[]): Promise<void> {
  const idPlaceholders = gameIds.map(() => '?').join(', ');

  await enqueueWrite(async () => {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `DELETE FROM basic_game_summaries WHERE id IN (${idPlaceholders})`,
        gameIds,
      );
      await db.runAsync(`DELETE FROM basic_game_records WHERE id IN (${idPlaceholders})`, gameIds);
    });
  });
}

// Writes run one at a time: a transaction cannot start while another is open on the connection.
function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(task);
  writeQueue = next.catch(() => undefined);
  return next;
}
