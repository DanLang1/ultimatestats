import { useTheme } from '@/context/ThemeContext';
import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'EditRoster',
};

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
