import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';

import { AdvancedTrackingErrorBoundary } from '@/components/advancedTracking/AdvancedTrackingErrorBoundary';

export const ErrorBoundary = Sentry.wrapExpoRouterErrorBoundary(AdvancedTrackingErrorBoundary);

export default function AdvancedTrackingLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'none' }} />;
}
