import { GameEvent, Player, PointLineRecord, SavedGame } from '@/lib/storage';
import { create } from 'zustand';

interface PlayerStatsStore {
  playerId: string | null; // Changed from player name to player ID
  events: GameEvent[];
  team: 'team1' | 'team2';
  roster?: Player[] | null;
  games?: SavedGame[] | null;
  selectedGameId: string | null;
  // Playing time data
  pointLines?: PointLineRecord[] | null;
  startingPossession?: 'team1' | 'team2' | null;
  gameTo?: number;
  autoHalftimeEnabled?: boolean;
  openPlayerStats: (
    playerId: string, // Changed from player name to player ID
    events: GameEvent[],
    team: 'team1' | 'team2',
    roster?: Player[],
    games?: SavedGame[],
    pointLines?: PointLineRecord[],
    startingPossession?: 'team1' | 'team2' | null,
    gameTo?: number,
    autoHalftimeEnabled?: boolean,
  ) => void;
  setSelectedGameId: (id: string | null) => void;
}

export const usePlayerStatsStore = create<PlayerStatsStore>((set) => ({
  playerId: null,
  events: [],
  team: 'team1',
  roster: null,
  games: null,
  selectedGameId: null,
  pointLines: null,
  startingPossession: null,
  gameTo: 15,
  autoHalftimeEnabled: true,
  openPlayerStats: (
    playerId,
    events,
    team,
    roster,
    games,
    pointLines,
    startingPossession,
    gameTo,
    autoHalftimeEnabled,
  ) =>
    set({
      playerId,
      events,
      team,
      roster,
      games,
      selectedGameId: null,
      pointLines,
      startingPossession,
      gameTo: gameTo ?? 15,
      autoHalftimeEnabled: autoHalftimeEnabled ?? true,
    }),
  setSelectedGameId: (id) => set({ selectedGameId: id }),
}));
