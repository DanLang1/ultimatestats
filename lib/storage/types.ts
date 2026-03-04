// Types for persistent storage - designed for easy migration to SQLite later

import { GameEvent, TurnoverType } from '@/store/gameStore.types';
export type { GameEvent, TurnoverType };

export const CURRENT_SCHEMA_VERSION = 4;

export interface SavedGame {
  id: string;
  schemaVersion: number; // For future migrations - always set to CURRENT_SCHEMA_VERSION on save
  createdAt: number; // timestamp
  team1: SavedTeam; // My team (id, name, roster)
  team2Name: string;
  team1Score: number;
  team2Score: number;
  events: GameEvent[];
  autoHalftimeEnabled?: boolean; // Defaults to true for legacy saved games
  gameTo: number;
  gameLength: number;
  startingPossession: 'team1' | 'team2';
  pointStartTimestamps?: Record<number, number>; // { [pointNumber]: timestamp when point started }
  pointLines?: PointLineRecord[]; // Line records per point - added in schema v2
  team1Color?: string; // hex color snapshot at save time - optional, falls back to theme default
  team2Color?: string; // hex color snapshot at save time - optional, falls back to theme default
  importedAt?: number; // timestamp when this game was imported via sharing
}

export type MatchingType = 'fmp' | 'mmp';
export type PlayerRole = 'handler' | 'cutter' | 'hybrid';

export interface Player {
  id: string;
  name: string;
  isActive: boolean;
  matchingType: MatchingType | null; // null = not set, 'fmp' = female matching, 'mmp' = male matching
  role: PlayerRole | null; // null = not set
}

export interface SavedTeam {
  id: string;
  name: string;
  roster: Player[];
  // Future: add updatedAt/importedAt for cloud sync and import tracking
}

// Storage interface - implement this for different storage backends
export interface GameStorage {
  saveGame(game: SavedGame): Promise<void>;
  loadGames(): Promise<SavedGame[]>;
  deleteGame(id: string): Promise<void>;
  deleteGames(ids: string[]): Promise<void>;
}

export interface TeamStorage {
  saveTeam(team: SavedTeam): Promise<void>;
  loadTeams(): Promise<SavedTeam[]>;
  deleteTeam(id: string): Promise<void>;
  getTeam(id: string): Promise<SavedTeam | null>;
}

// Combined storage interface
export interface Storage extends GameStorage, TeamStorage {}

// Line Calling Types
export interface LinePreset {
  id: string;
  name: string; // "O-Line", "D-Line", "Pod A"
  playerIds: string[];
  teamId: string;
}

export interface PointLineRecord {
  pointNumber: number;
  playerIds: string[];
  timestamp: number;
  isSubstitution?: boolean; // true if mid-point sub
  substitutionType?: 'injury';
  subbedInPlayerIds?: string[];
  subbedOutPlayerIds?: string[];
}
