import { replacePointLineRecords } from '@/lib/lineUtils';
import { CURRENT_SCHEMA_VERSION, SavedGame } from '@/lib/storage';
import { generateId } from '@/lib/utils';

import { useSettingsStore } from '../../settingsStore';
import { getCurrentTeam } from '../../teamStore';
import { GameSliceCreator, GameState, SavedGamesSlice } from '../gameStore.types';
import { useSavedBasicGamesStore } from '../savedGamesStore';
import { canReplacePointLine, resetGameState } from './gameStoreHelpers';

// The saved-game actions that also change the game in progress. The saved game goes to SQLite
// through `useSavedBasicGamesStore` before this store changes, so a failed save never shows as saved.
//
// Zustand Persist returns the AsyncStorage write promise from set() at runtime, although set is
// typed as void. Await persisted updates before callers navigate or clear related state. Covered
// by basicGameStorePersistence.test.ts.
export const createSavedGamesSlice: GameSliceCreator<SavedGamesSlice> = (set, get) => ({
  asyncStorageSavedGames: null,

  dropAsyncStorageSavedGames: async () => {
    await set({ asyncStorageSavedGames: null });
  },

  replaceSavedGamePointLine: async (
    gameId: string,
    pointNumber: number,
    playerIds: string[],
  ): Promise<boolean> => {
    const state = get();
    const { savedGames, saveGame } = useSavedBasicGamesStore.getState();
    const game = savedGames.find((savedGame) => savedGame.id === gameId);
    if (!game) return false;

    const pointLines = game.pointLines ?? [];
    if (!canReplacePointLine(pointLines, pointNumber, playerIds, game.team1.roster)) return false;

    const isCurrentGame = state.currentGameId === gameId;
    if (isCurrentGame) {
      if (pointNumber >= state.currentPoint) return false;
      if (!canReplacePointLine(state.pointLines, pointNumber, playerIds, getCurrentTeam().roster)) {
        return false;
      }
    }

    const timestamp = Date.now();
    const updatedGame: SavedGame = {
      ...game,
      pointLines: replacePointLineRecords(pointLines, pointNumber, playerIds, timestamp),
    };

    await saveGame(updatedGame);
    if (isCurrentGame) {
      await set((draft: GameState) => {
        draft.pointLines = replacePointLineRecords(
          draft.pointLines,
          pointNumber,
          playerIds,
          timestamp,
        );
      });
    }
    return true;
  },

  saveCurrentGame: async () => {
    const state = get();
    // Use existing gameId if we've already saved this game (e.g., after undo+re-win)
    const gameId = state.currentGameId ?? generateId();
    // Stamp gameId on all events for aggregation lookups
    const eventsWithGameId = state.events.map((event) => ({
      ...event,
      gameId,
    }));
    const game: SavedGame = {
      id: gameId,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: Date.now(),
      team1: getCurrentTeam(),
      team2Name: state.team2Name,
      team1Score: state.team1Score,
      team2Score: state.team2Score,
      events: eventsWithGameId,
      autoHalftimeEnabled: state.autoHalftimeEnabled,
      gameTo: state.gameTo,
      startingPossession: state.startingPossession ?? 'team1',
      pointStartTimestamps: state.pointStartTimestamps,
      pointLines: state.pointLines,
      team1Color: state.team1BgColor,
      team2Color: state.team2BgColor,
    };
    await useSavedBasicGamesStore.getState().saveGame(game);
    await set({ currentGameId: gameId }); // Remember ID for subsequent saves
  },

  deleteSavedGame: async (id: string) => {
    await get().deleteSavedGames([id]);
  },

  deleteSavedGames: async (ids: string[]) => {
    const idSet = new Set(ids);
    const currentGameId = get().currentGameId;
    const shouldClearCurrentFinishedGame =
      get().currentGameStatus === 'finished' && currentGameId !== null && idSet.has(currentGameId);
    const hardCapMinutes = useSettingsStore.getState().hardCapMins;

    await useSavedBasicGamesStore.getState().deleteGames(ids);
    if (shouldClearCurrentFinishedGame) {
      await set((state: GameState) => {
        resetGameState(state, hardCapMinutes);
      });
      useSettingsStore.getState().setFirstPointRatio(null);
    }
  },
});
