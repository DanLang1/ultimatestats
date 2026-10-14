import { Stack } from 'expo-router';

import { useTheme } from '@/context/ThemeContext';

export default function HubTeamLayout() {
  const { palette } = useTheme();

  return (
    <Stack
      initialRouteName="edit-roster"
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: palette.primary },
      }}
    />
  );
}
