import { useCompletedAdvancedGameSummaries } from '@/hooks/advancedTracking/useAdvancedGameQueries';
import {
  advancedGameSummaryToListItem,
  basicGameToListItem,
  GameListItem,
} from '@/lib/gameListUtils';
import { useGameStore } from '@/store/basic/gameStore';

/** The newest saved game of either kind, or null before any game is saved. */
export function useMostRecentSavedGame(): GameListItem | null {
  const savedGames = useGameStore((state) => state.savedGames);
  const savedTeams = useGameStore((state) => state.savedTeams);
  const { data: advancedSummaries } = useCompletedAdvancedGameSummaries();

  const games = [
    ...savedGames.map((game) => basicGameToListItem(game, savedTeams)),
    ...advancedSummaries.map(advancedGameSummaryToListItem),
  ];
  return games.reduce<GameListItem | null>(
    (newest, game) => (newest == null || game.timestamp > newest.timestamp ? game : newest),
    null,
  );
}
