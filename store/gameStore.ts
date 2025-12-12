import { create } from 'zustand';

interface GameState {
  // State
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  team1Timeouts: boolean[];
  team2Timeouts: boolean[];
  gameTo: number;

  // Actions
  setTeamNames: (team1: string, team2: string) => void;
  setGameTo: (score: number) => void;
  incrementScore: (isTeam1: boolean) => void;
  decrementScore: (isTeam1: boolean) => void;
  toggleTimeout: (isTeam1: boolean, index: number) => void;
  resetTimeouts: (count: number) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  team1Name: 'Team 1',
  team2Name: 'Team 2',
  team1Score: 0,
  team2Score: 0,
  team1Timeouts: [true, true],
  team2Timeouts: [true, true],
  gameTo: 15,

  setTeamNames: (team1, team2) => set({ team1Name: team1, team2Name: team2 }),

  setGameTo: (gameTo) => set({ gameTo }),

  incrementScore: (isTeam1) =>
    set((state) => {
      const targetScore = isTeam1 ? state.team1Score : state.team2Score;
      if (targetScore >= state.gameTo) return {};
      return isTeam1 ? { team1Score: state.team1Score + 1 } : { team2Score: state.team2Score + 1 };
    }),

  decrementScore: (isTeam1) =>
    set((state) => {
      const targetScore = isTeam1 ? state.team1Score : state.team2Score;
      if (targetScore <= 0) return {};
      return isTeam1 ? { team1Score: state.team1Score - 1 } : { team2Score: state.team2Score - 1 };
    }),

  toggleTimeout: (isTeam1, index) =>
    set((state) => {
      if (isTeam1) {
        const newTimeouts = [...state.team1Timeouts];
        newTimeouts[index] = !newTimeouts[index];
        return { team1Timeouts: newTimeouts };
      } else {
        const newTimeouts = [...state.team2Timeouts];
        newTimeouts[index] = !newTimeouts[index];
        return { team2Timeouts: newTimeouts };
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
    })),
}));
