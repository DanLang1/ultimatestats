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
      <Stack.Screen name="NumberPickerModal" options={{ animation: 'fade' }} />
      <Stack.Screen name="EditPlayerModal" options={{ animation: 'fade' }} />
      <Stack.Screen name="EditDurationModal" options={{ animation: 'fade' }} />
    </Stack>
  );
}
