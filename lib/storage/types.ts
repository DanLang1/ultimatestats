// Types for persistent storage - designed for easy migration to SQLite later

import { GameEvent, TurnoverType } from '@/store/basic/gameStore.types';
export type { GameEvent, TurnoverType };

export const CURRENT_SCHEMA_VERSION = 6;

export interface SavedGame {
  id: string;
  schemaVersion: number; // For future migrations - always set to CURRENT_SCHEMA_VERSION on save
  createdAt: number; // timestamp
  playedAt?: number; // timestamp when the game was actually played; UI falls back to createdAt
  team1: SavedTeam; // My team (id, name, roster)
  team2Name: string;
  team1Score: number;
  team2Score: number;
  events: GameEvent[];
  autoHalftimeEnabled?: boolean; // Defaults to true for legacy saved games
  gameTo: number;
  startingPossession: 'team1' | 'team2';
  pointStartTimestamps?: Record<number, number>; // { [pointNumber]: timestamp when point started }
  pointLines?: PointLineRecord[]; // Line records per point - added in schema v2
  team1Color?: string; // hex color snapshot at save time - optional, falls back to theme default
  team2Color?: string; // hex color snapshot at save time - optional, falls back to theme default
  importedAt?: number; // timestamp when this game was imported via sharing
  tournamentId?: string; // optional link to a Tournament
}

export type MatchingType = 'fmp' | 'mmp';
export type PlayerRole = 'handler' | 'cutter' | 'hybrid';

export interface Player {
  id: string;
  name: string;
  number?: string;
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

export type TournamentKind = 'basic' | 'advanced';

export interface Tournament {
  id: string;
  schemaVersion: number;
  kind: TournamentKind | null;
  name: string;
  startDate: string; // ISO date string, e.g. "2026-03-12"
  endDate: string; // ISO date string, e.g. "2026-03-14"
  createdAt: number;
  updatedAt: number;
}

export interface TournamentGameLink {
  id: string;
  schemaVersion: number;
  tournamentId: string;
  gameKind: TournamentKind;
  gameId: string;
  createdAt: number;
}

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
