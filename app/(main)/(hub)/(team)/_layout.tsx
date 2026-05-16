import { useTheme } from '@/context/ThemeContext';
import { Stack } from 'expo-router';

export default function HubTeamLayout() {
  const { palette } = useTheme();

  return (
    <Stack
      initialRouteName="EditRoster"
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: palette.primary },
      }}
    />
  );
}
