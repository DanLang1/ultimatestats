import { SavedGame, SavedTeam, storage } from '@/lib/storage';
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
        team1Name: 'Team 1',
        team2Name: 'Team 2',
        team1BgColor: palette.surface,
        team2BgColor: palette.primary,
        team1Score: 0,
        team2Score: 0,
        team1Timeouts: [true, true],
        team2Timeouts: [true, true],
        team1Floater: true,
        team2Floater: true,
        floaterEnabled: true,
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

        // Stat Tracking Initial State
        statTrackingEnabled: false,
        team1Roster: [],
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

        setTeamNames: (team1: string, team2: string) =>
          set((state: GameState) => {
            state.team1Name = team1;
            state.team2Name = team2;
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

        incrementScore: (isTeam1: boolean) =>
          set((state: GameState) => {
            const currentScore = isTeam1 ? state.team1Score : state.team2Score;
            if (currentScore >= state.gameTo) return;

            const newScore = currentScore + 1;
            const halftimeScore = Math.ceil(state.gameTo / 2);

            if (isTeam1) state.team1Score = newScore;
            else state.team2Score = newScore;

            // Automatic Halftime Logic
            if (state.gameHalf === 1 && newScore === halftimeScore) {
              state.gameHalf = 2;
              state.team1Timeouts.fill(true);
              state.team2Timeouts.fill(true);
              if (state.statTrackingEnabled) {
                state.possession = state.startingPossession === 'team1' ? 'team2' : 'team1';
              }
            }

            // Soft Cap Logic
            if (state.softCapPending && !state.isSoftCap) {
              const highestScore = Math.max(state.team1Score, state.team2Score);
              state.isSoftCap = true;
              state.softCapPending = false;
              state.gameTo = Math.min(highestScore + 1, state.gameTo);
            }

            // Stat Tracking: Set pending entry if tracking is enabled and it's team1
            if (state.statTrackingEnabled && isTeam1) {
              state.pendingStatEntry = { team: 'team1', pointNumber: newScore };
            } else {
              // Record goal immediately (no player details needed or stat tracking off)
              state.events.push({
                type: 'goal',
                team: isTeam1 ? 'team1' : 'team2',
                goal: null,
                assist: null,
              });
            }

            // After a goal, possession goes to the other team (they receive the pull)
            const justReachedHalftime = state.gameHalf === 1 && newScore === halftimeScore;
            if (state.statTrackingEnabled && !justReachedHalftime) {
              state.possession = isTeam1 ? 'team2' : 'team1';
            }

            state.currentPoint++;
          }),

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
          }),

        triggerSoftCap: () =>
          set((state: GameState) => {
            if (state.isSoftCap) return;
            const highestScore = Math.max(state.team1Score, state.team2Score);
            state.isSoftCap = true;
            state.gameTo = highestScore + 1;
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

        // Stat Tracking Actions
        setStatTrackingEnabled: (enabled: boolean) =>
          set((state: GameState) => {
            state.statTrackingEnabled = enabled;
          }),

        addPlayer: (name: string) =>
          set((state: GameState) => {
            const trimmedName = name.trim();
            if (!trimmedName) return;
            if (state.team1Roster.includes(trimmedName)) return;
            state.team1Roster.push(trimmedName);
          }),

        addGoalEvent: (event: {
          team: 'team1' | 'team2';
          goal: string | null;
          assist: string | null;
        }) =>
          set((state: GameState) => {
            state.events.push({
              type: 'goal',
              team: event.team,
              goal: event.goal,
              assist: event.assist,
            });
            state.pendingStatEntry = null;
          }),

        clearPendingStatEntry: () =>
          set((state: GameState) => {
            state.pendingStatEntry = null;
          }),

        clearRoster: () =>
          set((state: GameState) => {
            state.team1Roster = [];
            state.events = [];
          }),

        setRoster: (team: 'team1' | 'team2', roster: string[]) =>
          set((state: GameState) => {
            if (team === 'team1') state.team1Roster = roster;
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
          player: string | null;
          player2?: string | null;
        }) =>
          set((state: GameState) => {
            state.events.push({
              type: 'turnover',
              team: event.team,
              subtype: event.subtype,
              player: event.player,
              player2: event.player2,
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
          const game: SavedGame = {
            id: generateId(),
            createdAt: Date.now(),
            team1Name: state.team1Name,
            team2Name: state.team2Name,
            team1Score: state.team1Score,
            team2Score: state.team2Score,
            team1Roster: state.team1Roster,
            events: state.events,
            gameTo: state.gameTo,
            gameLength: state.gameLength,
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

        saveTeam: async (name: string, roster: string[]) => {
          const existingTeams = await storage.loadTeams();
          const existingTeam = existingTeams.find(
            (t) => t.name.toLowerCase() === name.toLowerCase(),
          );

          const team: SavedTeam = {
            id: existingTeam?.id || generateId(),
            name,
            roster,
            lastUsed: Date.now(),
          };
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

        loadTeamRoster: (teamId: string, targetTeam: 'team1' | 'team2') => {
          const team = get().savedTeams.find((t) => t.id === teamId);
          if (!team || targetTeam !== 'team1') return;
          set((state: GameState) => {
            state.team1Roster = team.roster;
            state.team1Name = team.name;
          });
        },
      }),
      {
        name: 'ultimatestats-game-storage',
        storage: createJSONStorage(() => AsyncStorage),
        // Only persist game-related state, not UI state like pending entries
        partialize: (state: GameState) => ({
          team1Name: state.team1Name,
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
          gameHalf: state.gameHalf,
          gameTo: state.gameTo,
          baseGameTo: state.baseGameTo,
          gameLength: state.gameLength,
          isSoftCap: state.isSoftCap,
          softCapPending: state.softCapPending,
          softCapMins: state.softCapMins,
          timerTimeLeft: state.timerTimeLeft,
          statTrackingEnabled: state.statTrackingEnabled,
          team1Roster: state.team1Roster,
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
