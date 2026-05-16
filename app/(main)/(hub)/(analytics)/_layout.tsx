import { useTheme } from '@/context/ThemeContext';
import { Stack } from 'expo-router';

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
