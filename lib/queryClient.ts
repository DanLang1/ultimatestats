import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { reportError } from '@/lib/sentry';

export interface QueryReportingMeta extends Record<string, unknown> {
  /** Identifies failures the screen treats as a normal outcome, which are not sent to Sentry. */
  isExpectedError?: (error: Error) => boolean;
}

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: QueryReportingMeta;
    mutationMeta: QueryReportingMeta;
  }
}

export const DEFAULT_QUERY_STALE_TIME_MS = 2 * 60 * 1000;
export const queryClient = new QueryClient({
  // Screens render query/mutation errors inline, so report unexpected ones once here.
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.isExpectedError?.(error)) return;
      reportError('react-query', error, { queryKey: query.queryKey });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _onMutateResult, mutation) => {
      if (mutation.meta?.isExpectedError?.(error)) return;
      reportError('react-query-mutation', error, { mutationKey: mutation.options.mutationKey });
    },
  }),
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: DEFAULT_QUERY_STALE_TIME_MS,
    },
  },
});
