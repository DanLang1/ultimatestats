import { useCompletedAdvancedGameSummaries } from '@/hooks/advancedTracking/useAdvancedGameQueries';
import { useSavedBasicGames } from '@/hooks/basic/useSavedBasicGames';
import {
  advancedGameSummaryToListItem,
  basicGameToListItem,
  GameListItem,
} from '@/lib/gameListUtils';
import { useTeamStore } from '@/store/teamStore';

/** The newest saved game of either kind, or null before any game is saved. */
export function useMostRecentSavedGame(): GameListItem | null {
  const savedGames = useSavedBasicGames();
  const teams = useTeamStore((state) => state.teams);
  const { data: advancedSummaries } = useCompletedAdvancedGameSummaries();

  const games = [
    ...savedGames.map((game) => basicGameToListItem(game, teams)),
    ...advancedSummaries.map(advancedGameSummaryToListItem),
  ];
  return games.reduce<GameListItem | null>(
    (newest, game) => (newest == null || game.timestamp > newest.timestamp ? game : newest),
    null,
  );
}
