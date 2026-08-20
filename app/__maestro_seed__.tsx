import { Redirect, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { useMaestroSetup } from '@/hooks/useMaestroSetup';

export default function MaestroSeedScreen() {
  const { palette } = useTheme();
  const { capMode, gameTo, gameType, mode, rosterView, trackerState } = useLocalSearchParams<{
    capMode?: string;
    gameTo?: string;
    gameType?: string;
    mode?: string;
    rosterView?: string;
    trackerState?: string;
  }>();
  const errorMessage = useMaestroSetup({
    capMode,
    gameTo,
    gameType,
    mode,
    rosterView,
    trackerState,
  });

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <View
      accessibilityLabel={errorMessage ?? 'Preparing Maestro test state'}
      style={[styles.container, { backgroundColor: palette.chrome }]}
      testID={errorMessage == null ? 'maestro-setup-running' : 'maestro-setup-error'}
      accessible>
      <ThemedText
        style={[
          styles.statusText,
          { color: errorMessage == null ? palette.textMuted : palette.danger },
        ]}>
        {errorMessage ?? 'PREPARING MAESTRO TEST STATE'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    paddingHorizontal: 24,
    textAlign: 'center',
  },
});
