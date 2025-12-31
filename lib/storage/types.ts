// Types for persistent storage - designed for easy migration to SQLite later

import { GameEvent, TurnoverType } from '@/store/gameStore.types';
export type { GameEvent, TurnoverType };

export interface SavedGame {
  id: string;
  createdAt: number; // timestamp
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  team1Roster: string[];
  events: GameEvent[];
  gameTo: number;
  gameLength: number;
  startingPossession: 'team1' | 'team2';
}

export interface SavedTeam {
  id: string;
  name: string;
  roster: string[];
  lastUsed: number; // timestamp
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
