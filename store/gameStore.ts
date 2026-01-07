import { checkGameOver } from '@/lib/gameUtils';
import { CURRENT_SCHEMA_VERSION, SavedGame, SavedTeam, storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { palette } from '@/theme/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { GameState, TurnoverType } from './gameStore.types';

export const useGameStore = create<GameState>()(
  immer(
    persist(
      (set, get) => ({
        // Teams - default to Team 1 so addPlayer always has a team to work with
        currentTeam: { id: generateId(), name: 'Team 1', roster: [] },
        team2Name: 'Team 2',

        // Team colors and game state
        team1BgColor: palette.surface,
        team2BgColor: palette.primary,
        team1Score: 0,
        team2Score: 0,
        team1Timeouts: [true, true],
        team2Timeouts: [true, true],
        team1Floater: true,
        team2Floater: true,
        floaterEnabled: true,
        autoHalftimeEnabled: true,
        gameHalf: 1,
        gameTo: 15,
        baseGameTo: 15,
        gameLength: 90,
        isSoftCap: false,
        softCapPending: false,
        softCapMins: 20,
        timerIsActive: false,
        timerEndTime: null,
        timerTimeLeft: 90 * 60,
        gameLocked: false,

        // Stat Tracking Initial State
        statTrackingEnabled: false,
        events: [], // Unified event log
        pendingStatEntry: null,

        // Turnover Tracking Initial State
        possession: null,
        startingPossession: null,
        pendingTurnoverEntry: null,

        // Point tracking for timeline
        currentPoint: 1,

        // Saved Games & Teams Initial State
        savedGames: [],
        savedTeams: [],

        setCurrentTeam: (team: SavedTeam) =>
          set((state: GameState) => {
            state.currentTeam = team;
          }),

        setTeam2Name: (name: string) =>
          set((state: GameState) => {
            state.team2Name = name;
          }),

        setTeamBgColor: (team: 'team1' | 'team2', color: string) =>
          set((state: GameState) => {
            if (team === 'team1') state.team1BgColor = color;
            else state.team2BgColor = color;
          }),

        setFloaterEnabled: (enabled: boolean) =>
          set((state: GameState) => {
            state.floaterEnabled = enabled;
          }),

        setAutoHalftimeEnabled: (enabled: boolean) =>
          set((state: GameState) => {
            state.autoHalftimeEnabled = enabled;
          }),

        setGameTo: (gameTo: number) =>
          set((state: GameState) => {
            state.gameTo = gameTo;
            state.baseGameTo = gameTo;
          }),

        setGameLength: (minutes: number) =>
          set((state: GameState) => {
            state.gameLength = minutes;
            state.timerTimeLeft = minutes * 60;
          }),

        incrementScore: (isTeam1: boolean) => {
          let didIncrement = false;
          set((state: GameState) => {
            // Guard: If game is already over, don't allow any more scoring
            // This prevents race conditions where rapid taps could let both teams reach gameTo
            const gameOver = checkGameOver({
              team1Score: state.team1Score,
              team2Score: state.team2Score,
              gameTo: state.gameTo,
              timerTimeLeft: state.timerTimeLeft,
            });
            if (gameOver) return;

            const currentScore = isTeam1 ? state.team1Score : state.team2Score;
            const newScore = currentScore + 1;
            const halftimeScore = Math.ceil(state.gameTo / 2);
            const isHalftimeGoal =
              state.autoHalftimeEnabled && state.gameHalf === 1 && newScore === halftimeScore;

            // Update score FIRST
            if (isTeam1) state.team1Score = newScore;
            else state.team2Score = newScore;

            didIncrement = true;

            // Soft Cap Logic - per USAU 6.D.1:
            // "At the soft cap, play continues until the current scoring attempt is completed.
            //  If, after the current scoring attempt is completed, the game total has not yet
            //  been reached by one team, one is added to the higher score and the resulting
            //  number is the new game total."
            // gameTo is calculated AFTER the point completes (after score increment)
            if (state.softCapPending && !state.isSoftCap) {
              state.isSoftCap = true;
              state.softCapPending = false;
              const highestScore = Math.max(state.team1Score, state.team2Score);
              state.gameTo = highestScore + 1;
            }

            // Halftime: reset timeouts
            if (isHalftimeGoal) {
              state.gameHalf = 2;
              state.team1Timeouts.fill(true);
              state.team2Timeouts.fill(true);
            }

            state.currentPoint++;

            // Early return if stat tracking is disabled
            if (!state.statTrackingEnabled) {
              state.events.push({
                type: 'goal',
                team: isTeam1 ? 'team1' : 'team2',
                goalPlayerId: null,
                assistPlayerId: null,
              });
              return;
            }

            // --- Stat tracking enabled below ---

            // Set possession: halftime flips to non-starting team, otherwise to non-scoring team
            if (isHalftimeGoal) {
              state.possession = state.startingPossession === 'team1' ? 'team2' : 'team1';
            } else {
              state.possession = isTeam1 ? 'team2' : 'team1';
            }

            // Team1 goal: open stat entry sheet to record goal/assist
            if (isTeam1) {
              state.pendingStatEntry = { team: 'team1', pointNumber: newScore };
            } else {
              // Team2 goal: record immediately (no player details needed)
              state.events.push({
                type: 'goal',
                team: 'team2',
                goalPlayerId: null,
                assistPlayerId: null,
              });
            }
          });
          return didIncrement;
        },

        undoLastAction: () => {
          let result = false;
          set((state: GameState) => {
            const lastEvent = state.events[state.events.length - 1];
            if (!lastEvent) {
              result = false;
              return;
            }

            if (lastEvent.type === 'goal') {
              const isTeam1 = lastEvent.team === 'team1';
              const targetScore = isTeam1 ? state.team1Score : state.team2Score;

              if (targetScore <= 0) {
                result = false;
                return;
              }

              if (isTeam1) state.team1Score--;
              else state.team2Score--;

              state.possession = lastEvent.team;
              state.pendingStatEntry = null;
              state.currentPoint = Math.max(1, state.currentPoint - 1);
            } else {
              // Turnover: flip possession back
              state.possession = state.possession === 'team1' ? 'team2' : 'team1';
              state.pendingTurnoverEntry = null;
            }

            state.gameLocked = false;
            state.events.pop();
            result = true;
          });
          return result;
        },

        toggleTimeout: (isTeam1: boolean, index: number) =>
          set((state: GameState) => {
            const timeouts = isTeam1 ? state.team1Timeouts : state.team2Timeouts;
            const isFloaterActive = isTeam1 ? state.team1Floater : state.team2Floater;

            if (index < timeouts.length) {
              timeouts[index] = !timeouts[index];
            } else {
              const hasAvailableStandard = timeouts.some((t) => t === true);
              if (isFloaterActive && hasAvailableStandard) return;

              if (isTeam1) state.team1Floater = !state.team1Floater;
              else state.team2Floater = !state.team2Floater;
            }
          }),

        resetTimeouts: (count: number) =>
          set((state: GameState) => {
            state.team1Timeouts = new Array(count).fill(true);
            state.team2Timeouts = new Array(count).fill(true);
          }),

        resetGame: () =>
          set((state: GameState) => {
            state.team1Score = 0;
            state.team2Score = 0;
            state.team1Timeouts.fill(true);
            state.team2Timeouts.fill(true);
            state.team1Floater = true;
            state.team2Floater = true;
            state.gameHalf = 1;
            state.isSoftCap = false;
            state.softCapPending = false;
            state.gameTo = state.baseGameTo;
            state.events = [];
            state.pendingStatEntry = null;
            state.possession = null;
            state.startingPossession = null;
            state.pendingTurnoverEntry = null;
            state.currentPoint = 1;
            state.timerIsActive = false;
            state.timerEndTime = null;
            state.timerTimeLeft = state.gameLength * 60;
            state.gameLocked = false;
          }),
        setSoftCapPending: (pending: boolean) =>
          set((state: GameState) => {
            state.softCapPending = pending;
          }),

        setSoftCapMins: (minutes: number) =>
          set((state: GameState) => {
            state.softCapMins = minutes;
          }),

        setTimerActive: (active: boolean) =>
          set((state: GameState) => {
            state.timerIsActive = active;
          }),

        setTimerEndTime: (time: number | null) =>
          set((state: GameState) => {
            state.timerEndTime = time;
          }),

        setTimerTimeLeft: (seconds: number) =>
          set((state: GameState) => {
            state.timerTimeLeft = seconds;
          }),

        setGameLocked: (locked: boolean) =>
          set((state: GameState) => {
            state.gameLocked = locked;
          }),

        // Stat Tracking Actions
        setStatTrackingEnabled: (enabled: boolean) =>
          set((state: GameState) => {
            state.statTrackingEnabled = enabled;
          }),

        addPlayer: (name: string) => {
          const trimmedName = name.trim();
          if (!trimmedName) return null;
          // Check if name already exists (case-insensitive)
          const state = get();
          const lowerName = trimmedName.toLowerCase();
          if (state.currentTeam.roster.some((p) => p.name.toLowerCase() === lowerName)) return null;
          const newId = generateId();
          set((s: GameState) => {
            s.currentTeam.roster.push({
              id: newId,
              name: trimmedName,
              isActive: true,
            });
          });
          return newId;
        },

        addGoalEvent: (event: {
          team: 'team1' | 'team2';
          goalPlayerId: string | null;
          assistPlayerId: string | null;
        }) =>
          set((state: GameState) => {
            state.events.push({
              type: 'goal',
              team: event.team,
              goalPlayerId: event.goalPlayerId,
              assistPlayerId: event.assistPlayerId,
            });
            state.pendingStatEntry = null;
          }),

        clearPendingStatEntry: () =>
          set((state: GameState) => {
            state.pendingStatEntry = null;
          }),

        clearRoster: () =>
          set((state: GameState) => {
            if (!state.currentTeam) return;
            state.currentTeam.roster = [];
            state.events = [];
          }),

        // Turnover Tracking Actions
        setPossession: (team: 'team1' | 'team2') =>
          set((state: GameState) => {
            state.possession = team;
            if (state.startingPossession === null) {
              state.startingPossession = team;
            }
          }),

        triggerTurnover: () =>
          set((state: GameState) => {
            if (state.possession === null) return;
            const receivingTeam = state.possession === 'team1' ? 'team2' : 'team1';
            state.pendingTurnoverEntry = { receivingTeam };
          }),

        addTurnoverEvent: (event: {
          team: 'team1' | 'team2';
          subtype: TurnoverType;
          playerId: string | null;
          player2Id?: string | null;
        }) =>
          set((state: GameState) => {
            state.events.push({
              type: 'turnover',
              team: event.team,
              subtype: event.subtype,
              playerId: event.playerId,
              player2Id: event.player2Id,
            });
            state.possession = state.possession === 'team1' ? 'team2' : 'team1';
            state.pendingTurnoverEntry = null;
          }),

        clearPendingTurnoverEntry: () =>
          set((state: GameState) => {
            state.pendingTurnoverEntry = null;
            state.possession = state.possession === 'team1' ? 'team2' : 'team1';
          }),

        // Saved Games & Teams Actions
        loadSavedGames: async () => {
          const games = await storage.loadGames();
          set((state: GameState) => {
            state.savedGames = games;
          });
        },

        loadSavedTeams: async () => {
          const teams = await storage.loadTeams();
          set((state: GameState) => {
            state.savedTeams = teams;
          });
        },

        saveCurrentGame: async () => {
          const state = get();
          const gameId = generateId();
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
            gameTo: state.gameTo,
            gameLength: state.gameLength,
            startingPossession: state.startingPossession ?? 'team1',
          };
          await storage.saveGame(game);
          const games = await storage.loadGames();
          set((state: GameState) => {
            state.savedGames = games;
          });
        },

        deleteSavedGame: async (id: string) => {
          await storage.deleteGame(id);
          const games = await storage.loadGames();
          set((state: GameState) => {
            state.savedGames = games;
          });
        },

        saveCurrentTeam: async () => {
          const state = get();
          const team = state.currentTeam;

          await storage.saveTeam(team);
          const teams = await storage.loadTeams();
          set((state: GameState) => {
            state.savedTeams = teams;
          });
        },

        deleteTeam: async (id: string) => {
          await storage.deleteTeam(id);
          const teams = await storage.loadTeams();
          set((state: GameState) => {
            state.savedTeams = teams;
          });
        },

        loadTeam: (teamId: string) => {
          const team = get().savedTeams.find((t) => t.id === teamId);
          if (!team) return;
          set((state: GameState) => {
            // Deep copy to avoid mutating savedTeams
            state.currentTeam = {
              id: team.id,
              name: team.name,
              roster: team.roster.map((p) => ({ ...p })),
            };
          });
        },
      }),
      {
        name: 'ultimatestats-game-storage',
        storage: createJSONStorage(() => AsyncStorage),
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
          gameLength: state.gameLength,
          isSoftCap: state.isSoftCap,
          softCapPending: state.softCapPending,
          softCapMins: state.softCapMins,
          timerTimeLeft: state.timerTimeLeft,
          gameLocked: state.gameLocked,
          statTrackingEnabled: state.statTrackingEnabled,
          events: state.events,
          currentPoint: state.currentPoint,
          possession: state.possession,
          startingPossession: state.startingPossession,
          savedGames: state.savedGames,
          savedTeams: state.savedTeams,
        }),
      },
    ),
  ),
);
