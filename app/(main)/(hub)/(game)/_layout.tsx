import { useKeepAwake } from 'expo-keep-awake';
import { Stack } from 'expo-router';

import { useTheme } from '@/context/ThemeContext';

export const unstable_settings = { anchor: 'scoreboard' };

export default function HubGameLayout() {
  useKeepAwake('HubGameLayout', { suppressDeactivateWarnings: true });
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
