// Storage singleton - swap implementation here to migrate to SQLite later
export { asyncStorageAdapter as storage } from './asyncStorageAdapter';
export type { GameEvent, SavedGame, SavedTeam, Storage, TurnoverType } from './types';
