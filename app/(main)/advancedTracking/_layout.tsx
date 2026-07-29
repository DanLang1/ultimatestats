import { Stack } from 'expo-router';

export { AdvancedTrackingErrorBoundary as ErrorBoundary } from '@/components/advancedTracking/AdvancedTrackingErrorBoundary';

export default function AdvancedTrackingLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'none' }} />;
}
