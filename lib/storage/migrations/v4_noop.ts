import { SavedGame } from '../types';
import type { SavedGameMigration } from './index';

export const SAVED_GAME_MIGRATION_V4_NOOP: SavedGameMigration = {
  toVersion: 4,
  migrate: migrateSavedGameToV4Noop,
};

export function migrateSavedGameToV4Noop(game: SavedGame): SavedGame {
  if (game.schemaVersion === 4) {
    return game;
  }

  return {
    ...game,
    schemaVersion: 4,
  };
}
