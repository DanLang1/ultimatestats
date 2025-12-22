// Storage singleton - swap implementation here to migrate to SQLite later
export { asyncStorageAdapter as storage } from './asyncStorageAdapter';
export type { SavedGame, SavedTeam, Storage } from './types';
