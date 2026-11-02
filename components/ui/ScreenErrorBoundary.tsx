import * as Sentry from '@sentry/react-native';
import { router, usePathname, useSegments } from 'expo-router';
import type { ErrorBoundaryProps } from 'expo-router';

import { ErrorFallback } from '@/components/ui/ErrorFallback';

/**
 * Per-screen error boundary installed for every route via the root layout's
 * `unstable_settings.screenErrorBoundary`. Going back unmounts the failed screen; without history,
 * it falls back to Dashboard.
 */
function ScreenErrorFallback({ error, retry }: ErrorBoundaryProps) {
  const isDashboard = usePathname() === '/dashboard';
  // Dashboard lives in another tab's stack, which `dismissTo` cannot reach from a hub tab.
  const isInHubTab = useSegments().some((segment) => segment === '(hub)');

  if (isDashboard) {
    return <ErrorFallback error={error} actionLabel="Try Again" onAction={() => void retry()} />;
  }
  if (router.canGoBack()) {
    return <ErrorFallback error={error} actionLabel="Go Back" onAction={() => router.back()} />;
  }
  return (
    <ErrorFallback
      error={error}
      actionLabel="Go to Dashboard"
      onAction={() => (isInHubTab ? router.navigate('/dashboard') : router.dismissTo('/dashboard'))}
    />
  );
}

export const ScreenErrorBoundary = Sentry.wrapExpoRouterErrorBoundary(ScreenErrorFallback);
