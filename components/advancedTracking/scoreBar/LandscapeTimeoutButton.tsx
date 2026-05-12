import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { canCallTimeout, SideTimeoutState } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface LandscapeTimeoutButtonProps {
  state: SideTimeoutState;
  onPress: () => void;
  stoppageActive?: boolean;
}

export function LandscapeTimeoutButton({
  state,
  onPress,
  stoppageActive,
}: LandscapeTimeoutButtonProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const regularsLeft = Math.max(state.regularPerHalf - state.regularUsedInHalf, 0);
  const floaterAvailable = state.floaterEnabled && !state.floaterUsed;
  const totalLeft = regularsLeft + (floaterAvailable ? 1 : 0);
  const canUse = canCallTimeout(state) && !stoppageActive;
  const styles = createStyles(sizeClass);

  return (
    <Pressable
      onPress={onPress}
      disabled={!canUse}
      hitSlop={12}
      style={({ pressed }) => [styles.btn, pressed && canUse && { opacity: 0.6 }]}>
      <ThemedText
        style={[styles.btnText, { color: canUse ? palette.textInverse : palette.textMuted }]}>
        {totalLeft} TO
      </ThemedText>
      {floaterAvailable && (
        <View
          style={[
            styles.btnDiamond,
            { borderColor: palette.accent, backgroundColor: palette.accent },
          ]}
        />
      )}
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 4,
      paddingVertical: 4,
      zIndex: 1,
    },
    btnText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 1,
      fontVariant: ['tabular-nums'],
    },
    btnDiamond: {
      width: 8,
      height: 8,
      borderRadius: 1,
      transform: [{ rotate: '45deg' }],
    },
  });
}
