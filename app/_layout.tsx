import { AlertProvider } from '@/components/ui/AlertProvider';
import { palette } from '@/theme/theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: palette.primary,
        }}
        edges={['left', 'right']}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen
              name="StatEntryModal"
              options={{
                presentation: 'transparentModal',
                animation: 'fade',
                gestureEnabled: false,
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
            <Stack.Screen
              name="TurnoverEntryModal"
              options={{
                presentation: 'transparentModal',
                animation: 'fade',
                gestureEnabled: false,
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
            <Stack.Screen
              name="PullPromptModal"
              options={{
                presentation: 'transparentModal',
                animation: 'fade',
                gestureEnabled: false,
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
            <Stack.Screen
              name="WinModal"
              options={{
                presentation: 'transparentModal',
                animation: 'fade',
                gestureEnabled: false,
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
          </Stack>

          <StatusBar style="auto" hidden />
        </GestureHandlerRootView>
      </SafeAreaView>
    </AlertProvider>
  );
}
