import { useTheme } from '@/context/ThemeContext';
import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'ViewStats',
};

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
