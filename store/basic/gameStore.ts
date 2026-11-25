import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { reportHydrationError } from '@/lib/sentry';
import { migrateSavedGames } from '@/lib/storage/migrations';

import { GameState } from './gameStore.types';
import { createLiveGameSlice } from './slices/liveGameSlice';
import { createSavedGamesSlice } from './slices/savedGamesSlice';

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
          // Legacy 2.6.x team keys, written back exactly as hydrated.
          // TODO: remove before this ships. See LegacyPersistedTeamKeys.
          currentTeam: state.currentTeam,
          savedTeams: state.savedTeams,
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
        }),
      },
    ),
  ),
);
