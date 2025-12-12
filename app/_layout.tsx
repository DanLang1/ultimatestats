import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor:
            colorScheme === 'dark' ? DarkTheme.colors.background : DefaultTheme.colors.background,
        }}
        edges={['left', 'right']}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
          </Stack>

          <StatusBar style="auto" hidden />
        </GestureHandlerRootView>
      </SafeAreaView>
    </ThemeProvider>
  );
}
