import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';

export function preferCurrentAdvancedGame(
  gameId: string,
  currentGame: AdvancedTrackedGame | null,
  loadedGame: AdvancedTrackedGame | null,
) {
  if (currentGame?.id === gameId) {
    return currentGame;
  }
  return loadedGame;
}

export function mergeCurrentAdvancedGame(
  gameIds: string[],
  currentGame: AdvancedTrackedGame | null,
  loadedGames: AdvancedTrackedGame[],
) {
  if (currentGame == null || !gameIds.includes(currentGame.id)) {
    return loadedGames;
  }
  return [...loadedGames.filter((game) => game.id !== currentGame.id), currentGame];
}
