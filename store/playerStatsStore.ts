import { GameEvent, Player, SavedGame } from '@/lib/storage';
import { create } from 'zustand';

interface PlayerStatsStore {
  player: string | null;
  events: GameEvent[];
  team: 'team1' | 'team2';
  roster?: Player[] | null;
  games?: SavedGame[] | null;
  selectedGameId: string | null;
  openPlayerStats: (
    player: string,
    events: GameEvent[],
    team: 'team1' | 'team2',
    roster?: Player[],
    games?: SavedGame[],
  ) => void;
  closePlayerStats: () => void;
  setSelectedGameId: (id: string | null) => void;
}

export const usePlayerStatsStore = create<PlayerStatsStore>((set) => ({
  player: null,
  events: [],
  team: 'team1',
  roster: null,
  games: null,
  selectedGameId: null,
  openPlayerStats: (player, events, team, roster, games) =>
    set({ player, events, team, roster, games, selectedGameId: null }),
  closePlayerStats: () =>
    set({
      player: null,
      events: [],
      team: 'team1',
      roster: null,
      games: null,
      selectedGameId: null,
    }),
  setSelectedGameId: (id) => set({ selectedGameId: id }),
}));
