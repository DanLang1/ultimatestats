import { QueryClientProvider } from '@tanstack/react-query';
import { requireOptionalNativeModule } from 'expo';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AlertProvider } from '@/components/ui/AlertProvider';
import { loadPersistedTheme, ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useOrientationLock } from '@/hooks/useOrientationLock';
import { useStartupMigrations } from '@/hooks/useStartupMigrations';
import 'react-native-reanimated';

import { queryClient } from '@/lib/queryClient';
import { useSettingsStore } from '@/store/settingsStore';

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

export default function RootLayout() {
  const [initialTheme, setInitialTheme] = useState<'light' | 'dark'>('dark');
  const [isLoaded, setIsLoaded] = useState(false);
  // Load persisted theme on mount
  if (!isLoaded) {
    loadPersistedTheme().then((theme) => {
      setInitialTheme(theme);
      setIsLoaded(true);
    });
  }

  // Show nothing briefly while loading theme (prevents flash)
  if (!isLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider initialTheme={initialTheme}>
          <AlertProvider>
            <RootLayoutInner />
          </AlertProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
