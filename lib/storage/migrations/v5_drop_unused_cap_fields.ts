import { SavedGame } from '../types';
import type { SavedGameMigration } from './index';

const LEGACY_CAP_FIELDS = ['gameLength', 'hardCapMins'] as const;

export const SAVED_GAME_MIGRATION_V5_DROP_UNUSED_CAP_FIELDS: SavedGameMigration = {
  toVersion: 5,
  migrate: migrateSavedGameToV5DropUnusedCapFields,
};

export function dropLegacyCapFields(game: SavedGame): Omit<SavedGame, 'schemaVersion'> {
  const { schemaVersion, ...rest } = game;
  const result = { ...rest };
  for (const key of LEGACY_CAP_FIELDS) {
    delete (result as Record<string, unknown>)[key];
  }
  return result;
}

export function migrateSavedGameToV5DropUnusedCapFields(game: SavedGame): SavedGame {
  return {
    ...dropLegacyCapFields(game),
    schemaVersion: 5,
  };
}
