import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useQuery } from '@tanstack/react-query';

export const advancedGameQueryKeys = {
  game: (gameId: string | undefined) => ['advancedGames', 'game', gameId ?? ''] as const,
  games: (gameIds: string[]) => ['advancedGames', 'games', [...gameIds].sort().join(',')] as const,
};

const localSqliteQueryOptions = {
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: 'always' as const,
};

export function useAdvancedGame(gameId: string | undefined) {
  return useQuery<AdvancedTrackedGame | null>({
    queryKey: advancedGameQueryKeys.game(gameId),
    queryFn: () => (gameId ? useAdvancedTrackingStore.getState().loadGame(gameId) : null),
    enabled: gameId != null,
    ...localSqliteQueryOptions,
  });
}

export function useAdvancedGames(gameIds: string[]) {
  const sortedIds = [...gameIds].sort();

  return useQuery<AdvancedTrackedGame[]>({
    queryKey: advancedGameQueryKeys.games(sortedIds),
    queryFn: () => useAdvancedTrackingStore.getState().loadGames(sortedIds),
    enabled: sortedIds.length > 0,
    initialData: [],
    ...localSqliteQueryOptions,
  });
}
