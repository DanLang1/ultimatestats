import { normalizeHalftimeMarkers } from '@/lib/halftimeUtils';
import { SavedGame } from '../types';
import type { SavedGameMigration } from './index';

export const SAVED_GAME_MIGRATION_V3_STAMP_HALFTIME: SavedGameMigration = {
  toVersion: 3,
  migrate: migrateSavedGameToV3StampHalftime,
};

export function migrateSavedGameToV3StampHalftime(game: SavedGame): SavedGame {
  const autoHalftimeEnabled = game.autoHalftimeEnabled ?? true;
  const events = normalizeHalftimeMarkers(game.events, game.gameTo, autoHalftimeEnabled);

  if (
    game.schemaVersion === 3 &&
    game.autoHalftimeEnabled === autoHalftimeEnabled &&
    events === game.events
  ) {
    return game;
  }

  return {
    ...game,
    schemaVersion: 3,
    autoHalftimeEnabled,
    events,
  };
}

export function normalizeSavedGameHalftimeFields(game: SavedGame): SavedGame {
  const autoHalftimeEnabled = game.autoHalftimeEnabled ?? true;
  const events = normalizeHalftimeMarkers(game.events, game.gameTo, autoHalftimeEnabled);

  if (game.autoHalftimeEnabled === autoHalftimeEnabled && events === game.events) {
    return game;
  }

  return {
    ...game,
    autoHalftimeEnabled,
    events,
  };
}
