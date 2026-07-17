import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import {
  MaestroCapMode,
  seedAdvancedTrackerTestGame,
  seedMaestroTeamPrerequisites,
  waitForMaestroStoresToHydrate,
} from '@/lib/maestroUtils';

export default function MaestroSeedScreen() {
  const { palette } = useTheme();
  const { capMode, mode } = useLocalSearchParams<{ capMode?: string; mode?: string }>();
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

    await seedAdvancedTrackerTestGame({ capMode: parseCapMode(capMode) });
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

function parseCapMode(capMode: string | undefined): MaestroCapMode {
  if (
    capMode === 'both' ||
    capMode === 'hard' ||
    capMode === 'soft' ||
    capMode === 'none' ||
    capMode === 'softActive'
  ) {
    return capMode;
  }

  return 'both';
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
