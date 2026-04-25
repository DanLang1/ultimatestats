import { CURRENT_SCHEMA_VERSION, SavedGame } from '../types';
import {
  SAVED_GAME_MIGRATION_V3_STAMP_HALFTIME,
  normalizeSavedGameHalftimeFields,
} from './v3_stamp_halftime';
import { SAVED_GAME_MIGRATION_V4_NOOP } from './v4_noop';
import { SAVED_GAME_MIGRATION_V5_DROP_UNUSED_CAP_FIELDS } from './v5_drop_unused_cap_fields';
import { SAVED_GAME_MIGRATION_V6_DROP_UNUSED_CAP_FIELDS } from './v6_drop_unused_cap_fields';

export interface SavedGameMigration {
  toVersion: number;
  migrate: (game: SavedGame) => SavedGame;
}

const SAVED_GAME_MIGRATIONS: SavedGameMigration[] = [
  SAVED_GAME_MIGRATION_V3_STAMP_HALFTIME,
  SAVED_GAME_MIGRATION_V4_NOOP,
  SAVED_GAME_MIGRATION_V5_DROP_UNUSED_CAP_FIELDS,
  SAVED_GAME_MIGRATION_V6_DROP_UNUSED_CAP_FIELDS,
];

assertMigrationCoverage();

function assertMigrationCoverage() {
  if (SAVED_GAME_MIGRATIONS.length === 0) {
    throw new Error(
      `Missing saved game migrations: current schema is v${CURRENT_SCHEMA_VERSION} but migration list is empty`,
    );
  }

  for (let i = 1; i < SAVED_GAME_MIGRATIONS.length; i++) {
    const prev = SAVED_GAME_MIGRATIONS[i - 1];
    const next = SAVED_GAME_MIGRATIONS[i];
    if (next.toVersion !== prev.toVersion + 1) {
      throw new Error(
        `Saved game migrations must be consecutive: found v${prev.toVersion} followed by v${next.toVersion}`,
      );
    }
  }

  const latestMigrationVersion = SAVED_GAME_MIGRATIONS[SAVED_GAME_MIGRATIONS.length - 1].toVersion;

  if (latestMigrationVersion !== CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Saved game migration coverage mismatch: latest migration is v${latestMigrationVersion}, current schema is v${CURRENT_SCHEMA_VERSION}`,
    );
  }
}

function getSavedGameSchemaVersion(game: SavedGame): number {
  return game.schemaVersion;
}

export function migrateSavedGame(game: SavedGame): SavedGame {
  let migratedGame = game;
  let schemaVersion = getSavedGameSchemaVersion(game);

  for (const migration of SAVED_GAME_MIGRATIONS) {
    if (schemaVersion < migration.toVersion) {
      migratedGame = migration.migrate(migratedGame);
      schemaVersion = migration.toVersion;
    }
  }

  if (schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Saved game failed to migrate to current schema: got v${schemaVersion}, expected v${CURRENT_SCHEMA_VERSION}`,
    );
  }

  return normalizeSavedGameHalftimeFields(migratedGame);
}

export function migrateSavedGames(games: SavedGame[]): {
  games: SavedGame[];
  didChange: boolean;
} {
  let didChange = false;

  const migratedGames = games.map((game) => {
    const migratedGame = migrateSavedGame(game);
    if (migratedGame !== game) {
      didChange = true;
    }
    return migratedGame;
  });

  return {
    games: migratedGames,
    didChange,
  };
}
