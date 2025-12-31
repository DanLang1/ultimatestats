import { GameEvent, SavedGame } from '@/lib/storage';
import { create } from 'zustand';

interface PlayerStatsStore {
  player: string | null;
  events: GameEvent[];
  team: 'team1' | 'team2';
  games?: SavedGame[] | null;
  openPlayerStats: (
    player: string,
    events: GameEvent[],
    team: 'team1' | 'team2',
    games?: SavedGame[],
  ) => void;
  closePlayerStats: () => void;
}

export const usePlayerStatsStore = create<PlayerStatsStore>((set) => ({
  player: null,
  events: [],
  team: 'team1',
  games: null,
  openPlayerStats: (player, events, team, games) => set({ player, events, team, games }),
  closePlayerStats: () => set({ player: null, events: [], team: 'team1', games: null }),
}));
