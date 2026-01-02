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
}

export interface SavedTeam {
  id: string;
  name: string;
  roster: string[];
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
