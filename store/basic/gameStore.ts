import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { reportHydrationError } from '@/lib/sentry';
import { migrateSavedGames } from '@/lib/storage/migrations';

import { GameState } from './gameStore.types';
import { createLiveGameSlice } from './slices/liveGameSlice';
import { createSavedGamesSlice } from './slices/savedGamesSlice';
import { createTeamSlice } from './slices/teamSlice';

export {
  hasPlayerRecordedActionsInActiveAdvancedGame,
  registerActiveAdvancedGameGetter,
} from './slices/teamSlice';

// Basic games and the shared team/roster. Advanced game state and advanced saved records never live
// here; advanced code only reads team and roster data from this store.
export const useGameStore = create<GameState>()(
  immer(
    persist(
      (...sliceArgs) => ({
        ...createTeamSlice(...sliceArgs),
        ...createLiveGameSlice(...sliceArgs),
        ...createSavedGamesSlice(...sliceArgs),
      }),
      {
        name: 'ultimatestats-game-storage',
        version: 0,
        storage: createJSONStorage(() => AsyncStorage),
        onRehydrateStorage: () => (state, error) => {
          reportHydrationError('basic-game', error);
          if (!state?.savedGames?.length) return;
          const { games, didChange } = migrateSavedGames(state.savedGames);
          if (didChange) {
            useGameStore.setState({ savedGames: games });
          }
        },
        // Only persist game-related state, not UI state like pending entries
        partialize: (state: GameState) => ({
          currentTeam: state.currentTeam,
          team2Name: state.team2Name,
          team1BgColor: state.team1BgColor,
          team2BgColor: state.team2BgColor,
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
          savedGames: state.savedGames,
          savedTeams: state.savedTeams,
          pointTimerEnabled: state.pointTimerEnabled,
          currentPointStartTime: state.currentPointStartTime,
          pointStartTimestamps: state.pointStartTimestamps,
          pointTimerPausedElapsed: state.pointTimerPausedElapsed,
          pendingTimeoutModal: state.pendingTimeoutModal,
          timeoutEndTime: state.timeoutEndTime,
          timeoutTimeLeft: state.timeoutTimeLeft,
          currentLine: state.currentLine,
          pointLines: state.pointLines,
        }),
      },
    ),
  ),
);
