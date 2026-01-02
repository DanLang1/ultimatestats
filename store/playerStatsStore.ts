import { GameEvent, SavedGame } from '@/lib/storage';
import { create } from 'zustand';

interface PlayerStatsStore {
  player: string | null;
  events: GameEvent[];
  team: 'team1' | 'team2';
  games?: SavedGame[] | null;
  selectedGameId: string | null;
  openPlayerStats: (
    player: string,
    events: GameEvent[],
    team: 'team1' | 'team2',
    games?: SavedGame[],
  ) => void;
  closePlayerStats: () => void;
  setSelectedGameId: (id: string | null) => void;
}

export const usePlayerStatsStore = create<PlayerStatsStore>((set) => ({
  player: null,
  events: [],
  team: 'team1',
  games: null,
  selectedGameId: null,
  openPlayerStats: (player, events, team, games) =>
    set({ player, events, team, games, selectedGameId: null }),
  closePlayerStats: () =>
    set({ player: null, events: [], team: 'team1', games: null, selectedGameId: null }),
  setSelectedGameId: (id) => set({ selectedGameId: id }),
}));
