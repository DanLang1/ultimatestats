// Storage singleton - swap implementation here to migrate to SQLite later
export { asyncStorageAdapter as storage } from './asyncStorageAdapter';
export { isSavedGamesStorageCorruptionError, SavedGamesStorageCorruptionError } from './errors';
export { CURRENT_SCHEMA_VERSION } from './types';
export type {
  GameEvent,
  LinePreset,
  Player,
  PointLineRecord,
  SavedGame,
  SavedTeam,
  Storage,
  Tournament,
  TurnoverType,
} from './types';
