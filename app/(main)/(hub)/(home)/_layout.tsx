import { Stack } from 'expo-router';

import { useTheme } from '@/context/ThemeContext';

export default function HubHomeLayout() {
  const { palette } = useTheme();

  return (
    <Stack
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: palette.primary },
      }}
    />
  );
}
