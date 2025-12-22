import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedGame, SavedTeam, Storage } from './types';

const GAMES_KEY = 'ultimatestats_games';
const TEAMS_KEY = 'ultimatestats_teams';

// Generate a simple unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const asyncStorageAdapter: Storage = {
  // Game Storage
  async saveGame(game: SavedGame): Promise<void> {
    const games = await this.loadGames();
    // Add ID if not present
    const gameToSave = game.id ? game : { ...game, id: generateId() };
    games.push(gameToSave);
    await AsyncStorage.setItem(GAMES_KEY, JSON.stringify(games));
  },

  async loadGames(): Promise<SavedGame[]> {
    const data = await AsyncStorage.getItem(GAMES_KEY);
    return data ? JSON.parse(data) : [];
  },

  async deleteGame(id: string): Promise<void> {
    const games = await this.loadGames();
    const filtered = games.filter((g) => g.id !== id);
    await AsyncStorage.setItem(GAMES_KEY, JSON.stringify(filtered));
  },

  async getGame(id: string): Promise<SavedGame | null> {
    const games = await this.loadGames();
    return games.find((g) => g.id === id) || null;
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
};
