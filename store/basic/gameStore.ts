import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { reportHydrationError } from '@/lib/sentry';
import type { SavedGame } from '@/lib/storage/types';
import { isRecord } from '@/lib/utils';

import { GameState } from './gameStore.types';
import { createLiveGameSlice } from './slices/liveGameSlice';
import { createSavedGamesSlice } from './slices/savedGamesSlice';

// The entry is this store's own write, so its saved games are only checked to be a list.
function isSavedGameList(value: unknown): value is SavedGame[] {
  return Array.isArray(value);
}

// Basic games only. Teams and rosters live in `store/teamStore.ts`; advanced game state and advanced
// saved records never live here.
export const useGameStore = create<GameState>()(
  immer(
    persist(
      (...sliceArgs) => ({
        ...createLiveGameSlice(...sliceArgs),
        ...createSavedGamesSlice(...sliceArgs),
      }),
      {
        name: 'ultimatestats-game-storage',
        version: 0,
        storage: createJSONStorage(() => AsyncStorage),
        onRehydrateStorage: () => (_state, error) => {
          reportHydrationError('basic-game', error);
        },
        // The entry's `savedGames` are the pre-SQLite copy, not this store's saved games.
        merge: (persistedEntry, currentState) => {
          if (!isRecord(persistedEntry)) return currentState;
          const {
            savedGames: asyncStorageSavedGames,
            team1BgColor,
            team2BgColor,
            ...persistedLiveGame
          } = persistedEntry;
          const mergedState: GameState = {
            ...currentState,
            ...persistedLiveGame,
            asyncStorageSavedGames: isSavedGameList(asyncStorageSavedGames)
              ? asyncStorageSavedGames
              : null,
          };
          // Entries written before the pre-game settings moved to the settings store hold the team
          // colors, and the rest of those settings as live-game fields.
          const hasLegacyPreGameSettings =
            typeof team1BgColor === 'string' && typeof team2BgColor === 'string';
          if (!hasLegacyPreGameSettings) return mergedState;

          return {
            ...mergedState,
            legacyPreGameSettings: {
              team1Color: team1BgColor,
              team2Color: team2BgColor,
              otherSideTeamName: mergedState.team2Name,
              gameTo: mergedState.baseGameTo,
              timeoutsPerHalf: mergedState.team1Timeouts.length,
              autoHalftimeEnabled: mergedState.autoHalftimeEnabled,
              floaterEnabled: mergedState.floaterEnabled,
            },
          };
        },
        // Only persist game-related state, not UI state like pending entries
        partialize: (state: GameState) => {
          // Saved games live in SQLite. Until a start has loaded them from there, the entry
          // keeps the games it held, so a failed move to SQLite cannot lose them.
          const hasAsyncStorageSavedGames = state.asyncStorageSavedGames != null;
          // Likewise the team colors, which mark the pre-game settings as not yet moved, stay
          // until the settings store has them.
          const { legacyPreGameSettings } = state;
          const legacyTeamColors =
            legacyPreGameSettings == null
              ? {}
              : {
                  team1BgColor: legacyPreGameSettings.team1Color,
                  team2BgColor: legacyPreGameSettings.team2Color,
                };

          return {
            team2Name: state.team2Name,
            team1Score: state.team1Score,
            team2Score: state.team2Score,
            team1Timeouts: state.team1Timeouts,
            team2Timeouts: state.team2Timeouts,
            team1Floater: state.team1Floater,
            team2Floater: state.team2Floater,
            floaterEnabled: state.floaterEnabled,
            autoHalftimeEnabled: state.autoHalftimeEnabled,
            gameHalf: state.gameHalf,
            gameTo: state.gameTo,
            baseGameTo: state.baseGameTo,
            isSoftCap: state.isSoftCap,
            softCapPending: state.softCapPending,
            // The running deadline is persisted so the hard cap keeps counting across a restart.
            timerEndTime: state.timerEndTime,
            timerTimeLeft: state.timerTimeLeft,
            currentGameStatus: state.currentGameStatus,
            isPostGameFlowPending: state.isPostGameFlowPending,
            currentGameId: state.currentGameId,
            isHalftimeBreak: state.isHalftimeBreak,
            halftimeEndTime: state.halftimeEndTime,
            halftimeTimeLeft: state.halftimeTimeLeft,
            statTrackingEnabled: state.statTrackingEnabled,
            events: state.events,
            currentPoint: state.currentPoint,
            possession: state.possession,
            startingPossession: state.startingPossession,
            pointTimerEnabled: state.pointTimerEnabled,
            currentPointStartTime: state.currentPointStartTime,
            pointStartTimestamps: state.pointStartTimestamps,
            pointTimerPausedElapsed: state.pointTimerPausedElapsed,
            pendingTimeoutModal: state.pendingTimeoutModal,
            timeoutEndTime: state.timeoutEndTime,
            timeoutTimeLeft: state.timeoutTimeLeft,
            currentLine: state.currentLine,
            pointLines: state.pointLines,
            lineConfirmedForNextPoint: state.lineConfirmedForNextPoint,
            ...(hasAsyncStorageSavedGames ? { savedGames: state.asyncStorageSavedGames } : {}),
            ...legacyTeamColors,
          };
        },
      },
    ),
  ),
);
