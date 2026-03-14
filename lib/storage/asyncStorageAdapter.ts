import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../utils';
import { SavedGamesStorageCorruptionError } from './errors';
import { migrateSavedGame } from './migrations';
import type { SavedGame, SavedTeam, Storage, Tournament } from './types';

const GAMES_KEY = 'ultimatestats_games';
const TEAMS_KEY = 'ultimatestats_teams';
const TOURNAMENTS_KEY = 'ultimatestats_tournaments';
const GAMES_QUARANTINE_KEY = 'ultimatestats_games_quarantine';

export const SAVED_GAMES_STORAGE_KEY = GAMES_KEY;
export const SAVED_GAMES_QUARANTINE_KEY = GAMES_QUARANTINE_KEY;

interface QuarantinedSavedGame {
  index: number;
  gameId: string | null;
  reason: string;
  rawGame: unknown;
}

interface ParsedGamesResult {
  games: SavedGame[];
  didChange: boolean;
  quarantinedGames: QuarantinedSavedGame[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getGameId(value: unknown): string | null {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null;
  }

  return value.id;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown saved-game migration error';
}

function parseGamesPayload(data: string | null): ParsedGamesResult {
  if (!data) {
    return {
      games: [],
      didChange: false,
      quarantinedGames: [],
    };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(data);
  } catch (error) {
    throw new SavedGamesStorageCorruptionError(
      `Saved games storage is unreadable: ${getErrorMessage(error)}`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new SavedGamesStorageCorruptionError(
      'Saved games storage is unreadable: payload is not an array',
    );
  }

  let didChange = false;
  const games: SavedGame[] = [];
  const quarantinedGames: QuarantinedSavedGame[] = [];

  parsed.forEach((rawGame, index) => {
    try {
      const migratedGame = migrateSavedGame(rawGame as SavedGame);
      if (migratedGame !== rawGame) {
        didChange = true;
      }
      games.push(migratedGame);
    } catch (error) {
      didChange = true;
      quarantinedGames.push({
        index,
        gameId: getGameId(rawGame),
        reason: getErrorMessage(error),
        rawGame,
      });
      console.error('Failed to migrate saved game; quarantining entry.', error);
    }
  });

  return {
    games,
    didChange,
    quarantinedGames,
  };
}

async function parseGamesFromStorage(): Promise<ParsedGamesResult> {
  const data = await AsyncStorage.getItem(GAMES_KEY);
  return parseGamesPayload(data);
}

async function persistQuarantinedGames(quarantinedGames: QuarantinedSavedGame[]): Promise<void> {
  if (quarantinedGames.length === 0) {
    return;
  }

  try {
    await AsyncStorage.setItem(
      GAMES_QUARANTINE_KEY,
      JSON.stringify({
        failedAt: Date.now(),
        games: quarantinedGames,
      }),
    );
  } catch (error) {
    console.error('Failed to persist quarantined saved games.', error);
  }
}

export const asyncStorageAdapter: Storage = {
  // Game Storage
  async saveGame(game: SavedGame): Promise<void> {
    const { games, quarantinedGames } = await parseGamesFromStorage();
    // Add ID if not present
    const gameToSave = migrateSavedGame(game.id ? game : { ...game, id: generateId() });
    // Update existing game or add new
    const existingIndex = games.findIndex((g) => g.id === gameToSave.id);
    if (existingIndex >= 0) {
      games[existingIndex] = gameToSave;
    } else {
      games.push(gameToSave);
    }
    await persistQuarantinedGames(quarantinedGames);
    await AsyncStorage.setItem(GAMES_KEY, JSON.stringify(games));
  },

  async loadGames(): Promise<SavedGame[]> {
    const { games, didChange, quarantinedGames } = await parseGamesFromStorage();

    await persistQuarantinedGames(quarantinedGames);
    if (didChange) {
      await AsyncStorage.setItem(GAMES_KEY, JSON.stringify(games));
    }

    return games;
  },

  async deleteGame(id: string): Promise<void> {
    const { games, quarantinedGames } = await parseGamesFromStorage();
    const filtered = games.filter((g) => g.id !== id);
    await persistQuarantinedGames(quarantinedGames);
    await AsyncStorage.setItem(GAMES_KEY, JSON.stringify(filtered));
  },

  async deleteGames(ids: string[]): Promise<void> {
    const { games, quarantinedGames } = await parseGamesFromStorage();
    const idSet = new Set(ids);
    const filtered = games.filter((g) => !idSet.has(g.id));
    await persistQuarantinedGames(quarantinedGames);
    await AsyncStorage.setItem(GAMES_KEY, JSON.stringify(filtered));
  },

  // Team Storage
  async saveTeam(team: SavedTeam): Promise<void> {
    const teams = await this.loadTeams();
    // Update existing team or add new
    const existingIndex = teams.findIndex((t) => t.id === team.id);
    if (existingIndex >= 0) {
      teams[existingIndex] = team;
    } else {
      const teamToSave = team.id ? team : { ...team, id: generateId() };
      teams.push(teamToSave);
    }
    await AsyncStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  },

  async loadTeams(): Promise<SavedTeam[]> {
    const data = await AsyncStorage.getItem(TEAMS_KEY);
    return data ? JSON.parse(data) : [];
  },

  async deleteTeam(id: string): Promise<void> {
    const teams = await this.loadTeams();
    const filtered = teams.filter((t) => t.id !== id);
    await AsyncStorage.setItem(TEAMS_KEY, JSON.stringify(filtered));
  },

  async getTeam(id: string): Promise<SavedTeam | null> {
    const teams = await this.loadTeams();
    return teams.find((t) => t.id === id) || null;
  },

  // Tournament Storage
  async saveTournament(tournament: Tournament): Promise<void> {
    const tournaments = await this.loadTournaments();
    const tournamentToSave = tournament.id ? tournament : { ...tournament, id: generateId() };
    const existingIndex = tournaments.findIndex((t) => t.id === tournamentToSave.id);
    if (existingIndex >= 0) {
      tournaments[existingIndex] = tournamentToSave;
    } else {
      tournaments.push(tournamentToSave);
    }
    await AsyncStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(tournaments));
  },

  async loadTournaments(): Promise<Tournament[]> {
    const data = await AsyncStorage.getItem(TOURNAMENTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  async deleteTournament(id: string): Promise<void> {
    const tournaments = await this.loadTournaments();
    const filtered = tournaments.filter((t) => t.id !== id);
    await AsyncStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(filtered));
  },
};
