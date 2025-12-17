import { create } from 'zustand';

interface GameState {
  // State
  team1Name: string;
  team2Name: string;
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

  // Actions
  setTeamNames: (team1: string, team2: string) => void;
  setFloaterEnabled: (enabled: boolean) => void;
  setGameTo: (score: number) => void;
  setGameLength: (minutes: number) => void;
  incrementScore: (isTeam1: boolean) => void;
  decrementScore: (isTeam1: boolean) => void;
  toggleTimeout: (isTeam1: boolean, index: number) => void;
  resetTimeouts: (count: number) => void;
  resetGame: () => void;
  triggerSoftCap: () => void;
  setSoftCapPending: (pending: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
  team1Name: 'Team 1',
  team2Name: 'Team 2',
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

  setTeamNames: (team1, team2) => set({ team1Name: team1, team2Name: team2 }),
  setFloaterEnabled: (enabled) => set({ floaterEnabled: enabled }),

  setGameTo: (gameTo) => set({ gameTo, baseGameTo: gameTo }),
  setGameLength: (minutes) => set({ gameLength: minutes }),

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
        newState = {
          ...newState,
          gameHalf: 2,
          team1Timeouts: new Array(state.team1Timeouts.length).fill(true),
          team2Timeouts: new Array(state.team2Timeouts.length).fill(true),
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

      return newState;
    }),

  decrementScore: (isTeam1) =>
    set((state) => {
      const targetScore = isTeam1 ? state.team1Score : state.team2Score;
      if (targetScore <= 0) return {};
      return isTeam1 ? { team1Score: state.team1Score - 1 } : { team2Score: state.team2Score - 1 };
    }),

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
}));
