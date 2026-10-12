import * as Sentry from '@sentry/react-native';
import { router, usePathname } from 'expo-router';
import type { ErrorBoundaryProps } from 'expo-router';

import { ErrorFallback } from '@/components/ui/ErrorFallback';

/**
 * Per-screen error boundary installed for every route via the root layout's
 * `unstable_settings.screenErrorBoundary`. Dismissing to Dashboard unmounts stacked screens. Tab
 * screens stay mounted, so a failed tab keeps showing this fallback until the app restarts.
 */
function ScreenErrorFallback({ error, retry }: ErrorBoundaryProps) {
  const isDashboard = usePathname() === '/Dashboard';

  if (isDashboard) {
    return <ErrorFallback error={error} actionLabel="Try Again" onAction={() => void retry()} />;
  }
  return (
    <ErrorFallback
      error={error}
      actionLabel="Go to Dashboard"
      onAction={() => router.dismissTo('/Dashboard')}
    />
  );
}

export const ScreenErrorBoundary = Sentry.wrapExpoRouterErrorBoundary(ScreenErrorFallback);
