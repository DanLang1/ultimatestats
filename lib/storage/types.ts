// Types for persistent storage - designed for easy migration to SQLite later

import { GameEvent, TurnoverType } from '@/store/gameStore.types';
export type { GameEvent, TurnoverType };

export const CURRENT_SCHEMA_VERSION = 1;

export interface SavedGame {
  id: string;
  schemaVersion: number; // For future migrations - always set to CURRENT_SCHEMA_VERSION on save
  createdAt: number; // timestamp
  team1: SavedTeam; // My team (id, name, roster)
  team2Name: string;
  team1Score: number;
  team2Score: number;
  events: GameEvent[];
  gameTo: number;
  gameLength: number;
  startingPossession: 'team1' | 'team2';
  pointStartTimestamps?: Record<number, number>; // { [pointNumber]: timestamp when point started }
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
}

// Storage interface - implement this for different storage backends
export interface GameStorage {
  saveGame(game: SavedGame): Promise<void>;
  loadGames(): Promise<SavedGame[]>;
  deleteGame(id: string): Promise<void>;
  getGame(id: string): Promise<SavedGame | null>;
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
}
