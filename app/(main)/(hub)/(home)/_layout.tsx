import { useTheme } from '@/context/ThemeContext';
import { Stack } from 'expo-router';

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
