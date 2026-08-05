import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

export function initializeSentry() {
  const environment = Constants.expoConfig?.extra?.appVariant;

  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment,
  });
}
