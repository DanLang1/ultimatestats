import { SavedGame } from '../types';
import type { SavedGameMigration } from './index';
import { dropLegacyCapFields } from './v5_drop_unused_cap_fields';

export const SAVED_GAME_MIGRATION_V6_DROP_UNUSED_CAP_FIELDS: SavedGameMigration = {
  toVersion: 6,
  migrate: migrateSavedGameToV6DropUnusedCapFields,
};

export function migrateSavedGameToV6DropUnusedCapFields(game: SavedGame): SavedGame {
  return {
    ...dropLegacyCapFields(game),
    schemaVersion: 6,
  };
}
