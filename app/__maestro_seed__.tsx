import { useTheme } from '@/context/ThemeContext';
import {
  seedAdvancedTrackerTestGame,
  seedMaestroTeamPrerequisites,
  waitForMaestroStoresToHydrate,
} from '@/lib/maestroUtils';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export default function MaestroSeedScreen() {
  const { palette } = useTheme();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [isSeeding, setIsSeeding] = useState(false);

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  const handleContinue = async () => {
    if (isSeeding) return;

    setIsSeeding(true);
    await waitForMaestroStoresToHydrate();
    if (mode === 'team') {
      await seedMaestroTeamPrerequisites({ clearActiveGame: true });
      router.replace('/Dashboard');
      return;
    }

    await seedAdvancedTrackerTestGame();
    router.replace('/advancedTracking/Tracker');
  };

  return (
    <Pressable
      accessibilityLabel="Continue to test tracker"
      onPress={() => {
        void handleContinue();
      }}
      style={[styles.container, { backgroundColor: palette.chrome }]}
      testID="maestro-setup-ready">
      <View style={styles.content} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
