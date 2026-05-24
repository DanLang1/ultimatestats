import { QueryClient } from '@tanstack/react-query';

export const DEFAULT_QUERY_STALE_TIME_MS = 2 * 60 * 1000;
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: DEFAULT_QUERY_STALE_TIME_MS,
    },
  },
});
