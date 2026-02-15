import { useTheme } from '@/context/ThemeContext';
import { Stack } from 'expo-router';

export default function MainLayout() {
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
