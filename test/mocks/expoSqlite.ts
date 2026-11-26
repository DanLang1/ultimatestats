import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import type { SQLiteBindParams, SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

/**
 * A stand-in for `expo-sqlite` that runs real SQL in Node's built-in SQLite, so a storage test
 * executes its schema, migrations, and queries instead of asserting on SQL strings.
 *
 * `test/setup.ts` installs one instance for every test and keeps it across `jest.resetModules()`,
 * as a device keeps its files across an app restart; its rows are deleted after each test.
 *
 * Databases are in memory and keyed by name, like files on a device. A storage test that needs a
 * clean install mocks `expo-sqlite` with a fresh `jest.requireActual` of this module.
 *
 * Only the `expo-sqlite` methods the app's storage code calls are implemented; add one here when
 * storage code starts using it. The SQLite version is Node's, not the device's, so this proves the
 * SQL and migrations are correct, not device behaviour.
 */
export type InMemorySQLiteDatabase = Pick<
  SQLiteDatabase,
  'execAsync' | 'runAsync' | 'getAllAsync' | 'getFirstAsync' | 'withTransactionAsync'
>;

/** `expo-sqlite` takes bind values either spread out or as one list. */
type BindArguments = SQLiteBindValue[] | [SQLiteBindParams];

const databasesByName = new Map<string, InMemorySQLiteDatabase>();
const nodeDatabases: DatabaseSync[] = [];

/**
 * Empties every table of every open database and keeps the tables, so storage code that has
 * already opened a database carries on against an empty one. Not part of `expo-sqlite`.
 */
export function deleteAllRowsInEveryDatabase() {
  for (const db of nodeDatabases) {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all();
    for (const table of tables) {
      db.exec(`DELETE FROM "${String(table.name)}"`);
    }
  }
}

function toNodeBindValue(value: SQLiteBindValue): SQLInputValue {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return value;
}

function toNodeBindValues(bindArguments: BindArguments): SQLInputValue[] {
  const [firstArgument] = bindArguments;
  const bindValues = Array.isArray(firstArgument) ? firstArgument : bindArguments;

  return bindValues.map((value) => {
    const isNamedParams =
      typeof value === 'object' &&
      value !== null &&
      !(value instanceof Uint8Array) &&
      !(value instanceof ArrayBuffer);
    if (isNamedParams || Array.isArray(value)) {
      throw new Error('The expo-sqlite test adapter supports positional bind values only.');
    }
    return toNodeBindValue(value);
  });
}

// `expo-sqlite` lets the caller name the row type without checking it, so the unchecked type
// parameter and cast are the API's own.
// eslint-disable-next-line typescript/no-unnecessary-type-parameters
function toRow<Row>(nodeRow: Record<string, unknown>): Row {
  // node:sqlite returns rows with a null prototype; copy them into plain objects as expo-sqlite does.
  // eslint-disable-next-line typescript/no-unsafe-type-assertion
  return { ...nodeRow } as Row;
}

function createInMemoryDatabase(): InMemorySQLiteDatabase {
  const db = new DatabaseSync(':memory:');
  nodeDatabases.push(db);

  return {
    execAsync: async (source) => {
      db.exec(source);
    },

    runAsync: async (source: string, ...bindArguments: BindArguments) => {
      const { lastInsertRowid, changes } = db
        .prepare(source)
        .run(...toNodeBindValues(bindArguments));
      return { lastInsertRowId: Number(lastInsertRowid), changes: Number(changes) };
    },

    getAllAsync: async <Row>(source: string, ...bindArguments: BindArguments) =>
      db
        .prepare(source)
        .all(...toNodeBindValues(bindArguments))
        .map((nodeRow) => toRow<Row>(nodeRow)),

    getFirstAsync: async <Row>(source: string, ...bindArguments: BindArguments) => {
      const nodeRow = db.prepare(source).get(...toNodeBindValues(bindArguments));
      return nodeRow === undefined ? null : toRow<Row>(nodeRow);
    },

    withTransactionAsync: async (task) => {
      // BEGIN sits inside the try as in expo-sqlite, so a failed BEGIN also rolls back.
      try {
        db.exec('BEGIN');
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

/** Opening the same name again returns the same database, as reopening a file would. */
export async function openDatabaseAsync(databaseName: string): Promise<InMemorySQLiteDatabase> {
  const openDatabase = databasesByName.get(databaseName);
  if (openDatabase) return openDatabase;

  const database = createInMemoryDatabase();
  databasesByName.set(databaseName, database);
  return database;
}
