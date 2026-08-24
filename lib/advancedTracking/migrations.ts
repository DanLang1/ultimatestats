import {
  ADVANCED_TRACKING_SCHEMA_VERSION,
  type AdvancedTrackedGame,
} from '@/lib/advancedTracking/types';

export function migrateAdvancedTrackedGame(game: AdvancedTrackedGame): AdvancedTrackedGame {
  if (game.schemaVersion > ADVANCED_TRACKING_SCHEMA_VERSION) {
    throw new Error(
      `Advanced game schema version ${game.schemaVersion} is newer than supported version ${ADVANCED_TRACKING_SCHEMA_VERSION}.`,
    );
  }

  if (game.schemaVersion === ADVANCED_TRACKING_SCHEMA_VERSION) {
    return game;
  }

  // Throw details and private game/point notes are optional in schema 3, so older records only
  // need their version stamped. Missing notes intentionally remain absent.
  return { ...game, schemaVersion: ADVANCED_TRACKING_SCHEMA_VERSION };
}
