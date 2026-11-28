import { SavedGame } from '@/lib/storage/types';
import { useSavedBasicGamesStore } from '@/store/basic/savedGamesStore';

export function useSavedBasicGames(): SavedGame[] {
  return useSavedBasicGamesStore((state) => state.savedGames);
}

/** The saved basic game with this id, or undefined when the id is missing or matches no game. */
export function useSavedBasicGame(gameId: string | null | undefined): SavedGame | undefined {
  return useSavedBasicGamesStore((state) => state.savedGames.find((game) => game.id === gameId));
}
