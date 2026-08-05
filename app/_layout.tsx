/* oxlint-disable react/no-multi-comp -- RootLayoutInner must consume providers established by RootLayout. */

import * as Sentry from '@sentry/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { requireOptionalNativeModule } from 'expo';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AlertProvider } from '@/components/ui/AlertProvider';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useOrientationLock } from '@/hooks/useOrientationLock';
import 'react-native-reanimated';

import { useStartupMigrations } from '@/hooks/useStartupMigrations';
import { queryClient } from '@/lib/queryClient';
import { initializeSentry } from '@/lib/sentry';
import { useSettingsStore } from '@/store/settingsStore';

initializeSentry();

if (__DEV__) {
  const DevMenuPreferences = requireOptionalNativeModule('DevMenuPreferences');
  DevMenuPreferences?.setPreferencesAsync({
    showFloatingActionButton: false,
    motionGestureEnabled: false,
    touchGestureEnabled: false,
    keyCommandsEnabled: false,
    showsAtLaunch: false,
  });
}

// KEEP THIS: If we need to suppress the deep link logs, this is how
// Think it's just a dev issue, won't happen in prod
// if (__DEV__) {
//   // Temporary suppression while tracking an upstream duplicate-linking warning.
//   LogBox.ignoreLogs(['Looks like you have configured linking in multiple places']);
// }

function RootLayoutInner() {
  const { palette } = useTheme();
  const orientationMode = useSettingsStore((state) => state.orientationMode);
  useOrientationLock(orientationMode);
  useStartupMigrations();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.chrome }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: palette.chrome },
        }}>
        <Stack.Screen name="(main)" />
        <Stack.Screen name="__maestro_seed__" />
        <Stack.Screen
          name="(modals)"
          options={{
            presentation: 'transparentModal',
            gestureEnabled: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack>

      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AlertProvider>
            <RootLayoutInner />
          </AlertProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
});
