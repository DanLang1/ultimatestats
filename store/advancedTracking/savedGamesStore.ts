import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import {
  deleteAdvancedGameRecord,
  loadAdvancedGame,
  loadAdvancedGameSummaries,
  upsertAdvancedGame,
} from '@/lib/advancedTracking/storage';
import type { AdvancedGameSummary } from '@/lib/advancedTracking/summary';
import { compareAdvancedGameSummaries } from '@/lib/advancedTracking/summary';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';

type SavedAdvancedGamesState = {
  summaries: AdvancedGameSummary[];
  summariesLoaded: boolean;
  gamesById: Record<string, AdvancedTrackedGame>;
  loadSummaries: () => Promise<AdvancedGameSummary[]>;
  loadGame: (gameId: string) => Promise<AdvancedTrackedGame | null>;
  loadGames: (gameIds: string[]) => Promise<AdvancedTrackedGame[]>;
  saveGame: (
    game: AdvancedTrackedGame,
    options?: SaveAdvancedGameOptions,
  ) => Promise<AdvancedGameSummary>;
  deleteGame: (gameId: string) => Promise<void>;
};

type SaveAdvancedGameOptions = {
  touchUpdatedAt?: boolean;
};

let summariesLoadPromise: Promise<AdvancedGameSummary[]> | null = null;
const gameLoadPromises = new Map<string, Promise<AdvancedTrackedGame | null>>();

function upsertSummary(
  summaries: AdvancedGameSummary[],
  summary: AdvancedGameSummary,
): AdvancedGameSummary[] {
  const next = summaries.filter((candidate) => candidate.id !== summary.id);
  next.push(summary);
  return next.sort(compareAdvancedGameSummaries);
}

export const useSavedAdvancedGamesStore = create<SavedAdvancedGamesState>()(
  immer((set, get) => ({
    summaries: [],
    summariesLoaded: false,
    gamesById: {},

    loadSummaries: async () => {
      if (get().summariesLoaded) {
        return get().summaries;
      }

      if (summariesLoadPromise == null) {
        summariesLoadPromise = loadAdvancedGameSummaries()
          .then((summaries) => {
            set((state) => {
              state.summaries = summaries;
              state.summariesLoaded = true;
            });
            return summaries;
          })
          .finally(() => {
            summariesLoadPromise = null;
          });
      }

      return summariesLoadPromise;
    },

    loadGame: async (gameId) => {
      const cachedGame = get().gamesById[gameId];
      if (cachedGame != null) {
        return cachedGame;
      }

      let loadPromise = gameLoadPromises.get(gameId);
      if (loadPromise == null) {
        loadPromise = loadAdvancedGame(gameId)
          .then((game) => {
            if (game != null) {
              set((state) => {
                state.gamesById[game.id] = game;
              });
            }
            return game;
          })
          .finally(() => {
            gameLoadPromises.delete(gameId);
          });
        gameLoadPromises.set(gameId, loadPromise);
      }

      return loadPromise;
    },

    loadGames: async (gameIds) => {
      const uniqueIds = [...new Set(gameIds)];
      await Promise.all(uniqueIds.map((gameId) => get().loadGame(gameId)));

      const nextGamesById = get().gamesById;
      return uniqueIds
        .map((gameId) => nextGamesById[gameId])
        .filter((game): game is AdvancedTrackedGame => game != null);
    },

    saveGame: async (game, options) => {
      const gameToSave = options?.touchUpdatedAt ? { ...game, updatedAt: Date.now() } : game;
      const summary = await upsertAdvancedGame(gameToSave);
      set((state) => {
        if (state.summariesLoaded) {
          state.summaries = upsertSummary(state.summaries, summary);
        }
        state.gamesById[gameToSave.id] = gameToSave;
      });
      return summary;
    },

    deleteGame: async (gameId) => {
      await deleteAdvancedGameRecord(gameId);
      set((state) => {
        if (state.summariesLoaded) {
          state.summaries = state.summaries.filter((summary) => summary.id !== gameId);
        }
        delete state.gamesById[gameId];
      });
    },
  })),
);
