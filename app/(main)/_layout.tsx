import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';

export default function MainLayout() {
  const { palette } = useTheme();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.chrome }}
      edges={['top', 'bottom', 'left', 'right']}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: palette.primary },
        }}
      />
    </SafeAreaView>
  );
}
