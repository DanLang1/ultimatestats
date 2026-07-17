import { Stack } from 'expo-router';

import { useTheme } from '@/context/ThemeContext';

export default function HubStatsLayout() {
  const { palette } = useTheme();

  return (
    <Stack
      initialRouteName="ViewStats"
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: palette.primary },
      }}
    />
  );
}
