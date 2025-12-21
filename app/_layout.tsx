import { palette } from '@/constants/theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: palette.primary,
      }}
      edges={['left', 'right']}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>

        <StatusBar style="auto" hidden />
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}
