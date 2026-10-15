import { Stack } from 'expo-router';

import { useTheme } from '@/context/ThemeContext';

export const unstable_settings = { anchor: 'edit-roster' };

export default function HubTeamLayout() {
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
