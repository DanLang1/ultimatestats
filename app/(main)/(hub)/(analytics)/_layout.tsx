import { Stack } from 'expo-router';

import { useTheme } from '@/context/ThemeContext';

export const unstable_settings = { anchor: 'view-stats' };

export default function HubStatsLayout() {
  const { palette } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: palette.primary },
      }}
    />
  );
}
