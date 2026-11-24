import { replacePointLineRecords } from '@/lib/lineUtils';
import { CURRENT_SCHEMA_VERSION, SavedGame } from '@/lib/storage';
import { migrateSavedGame } from '@/lib/storage/migrations';
import { generateId } from '@/lib/utils';

import { useSettingsStore } from '../../settingsStore';
import { GameSliceCreator, GameState, SavedGamesSlice, TurnoverType } from '../gameStore.types';
import { canReplacePointLine, resetGameState } from './gameStoreHelpers';

export const createSavedGamesSlice: GameSliceCreator<SavedGamesSlice> = (set, get) => ({
  savedGames: [],

  replaceSavedGamePointLine: async (
    gameId: string,
    pointNumber: number,
    playerIds: string[],
  ): Promise<boolean> => {
    let didReplace = false;
    // Zustand Persist returns the AsyncStorage write promise from set() at runtime,
    // although set is typed as void. Await persisted updates before callers navigate
    // or clear related state. Covered by basicGameStorePersistence.test.ts.
    await set((state: GameState) => {
      const game = state.savedGames.find((savedGame) => savedGame.id === gameId);
      if (!game) return;

      const pointLines = game.pointLines ?? [];
      if (!canReplacePointLine(pointLines, pointNumber, playerIds, game.team1.roster)) return;

      const isCurrentGame = state.currentGameId === gameId;
      if (isCurrentGame) {
        if (pointNumber >= state.currentPoint) return;
        if (
          !canReplacePointLine(state.pointLines, pointNumber, playerIds, state.currentTeam.roster)
        ) {
          return;
        }
      }

      const timestamp = Date.now();
      game.pointLines = replacePointLineRecords(pointLines, pointNumber, playerIds, timestamp);
      if (isCurrentGame) {
        state.pointLines = replacePointLineRecords(
          state.pointLines,
          pointNumber,
          playerIds,
          timestamp,
        );
      }
      didReplace = true;
    });
    return didReplace;
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

    await set((state: GameState) => {
      const idx = state.savedGames.findIndex((g) => g.id === gameId);
      state.savedGames[idx] = updatedGame;
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

    await set((state: GameState) => {
      const idx = state.savedGames.findIndex((g) => g.id === gameId);
      state.savedGames[idx] = updatedGame;
    });
    return true;
  },

  updateSavedGamePlayedAt: async (gameId: string, playedAt: number) => {
    const game = get().savedGames.find((g) => g.id === gameId);
    if (!game) return;

    const updatedGame: SavedGame = { ...game, playedAt };

    await set((state: GameState) => {
      const idx = state.savedGames.findIndex((g) => g.id === gameId);
      state.savedGames[idx] = updatedGame;
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
      team1: state.currentTeam,
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
    await set((draft: GameState) => {
      const idx = draft.savedGames.findIndex((g) => g.id === gameId);
      if (idx >= 0) {
        draft.savedGames[idx] = game;
      } else {
        draft.savedGames.push(game);
      }
      draft.currentGameId = gameId; // Remember ID for subsequent saves
    });
  },

  deleteSavedGame: async (id: string) => {
    const shouldClearCurrentFinishedGame =
      get().currentGameStatus === 'finished' && get().currentGameId === id;
    const hardCapMinutes = useSettingsStore.getState().hardCapMins;

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
    await set((state: GameState) => {
      const idx = state.savedGames.findIndex((g) => g.id === migrated.id);
      if (idx >= 0) {
        state.savedGames[idx] = migrated;
      } else {
        state.savedGames.push(migrated);
      }
    });
  },
});
