import {
  deleteBasicGames,
  importAsyncStorageGamesOnce,
  loadAllBasicGames,
  upsertBasicGames,
} from '@/lib/basic/savedGameStorage';
import { replacePointLineRecords } from '@/lib/lineUtils';
import { CURRENT_SCHEMA_VERSION, SavedGame } from '@/lib/storage';
import { migrateSavedGame } from '@/lib/storage/migrations';
import { generateId } from '@/lib/utils';

import { useSettingsStore } from '../../settingsStore';
import { getCurrentTeam } from '../../teamStore';
import { GameSliceCreator, GameState, SavedGamesSlice, TurnoverType } from '../gameStore.types';
import { canReplacePointLine, putSavedGame, resetGameState } from './gameStoreHelpers';

// Saved games are stored in SQLite. Every action writes there first and updates this store only
// once that write succeeds, so a failed save never shows as saved.
//
// Zustand Persist returns the AsyncStorage write promise from set() at runtime, although set is
// typed as void. Await persisted updates before callers navigate or clear related state. Covered
// by basicGameStorePersistence.test.ts.
export const createSavedGamesSlice: GameSliceCreator<SavedGamesSlice> = (set, get) => ({
  savedGames: [],

  loadSavedGames: async () => {
    await importAsyncStorageGamesOnce(get().savedGames);
    const savedGames = await loadAllBasicGames();
    await set({ savedGames });
  },

  replaceSavedGamePointLine: async (
    gameId: string,
    pointNumber: number,
    playerIds: string[],
  ): Promise<boolean> => {
    const state = get();
    const game = state.savedGames.find((savedGame) => savedGame.id === gameId);
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

    await upsertBasicGames([updatedGame]);
    await set((draft: GameState) => {
      putSavedGame(draft, updatedGame);
      if (isCurrentGame) {
        draft.pointLines = replacePointLineRecords(
          draft.pointLines,
          pointNumber,
          playerIds,
          timestamp,
        );
      }
    });
    return true;
  },

  updateSavedGameEvent: async (
    gameId: string,
    eventIndex: number,
    updates: {
      playerId?: string | null;
      player2Id?: string | null;
      subtype?: TurnoverType;
      team?: 'team1' | 'team2';
      goalPlayerId?: string | null;
      assistPlayerId?: string | null;
      elapsedMs?: number | null;
    },
  ) => {
    const game = get().savedGames.find((g) => g.id === gameId);
    if (!game) return;

    const event = game.events[eventIndex];
    if (!event) return;

    const updatedEvents = [...game.events];

    let updatedEvent;
    if (event.type === 'turnover') {
      updatedEvent = { ...event };
      if (updates.playerId !== undefined) updatedEvent.playerId = updates.playerId;
      if (updates.player2Id !== undefined) updatedEvent.player2Id = updates.player2Id;
      if (updates.subtype !== undefined) updatedEvent.subtype = updates.subtype;
      if (updates.team !== undefined) updatedEvent.team = updates.team;
    } else if (event.type === 'goal') {
      updatedEvent = { ...event };
      const isCallahan = event.assistPlayerId === 'OTHER_TEAM';

      if (updates.goalPlayerId !== undefined) updatedEvent.goalPlayerId = updates.goalPlayerId;
      if (updates.assistPlayerId !== undefined)
        updatedEvent.assistPlayerId = updates.assistPlayerId;

      // For Callahans: also update our block immediately before (edits can leave another event there)
      if (isCallahan && updates.goalPlayerId !== undefined && eventIndex > 0) {
        const prevEvent = game.events[eventIndex - 1];
        if (
          prevEvent.type === 'turnover' &&
          prevEvent.subtype === 'block' &&
          prevEvent.team === 'team1'
        ) {
          updatedEvents[eventIndex - 1] = { ...prevEvent, playerId: updates.goalPlayerId };
        }
      }
    } else {
      updatedEvent = { ...event };
    }

    if (updates.elapsedMs !== undefined) {
      if (updates.elapsedMs === null) {
        delete updatedEvent.elapsedMs;
      } else {
        updatedEvent.elapsedMs = updates.elapsedMs;
      }
    }

    updatedEvents[eventIndex] = updatedEvent;
    const updatedGame: SavedGame = { ...game, events: updatedEvents };

    await upsertBasicGames([updatedGame]);
    await set((state: GameState) => {
      putSavedGame(state, updatedGame);
    });
  },

  deleteSavedGameEvent: async (gameId: string, eventIndex: number): Promise<boolean> => {
    const game = get().savedGames.find((g) => g.id === gameId);
    if (!game) return false;

    const event = game.events[eventIndex];
    if (!event) return false;

    if (event.type === 'goal') return false;

    const updatedEvents = [...game.events];
    updatedEvents.splice(eventIndex, 1);
    const updatedGame: SavedGame = { ...game, events: updatedEvents };

    await upsertBasicGames([updatedGame]);
    await set((state: GameState) => {
      putSavedGame(state, updatedGame);
    });
    return true;
  },

  updateSavedGamePlayedAt: async (gameId: string, playedAt: number) => {
    const game = get().savedGames.find((g) => g.id === gameId);
    if (!game) return;

    const updatedGame: SavedGame = { ...game, playedAt };

    await upsertBasicGames([updatedGame]);
    await set((state: GameState) => {
      putSavedGame(state, updatedGame);
    });
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
    await upsertBasicGames([game]);
    await set((draft: GameState) => {
      putSavedGame(draft, game);
      draft.currentGameId = gameId; // Remember ID for subsequent saves
    });
  },

  deleteSavedGame: async (id: string) => {
    const shouldClearCurrentFinishedGame =
      get().currentGameStatus === 'finished' && get().currentGameId === id;
    const hardCapMinutes = useSettingsStore.getState().hardCapMins;

    await deleteBasicGames([id]);
    await set((state: GameState) => {
      state.savedGames = state.savedGames.filter((g) => g.id !== id);
      if (shouldClearCurrentFinishedGame) {
        resetGameState(state, hardCapMinutes);
      }
    });
    if (shouldClearCurrentFinishedGame) {
      useSettingsStore.getState().setFirstPointRatio(null);
    }
  },

  deleteSavedGames: async (ids: string[]) => {
    const idSet = new Set(ids);
    const currentGameId = get().currentGameId;
    const shouldClearCurrentFinishedGame =
      get().currentGameStatus === 'finished' && currentGameId !== null && idSet.has(currentGameId);
    const hardCapMinutes = useSettingsStore.getState().hardCapMins;

    await deleteBasicGames(ids);
    await set((state: GameState) => {
      state.savedGames = state.savedGames.filter((g) => !idSet.has(g.id));
      if (shouldClearCurrentFinishedGame) {
        resetGameState(state, hardCapMinutes);
      }
    });
    if (shouldClearCurrentFinishedGame) {
      useSettingsStore.getState().setFirstPointRatio(null);
    }
  },

  importGame: async (game: SavedGame) => {
    const migrated = migrateSavedGame(game);
    await upsertBasicGames([migrated]);
    await set((state: GameState) => {
      putSavedGame(state, migrated);
    });
  },
});
