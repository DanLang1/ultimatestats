import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'transparentModal',
        animation: 'none',
        gestureEnabled: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}>
      <Stack.Screen name="number-picker-modal" options={{ animation: 'fade' }} />
      <Stack.Screen name="edit-player-modal" options={{ animation: 'fade' }} />
      <Stack.Screen name="edit-duration-modal" options={{ animation: 'fade' }} />
      <Stack.Screen name="edit-point-line-modal" options={{ animation: 'fade' }} />
    </Stack>
  );
}
