import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import type { AdvancedGameSummary } from '@/lib/advancedTracking/summary';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useQuery } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';

type AdvancedGameResult<T> = {
  data: T;
  isLoading: boolean;
  isFetching: boolean;
};

const advancedGameQueryKeys = {
  summaries: ['advancedGames', 'summaries'] as const,
  game: (gameId: string) => ['advancedGames', 'game', gameId] as const,
  games: (gameIds: string[]) => ['advancedGames', 'games', [...gameIds].sort().join('|')] as const,
};

export function useAdvancedGame(gameId: string): AdvancedGameResult<AdvancedTrackedGame | null> {
  if (!gameId) {
    throw new Error('useAdvancedGame requires a non-empty gameId');
  }

  const game = useSavedAdvancedGamesStore((state) => state.gamesById[gameId]);
  const loadGame = useSavedAdvancedGamesStore((state) => state.loadGame);

  const query = useQuery({
    queryKey: advancedGameQueryKeys.game(gameId),
    queryFn: () => loadGame(gameId),
    enabled: game == null,
  });

  const data = game ?? query.data ?? null;
  return { data, isLoading: query.isLoading, isFetching: query.isFetching };
}

export function useAdvancedGameSummaries(): AdvancedGameResult<AdvancedGameSummary[]> {
  const summaries = useSavedAdvancedGamesStore((state) => state.summaries);
  const summariesLoaded = useSavedAdvancedGamesStore((state) => state.summariesLoaded);
  const loadSummaries = useSavedAdvancedGamesStore((state) => state.loadSummaries);

  const query = useQuery({
    queryKey: advancedGameQueryKeys.summaries,
    queryFn: loadSummaries,
    enabled: !summariesLoaded,
  });

  const isLoading = !summariesLoaded && query.isLoading;
  return { data: summaries, isLoading, isFetching: query.isFetching };
}

export function useAdvancedGames(gameIds: string[]): AdvancedGameResult<AdvancedTrackedGame[]> {
  const gameIdKey = [...gameIds].sort().join('|');
  const sortedGameIds = gameIdKey.length > 0 ? gameIdKey.split('|') : [];
  const games = useSavedAdvancedGamesStore(
    useShallow((state) =>
      sortedGameIds
        .map((gameId) => state.gamesById[gameId])
        .filter((game): game is AdvancedTrackedGame => game != null),
    ),
  );
  const loadGames = useSavedAdvancedGamesStore((state) => state.loadGames);
  const hasMissingGames = games.length !== sortedGameIds.length;

  const query = useQuery({
    queryKey: advancedGameQueryKeys.games(sortedGameIds),
    queryFn: () => loadGames(sortedGameIds),
    enabled: sortedGameIds.length > 0 && hasMissingGames,
    initialData: [],
  });

  const isLoading = hasMissingGames && query.isLoading;
  return { data: games, isLoading, isFetching: query.isFetching };
}
