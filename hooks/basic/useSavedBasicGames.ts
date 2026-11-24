import { SavedGame } from '@/lib/storage/types';
import { useGameStore } from '@/store/basic/gameStore';

export function useSavedBasicGames(): SavedGame[] {
  return useGameStore((state) => state.savedGames);
}

/** The saved basic game with this id, or undefined when the id is missing or matches no game. */
export function useSavedBasicGame(gameId: string | null | undefined): SavedGame | undefined {
  return useGameStore((state) => state.savedGames.find((game) => game.id === gameId));
}
