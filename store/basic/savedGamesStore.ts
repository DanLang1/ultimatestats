import { produce } from 'immer';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import {
  deleteBasicGames,
  importAsyncStorageGamesOnce,
  loadAllBasicGames,
  upsertBasicGames,
} from '@/lib/basic/savedGameStorage';
import { SavedGame } from '@/lib/storage';
import { migrateSavedGame, migrateSavedGames } from '@/lib/storage/migrations';

import { EventUpdates } from './gameStore.types';
import { applyEventUpdates } from './slices/gameStoreHelpers';

/** Whether `savedGames` holds the games from SQLite yet. */
type SavedGamesLoadStatus = 'loading' | 'loaded' | 'failed';

type SavedBasicGamesState = {
  savedGames: SavedGame[];
  savedGamesLoadStatus: SavedGamesLoadStatus;
  /**
   * Fills `savedGames` from SQLite. On the first run on a device it first moves
   * `asyncStorageSavedGames`, the games AsyncStorage held, into SQLite.
   */
  loadSavedGames: (asyncStorageSavedGames: SavedGame[]) => Promise<void>;
  /** Adds the game, or replaces the saved game with its id. */
  saveGame: (game: SavedGame) => Promise<void>;
  deleteGames: (gameIds: string[]) => Promise<void>;
  importGame: (game: SavedGame) => Promise<void>;
  updateSavedGameEvent: (
    gameId: string,
    eventIndex: number,
    updates: EventUpdates,
  ) => Promise<void>;
  deleteSavedGameEvent: (gameId: string, eventIndex: number) => Promise<boolean>;
  updateSavedGamePlayedAt: (gameId: string, playedAt: number) => Promise<void>;
};

// Saved basic games are stored in SQLite. Every action writes there first and updates this store
// only once that write succeeds, so a failed save never shows as saved. Actions that also change
// the game in progress live on `useGameStore` and call into this store.
export const useSavedBasicGamesStore = create<SavedBasicGamesState>()(
  immer((set, get) => ({
    savedGames: [],
    savedGamesLoadStatus: 'loading',

    loadSavedGames: async (asyncStorageSavedGames) => {
      const { games: gamesToImport } = migrateSavedGames(asyncStorageSavedGames);
      try {
        await importAsyncStorageGamesOnce(gamesToImport);
        const savedGames = await loadAllBasicGames();
        set({ savedGames, savedGamesLoadStatus: 'loaded' });
      } catch (error) {
        // The AsyncStorage games stay in use, as they were before SQLite.
        set({ savedGames: gamesToImport, savedGamesLoadStatus: 'failed' });
        throw error;
      }
    },

    saveGame: async (game) => {
      await upsertBasicGames([game]);
      set((state) => {
        const savedGameIndex = state.savedGames.findIndex((savedGame) => savedGame.id === game.id);
        if (savedGameIndex >= 0) {
          state.savedGames[savedGameIndex] = game;
        } else {
          state.savedGames.push(game);
        }
      });
    },

    deleteGames: async (gameIds) => {
      const deletedGameIds = new Set(gameIds);
      await deleteBasicGames(gameIds);
      set((state) => {
        state.savedGames = state.savedGames.filter((game) => !deletedGameIds.has(game.id));
      });
    },

    importGame: async (game) => {
      await get().saveGame(migrateSavedGame(game));
    },

    updateSavedGameEvent: async (gameId, eventIndex, updates) => {
      const game = get().savedGames.find((g) => g.id === gameId);
      if (!game) return;

      const event = game.events[eventIndex];
      if (!event) return;

      const events = produce(game.events, (draft) => applyEventUpdates(draft, eventIndex, updates));
      await get().saveGame({ ...game, events });
    },

    deleteSavedGameEvent: async (gameId, eventIndex) => {
      const game = get().savedGames.find((g) => g.id === gameId);
      if (!game) return false;

      const event = game.events[eventIndex];
      if (!event) return false;

      if (event.type === 'goal') return false;

      const updatedEvents = [...game.events];
      updatedEvents.splice(eventIndex, 1);
      await get().saveGame({ ...game, events: updatedEvents });
      return true;
    },

    updateSavedGamePlayedAt: async (gameId, playedAt) => {
      const game = get().savedGames.find((g) => g.id === gameId);
      if (!game) return;

      await get().saveGame({ ...game, playedAt });
    },
  })),
);
