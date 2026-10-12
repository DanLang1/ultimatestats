import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

export function initializeSentry() {
  const environment = Constants.expoConfig?.extra?.appVariant;
  const isDevelopment = __DEV__ || environment === 'development';

  Sentry.init({
    dsn: isDevelopment ? undefined : process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment,
    enabled: !isDevelopment,
  });
}

/**
 * Reports an error the app handled itself (caught, shown to the user, or recovered from).
 * Uncaught errors, unhandled rejections, and route error boundaries are reported automatically.
 * `area` becomes a searchable Sentry tag; keep it short and stable, e.g. 'startup-migrations'.
 */
export function reportError(area: string, error: unknown, extra?: Record<string, unknown>): void {
  console.error(`[${area}]`, error);
  Sentry.captureException(error, { tags: { area }, extra });
}

/** Reports a persisted Zustand store's `onRehydrateStorage` failure; no-op when hydration succeeded. */
export function reportHydrationError(store: string, error: unknown): void {
  if (error) reportError('store-hydration', error, { store });
}
