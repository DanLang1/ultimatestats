import { CURRENT_SCHEMA_VERSION, SavedGame } from '../types';
import { SAVED_GAME_MIGRATION_V3_STAMP_HALFTIME, sanitizeSavedGameV3 } from './v3_stamp_halftime';

export interface SavedGameMigration {
  toVersion: number;
  migrate: (game: SavedGame) => SavedGame;
}

const SAVED_GAME_MIGRATIONS: SavedGameMigration[] = [SAVED_GAME_MIGRATION_V3_STAMP_HALFTIME];

function getSavedGameSchemaVersion(game: SavedGame): number {
  return game.schemaVersion;
}

function assertMigrationCoverage() {
  if (SAVED_GAME_MIGRATIONS.length === 0) {
    return;
  }

  const latestMigrationVersion = SAVED_GAME_MIGRATIONS[SAVED_GAME_MIGRATIONS.length - 1].toVersion;

  if (latestMigrationVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Saved game migrations are ahead of the current schema: latest migration is v${latestMigrationVersion}, current schema is v${CURRENT_SCHEMA_VERSION}`,
    );
  }
}

export function migrateSavedGame(game: SavedGame): SavedGame {
  assertMigrationCoverage();

  let migratedGame = game;
  let schemaVersion = getSavedGameSchemaVersion(game);

  for (const migration of SAVED_GAME_MIGRATIONS) {
    if (schemaVersion < migration.toVersion) {
      migratedGame = migration.migrate(migratedGame);
      schemaVersion = migration.toVersion;
    }
  }

  if (schemaVersion >= 3) {
    return sanitizeSavedGameV3(migratedGame);
  }

  return migratedGame;
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
