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
