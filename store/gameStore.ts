import { SavedGame, SavedTeam, storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { palette } from '@/theme/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface StatRecord {
  pointNumber: number;
  team: 'team1' | 'team2';
  goal: string | null;
  assist: string | null;
}

export type TurnoverType = 'block' | 'throwaway' | 'drop';

export interface TurnoverRecord {
  team: 'team1' | 'team2'; // Team responsible for the action
  type: TurnoverType;
  player: string | null;
}

// Action history for undo functionality
export type GameAction = { type: 'goal'; team: 'team1' | 'team2' } | { type: 'turnover' };

interface GameState {
  // State
  team1Name: string;
  team2Name: string;
  team1BgColor: string;
  team2BgColor: string;
  team1Score: number;
  team2Score: number;
  team1Timeouts: boolean[];
  team2Timeouts: boolean[];
  team1Floater: boolean;
  team2Floater: boolean;
  floaterEnabled: boolean;
  gameHalf: number;
  gameTo: number;
  baseGameTo: number;
  gameLength: number;

  isSoftCap: boolean;
  softCapPending: boolean;
  softCapMins: number;
  timerIsActive: boolean;
  timerEndTime: number | null;
  timerTimeLeft: number;

  // Stat Tracking
  statTrackingEnabled: boolean;
  team1Roster: string[];
  statRecords: StatRecord[];
  pendingStatEntry: { team: 'team1' | 'team2'; pointNumber: number } | null;

  // Turnover Tracking
  possession: 'team1' | 'team2' | null;
  startingPossession: 'team1' | 'team2' | null; // Who received first (to determine halftime)
  turnoverRecords: TurnoverRecord[];

  // Action History (for undo)
  actionHistory: GameAction[];
  pendingTurnoverEntry: { receivingTeam: 'team1' | 'team2' } | null;

  // Actions
  setTeamNames: (team1: string, team2: string) => void;
  setTeamBgColor: (team: 'team1' | 'team2', color: string) => void;
  setFloaterEnabled: (enabled: boolean) => void;
  setGameTo: (score: number) => void;
  setGameLength: (minutes: number) => void;
  incrementScore: (isTeam1: boolean) => void;
  decrementScore: (isTeam1: boolean) => void;
  undoLastAction: () => boolean; // Returns true if something was undone
  toggleTimeout: (isTeam1: boolean, index: number) => void;
  resetTimeouts: (count: number) => void;
  resetGame: () => void;
  triggerSoftCap: () => void;
  setSoftCapPending: (pending: boolean) => void;
  setSoftCapMins: (minutes: number) => void;
  setTimerActive: (active: boolean) => void;
  setTimerEndTime: (time: number | null) => void;
  setTimerTimeLeft: (seconds: number) => void;

  // Stat Tracking Actions
  setStatTrackingEnabled: (enabled: boolean) => void;
  addPlayer: (team: 'team1' | 'team2', name: string) => void;
  setRoster: (team: 'team1' | 'team2', roster: string[]) => void;
  addStatRecord: (record: Omit<StatRecord, 'pointNumber'>) => void;
  clearPendingStatEntry: () => void;
  clearRoster: () => void;

  // Turnover Tracking Actions
  setPossession: (team: 'team1' | 'team2') => void;
  triggerTurnover: () => void;
  addTurnoverRecord: (record: TurnoverRecord) => void;
  clearPendingTurnoverEntry: () => void;

  // Saved Games & Teams
  savedGames: SavedGame[];
  savedTeams: SavedTeam[];
  loadSavedGames: () => Promise<void>;
  loadSavedTeams: () => Promise<void>;
  saveCurrentGame: () => Promise<void>;
  deleteSavedGame: (id: string) => Promise<void>;
  saveTeam: (name: string, roster: string[]) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  loadTeamRoster: (teamId: string, targetTeam: 'team1' | 'team2') => void;
}

export const useGameStore = create<GameState>()(
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
      statRecords: [],
      pendingStatEntry: null,

      // Turnover Tracking Initial State
      possession: null,
      startingPossession: null,
      turnoverRecords: [],
      pendingTurnoverEntry: null,

      // Action History (for undo)
      actionHistory: [],

      // Saved Games & Teams Initial State
      savedGames: [],
      savedTeams: [],

      setTeamNames: (team1, team2) => set({ team1Name: team1, team2Name: team2 }),
      setTeamBgColor: (team, color) =>
        set(team === 'team1' ? { team1BgColor: color } : { team2BgColor: color }),
      setFloaterEnabled: (enabled) => set({ floaterEnabled: enabled }),

      setGameTo: (gameTo) => set({ gameTo, baseGameTo: gameTo }),
      setGameLength: (minutes) => set({ gameLength: minutes, timerTimeLeft: minutes * 60 }),

      incrementScore: (isTeam1) =>
        set((state) => {
          const targetScore = isTeam1 ? state.team1Score : state.team2Score;
          if (targetScore >= state.gameTo) return {};

          const newScore = targetScore + 1;
          const halftimeScore = Math.ceil(state.gameTo / 2);

          let newState: Partial<GameState> = isTeam1
            ? { team1Score: newScore }
            : { team2Score: newScore };

          // Automatic Halftime Logic
          if (state.gameHalf === 1 && newScore === halftimeScore) {
            // At halftime, the team that received first now pulls
            // So the OTHER team receives (gets possession)
            const halftimePossession = state.startingPossession === 'team1' ? 'team2' : 'team1';
            newState = {
              ...newState,
              gameHalf: 2,
              team1Timeouts: new Array(state.team1Timeouts.length).fill(true),
              team2Timeouts: new Array(state.team2Timeouts.length).fill(true),
              possession: state.statTrackingEnabled ? halftimePossession : state.possession,
            };
          }

          // Soft Cap Logic
          if (state.softCapPending && !state.isSoftCap) {
            // Calculate new Game To based on the HIGHER score after this point
            const currentHigherScore = Math.max(
              isTeam1 ? newScore : state.team1Score,
              !isTeam1 ? newScore : state.team2Score,
            );

            // If the game isn't already over (reached existing gameTo), apply cap
            // If it JUST ended (reached gameTo), we arguably don't need soft cap, but rule says "add one to higher score"
            // typically soft cap makes it win by 1 or 2. Rule: "Add one to higher score"

            newState = {
              ...newState,
              isSoftCap: true,
              softCapPending: false,
              gameTo: Math.min(currentHigherScore + 1, state.gameTo),
            };
          }
          // Stat Tracking: Set pending entry if tracking is enabled and it's team1
          const team = isTeam1 ? 'team1' : 'team2';
          const shouldTrack = state.statTrackingEnabled && isTeam1;

          if (shouldTrack) {
            newState = {
              ...newState,
              pendingStatEntry: { team, pointNumber: newScore },
            };
          }

          // After a goal, possession goes to the other team (they receive the pull)
          if (state.statTrackingEnabled) {
            newState = {
              ...newState,
              possession: isTeam1 ? 'team2' : 'team1',
            };
          }

          // Track this goal in action history
          newState = {
            ...newState,
            actionHistory: [...state.actionHistory, { type: 'goal', team }],
          };

          return newState;
        }),

      decrementScore: (isTeam1) =>
        set((state) => {
          const targetScore = isTeam1 ? state.team1Score : state.team2Score;
          if (targetScore <= 0) return {};

          const team = isTeam1 ? 'team1' : 'team2';
          // Remove the last stat record for this team (if any)
          const teamRecords = state.statRecords.filter((r) => r.team === team);
          let newStatRecords = state.statRecords;
          if (teamRecords.length > 0) {
            const lastRecord = teamRecords[teamRecords.length - 1];
            newStatRecords = state.statRecords.filter((r) => r !== lastRecord);
          }

          return {
            ...(isTeam1
              ? { team1Score: state.team1Score - 1 }
              : { team2Score: state.team2Score - 1 }),
            statRecords: newStatRecords,
            pendingStatEntry: null, // Clear any pending entry
          };
        }),

      undoLastAction: () => {
        const state = get();
        const lastAction = state.actionHistory[state.actionHistory.length - 1];

        if (!lastAction) return false;

        const newActionHistory = state.actionHistory.slice(0, -1);

        if (lastAction.type === 'goal') {
          const isTeam1 = lastAction.team === 'team1';
          const targetScore = isTeam1 ? state.team1Score : state.team2Score;

          if (targetScore <= 0) return false;

          // Remove the last stat record for this team (if any)
          const teamRecords = state.statRecords.filter((r) => r.team === lastAction.team);
          let newStatRecords = state.statRecords;
          if (teamRecords.length > 0) {
            const lastRecord = teamRecords[teamRecords.length - 1];
            newStatRecords = state.statRecords.filter((r) => r !== lastRecord);
          }

          // Flip possession back (goal caused it to flip to the scoring team's opponent)
          const restoredPossession = lastAction.team;

          set({
            ...(isTeam1
              ? { team1Score: state.team1Score - 1 }
              : { team2Score: state.team2Score - 1 }),
            statRecords: newStatRecords,
            possession: restoredPossession,
            pendingStatEntry: null,
            actionHistory: newActionHistory,
          });

          return true;
        }

        if (lastAction.type === 'turnover') {
          // Remove the last turnover record
          const newTurnoverRecords = state.turnoverRecords.slice(0, -1);

          // Flip possession back
          const restoredPossession = state.possession === 'team1' ? 'team2' : 'team1';

          set({
            turnoverRecords: newTurnoverRecords,
            possession: restoredPossession,
            pendingTurnoverEntry: null,
            actionHistory: newActionHistory,
          });

          return true;
        }

        return false;
      },

      toggleTimeout: (isTeam1, index) =>
        set((state) => {
          const timeouts = isTeam1 ? state.team1Timeouts : state.team2Timeouts;
          const isFloaterActive = isTeam1 ? state.team1Floater : state.team2Floater;

          // Logic: Index < Length -> Standard Timeout
          if (index < timeouts.length) {
            if (isTeam1) {
              const newTimeouts = [...state.team1Timeouts];
              newTimeouts[index] = !newTimeouts[index];
              return { team1Timeouts: newTimeouts };
            } else {
              const newTimeouts = [...state.team2Timeouts];
              newTimeouts[index] = !newTimeouts[index];
              return { team2Timeouts: newTimeouts };
            }
          } else {
            // Logic: Length -> Floater Timeout
            // Restriction: Cannot USE floater (turn active -> inactive) if any standard timeout is Active (true)
            const hasAvailableStandard = timeouts.some((t) => t === true);

            if (isFloaterActive && hasAvailableStandard) {
              // Attempting to consume floater while standard exists -> Block
              return {};
            }

            if (isTeam1) {
              return { team1Floater: !state.team1Floater };
            } else {
              return { team2Floater: !state.team2Floater };
            }
          }
        }),

      resetTimeouts: (count) =>
        set({
          team1Timeouts: new Array(count).fill(true),
          team2Timeouts: new Array(count).fill(true),
        }),

      resetGame: () =>
        set((state) => ({
          team1Score: 0,
          team2Score: 0,
          team1Timeouts: new Array(state.team1Timeouts.length).fill(true),
          team2Timeouts: new Array(state.team2Timeouts.length).fill(true),
          team1Floater: true,
          team2Floater: true,
          gameHalf: 1,
          isSoftCap: false,
          softCapPending: false,
          gameTo: state.baseGameTo,
          // Reset stat tracking for new game (keep rosters)
          statRecords: [],
          pendingStatEntry: null,
          // Reset turnover tracking for new game
          possession: null,
          startingPossession: null,
          turnoverRecords: [],
          pendingTurnoverEntry: null,
          // Reset action history
          actionHistory: [],
          // Reset timer
          timerIsActive: false,
          timerEndTime: null,
          timerTimeLeft: state.gameLength * 60,
        })),

      triggerSoftCap: () =>
        set((state) => {
          if (state.isSoftCap) return {}; // Already active
          const highestScore = Math.max(state.team1Score, state.team2Score);
          return {
            isSoftCap: true,
            gameTo: highestScore + 1,
          };
        }),

      setSoftCapPending: (pending) => set({ softCapPending: pending }),

      setSoftCapMins: (minutes) => set({ softCapMins: minutes }),
      setTimerActive: (active) => set({ timerIsActive: active }),
      setTimerEndTime: (time) => set({ timerEndTime: time }),
      setTimerTimeLeft: (seconds) => set({ timerTimeLeft: seconds }),

      // Stat Tracking Actions
      setStatTrackingEnabled: (enabled) => set({ statTrackingEnabled: enabled }),

      addPlayer: (team, name) =>
        set((state) => {
          const trimmedName = name.trim();
          if (!trimmedName || team !== 'team1') return {};
          if (state.team1Roster.includes(trimmedName)) return {}; // Already exists
          return { team1Roster: [...state.team1Roster, trimmedName] };
        }),

      addStatRecord: (record) =>
        set((state) => {
          const pointNumber = state.statRecords.filter((r) => r.team === record.team).length + 1;
          const newRecord: StatRecord = { ...record, pointNumber };
          return {
            statRecords: [...state.statRecords, newRecord],
            pendingStatEntry: null,
          };
        }),

      clearPendingStatEntry: () => set({ pendingStatEntry: null }),

      clearRoster: () => set({ team1Roster: [], statRecords: [], turnoverRecords: [] }),

      setRoster: (team, roster) => set(team === 'team1' ? { team1Roster: roster } : {}),

      // Turnover Tracking Actions
      setPossession: (team) =>
        set((state) => {
          // Only set startingPossession if it hasn't been set yet (first pull of the game)
          const updates: Partial<GameState> = { possession: team };
          if (state.startingPossession === null) {
            updates.startingPossession = team;
          }
          return updates;
        }),

      triggerTurnover: () =>
        set((state) => {
          if (state.possession === null) return {};
          const receivingTeam = state.possession === 'team1' ? 'team2' : 'team1';
          return {
            pendingTurnoverEntry: { receivingTeam },
          };
        }),

      addTurnoverRecord: (record) =>
        set((state) => {
          // Flip possession to the receiving team
          const newPossession = state.possession === 'team1' ? 'team2' : 'team1';
          return {
            turnoverRecords: [...state.turnoverRecords, record],
            possession: newPossession,
            pendingTurnoverEntry: null,
            actionHistory: [...state.actionHistory, { type: 'turnover' }],
          };
        }),

      clearPendingTurnoverEntry: () =>
        set((state) => {
          // Still flip possession even if skipped (turnover happened)
          const newPossession = state.possession === 'team1' ? 'team2' : 'team1';
          return {
            pendingTurnoverEntry: null,
            possession: newPossession,
            actionHistory: [...state.actionHistory, { type: 'turnover' }],
          };
        }),

      // Saved Games & Teams Actions
      loadSavedGames: async () => {
        const games = await storage.loadGames();
        set({ savedGames: games });
      },

      loadSavedTeams: async () => {
        const teams = await storage.loadTeams();
        set({ savedTeams: teams });
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
          statRecords: state.statRecords,
          turnoverRecords: state.turnoverRecords,
          gameTo: state.gameTo,
          gameLength: state.gameLength,
        };
        await storage.saveGame(game);
        const games = await storage.loadGames();
        set({ savedGames: games });
      },

      deleteSavedGame: async (id) => {
        await storage.deleteGame(id);
        const games = await storage.loadGames();
        set({ savedGames: games });
      },

      saveTeam: async (name, roster) => {
        const existingTeams = await storage.loadTeams();
        const existingTeam = existingTeams.find((t) => t.name.toLowerCase() === name.toLowerCase());

        const team: SavedTeam = {
          id: existingTeam?.id || generateId(),
          name,
          roster,
          lastUsed: Date.now(),
        };
        await storage.saveTeam(team);
        const teams = await storage.loadTeams();
        set({ savedTeams: teams });
      },

      deleteTeam: async (id) => {
        await storage.deleteTeam(id);
        const teams = await storage.loadTeams();
        set({ savedTeams: teams });
      },

      loadTeamRoster: (teamId, targetTeam) => {
        const team = get().savedTeams.find((t) => t.id === teamId);
        if (!team || targetTeam !== 'team1') return;
        set({ team1Roster: team.roster, team1Name: team.name });
      },
    }),
    {
      name: 'ultimatestats-game-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist game-related state, not UI state like pending entries
      partialize: (state) => ({
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
        statRecords: state.statRecords,
        possession: state.possession,
        startingPossession: state.startingPossession,
        turnoverRecords: state.turnoverRecords,
        actionHistory: state.actionHistory,
        savedGames: state.savedGames,
        savedTeams: state.savedTeams,
      }),
    },
  ),
);
