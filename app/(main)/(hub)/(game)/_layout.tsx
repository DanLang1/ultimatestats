import { useTheme } from '@/context/ThemeContext';
import { Stack } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';

export default function HubGameLayout() {
  useKeepAwake('HubGameLayout', { suppressDeactivateWarnings: true });
  const { palette } = useTheme();

  return (
    <Stack
      initialRouteName="Scoreboard"
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: palette.primary },
      }}
    />
  );
}
