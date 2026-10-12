import * as Sentry from '@sentry/react-native';
import type { ErrorBoundaryProps } from 'expo-router';

import { ErrorFallback } from '@/components/ui/ErrorFallback';
import { ThemeProvider } from '@/context/ThemeContext';

/**
 * Last-resort boundary for errors thrown by the root or a nested layout. It renders outside every
 * root provider and the router stack, so it supplies its own theme and recovers with `retry`.
 */
function RootErrorFallback({ error, retry }: ErrorBoundaryProps) {
  return (
    <ThemeProvider>
      <ErrorFallback error={error} actionLabel="Try Again" onAction={() => void retry()} />
    </ThemeProvider>
  );
}

export const RootErrorBoundary = Sentry.wrapExpoRouterErrorBoundary(RootErrorFallback);
