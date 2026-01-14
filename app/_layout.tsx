import { AlertProvider } from '@/components/ui/AlertProvider';
import { loadPersistedTheme, ThemeProvider, useTheme } from '@/context/ThemeContext';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import 'react-native-reanimated';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

function RootLayoutInner() {
  const { palette, themeMode } = useTheme();

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
      edges={['left', 'right']}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.primary },
          }}>
          <Stack.Screen name="index" />
          <Stack.Screen
            name="StatEntryModal"
            options={{
              presentation: 'transparentModal',
              gestureEnabled: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="TurnoverEntryModal"
            options={{
              presentation: 'transparentModal',
              gestureEnabled: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="PullPromptModal"
            options={{
              presentation: 'transparentModal',
              gestureEnabled: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="GameSelectorModal"
            options={{
              presentation: 'transparentModal',
              gestureEnabled: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen name="PlayerStats" options={{ animation: 'none' }} />
          <Stack.Screen name="ViewStats" />
          <Stack.Screen name="Settings" />
          <Stack.Screen name="EditRoster" />
          <Stack.Screen name="GameInfo" />
          <Stack.Screen name="About" />
          <Stack.Screen
            name="WinModal"
            options={{
              presentation: 'transparentModal',
              gestureEnabled: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="GameTimeline"
            options={{
              presentation: 'transparentModal',
              gestureEnabled: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="TeamManagementModal"
            options={{
              presentation: 'transparentModal',
              gestureEnabled: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="HalftimeModal"
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
