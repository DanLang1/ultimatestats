import { useTheme } from '@/context/ThemeContext';
import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'Dashboard',
};

export default function HubHomeLayout() {
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
