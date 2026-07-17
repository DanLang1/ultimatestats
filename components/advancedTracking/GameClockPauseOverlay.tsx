import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { GameClockPause } from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';

interface GameClockPauseOverlayProps {
  pause: GameClockPause;
}

export const GameClockPauseOverlay = ({ pause }: GameClockPauseOverlayProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { resumeGameClockPause } = useAdvancedTrackingStore();

  const handleResume = () => {
    resumeGameClockPause(pause.id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ThemedText style={[styles.bannerLabel, { color: palette.warning }]}>CAP PAUSED</ThemedText>

        <Pressable
          testID="game-clock-pause-resume"
          style={({ pressed }) => [
            styles.actionBtn,
            {
              borderColor: palette.success,
              backgroundColor: palette.successOverlay10,
            },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleResume}>
          <ThemedText style={[styles.actionBtnText, { color: palette.success }]}>RESUME</ThemedText>
        </Pressable>
      </View>
    </View>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'center' },
    content: {
      alignItems: 'center',
      gap: scaleBySizeClass(32, sizeClass),
      paddingHorizontal: scaleBySizeClass(32, sizeClass),
    },
    bannerLabel: {
      fontSize: scaleBySizeClass(22, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 3,
    },
    actionBtn: {
      width: '100%',
      maxWidth: 400,
      paddingVertical: scaleBySizeClass(18, sizeClass),
      borderWidth: 1,
      borderRadius: 20,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBtnText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(14, sizeClass),
      letterSpacing: 1,
    },
  });
}
