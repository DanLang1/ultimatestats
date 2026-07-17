import { useQuery } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';

import {
  isCompletedAdvancedGameSummary,
  type AdvancedGameSummary,
} from '@/lib/advancedTracking/summary';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';

type AdvancedGameResult<T> = {
  data: T;
  isLoading: boolean;
  isError: boolean;
  isComplete: boolean;
};

const advancedGameQueryKeys = {
  summaries: ['advancedGames', 'summaries'] as const,
  game: (gameId: string) => ['advancedGames', 'game', gameId] as const,
  games: (gameIds: string[]) => ['advancedGames', 'games', [...gameIds].sort().join('|')] as const,
};

function mergeAdvancedGamesById(
  cachedGames: AdvancedTrackedGame[],
  loadedGames: AdvancedTrackedGame[] | undefined,
): AdvancedTrackedGame[] {
  const gamesById = new Map<string, AdvancedTrackedGame>();
  for (const game of loadedGames ?? []) {
    gamesById.set(game.id, game);
  }
  for (const game of cachedGames) {
    gamesById.set(game.id, game);
  }
  return Array.from(gamesById.values());
}

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
  return {
    data,
    isLoading: query.isLoading || query.isFetching,
    isError: query.isError,
    isComplete: data != null,
  };
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

  const isLoading = !summariesLoaded && (query.isLoading || query.isFetching);
  return {
    data: summaries,
    isLoading,
    isError: query.isError,
    isComplete: summariesLoaded,
  };
}

export function useCompletedAdvancedGameSummaries(): AdvancedGameResult<AdvancedGameSummary[]> {
  const result = useAdvancedGameSummaries();
  return {
    ...result,
    data: result.data.filter(isCompletedAdvancedGameSummary),
  };
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
    staleTime: 0,
  });

  const isLoading = hasMissingGames && (query.isLoading || query.isFetching);
  const data = mergeAdvancedGamesById(games, query.data);
  const isComplete = data.length === sortedGameIds.length;

  return {
    data,
    isLoading,
    isError: query.isError,
    // `data` may be partial while a missing SQLite-backed record is loading.
    // Row-style consumers can render partial results, but aggregate math should
    // wait for isComplete so a cached subset is not treated as the full selection.
    isComplete,
  };
}
