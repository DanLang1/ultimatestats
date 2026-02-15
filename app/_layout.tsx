import { AlertProvider } from '@/components/ui/AlertProvider';
import { loadPersistedTheme, ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useShareLink } from '@/hooks/useShareLink';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import 'react-native-reanimated';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

function RootLayoutInner() {
  const { palette, themeMode } = useTheme();
  useShareLink();

  // Safe area background should always be dark for contrast
  // In dark mode: use primary (Navy)
  // In light mode: use surface (Navy) since primary is white
  const safeAreaBg = themeMode === 'light' ? palette.surface : palette.primary;

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: safeAreaBg,
      }}
      edges={['top', 'bottom', 'left', 'right']}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
          }}>
          <Stack.Screen name="(main)" />
          <Stack.Screen
            name="(modals)"
            options={{
              presentation: 'transparentModal',
              gestureEnabled: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
        </Stack>

        <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} hidden />
      </GestureHandlerRootView>
    </SafeAreaView>
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
    <SafeAreaProvider>
      <ThemeProvider initialTheme={initialTheme}>
        <AlertProvider>
          <RootLayoutInner />
        </AlertProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
