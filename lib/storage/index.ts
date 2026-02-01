// Storage singleton - swap implementation here to migrate to SQLite later
export { asyncStorageAdapter as storage } from './asyncStorageAdapter';
export { CURRENT_SCHEMA_VERSION } from './types';
export type {
  GameEvent,
  LinePreset,
  Player,
  PointLineRecord,
  SavedGame,
  SavedTeam,
  Storage,
  TurnoverType,
} from './types';
