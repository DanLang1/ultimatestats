import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { canCallTimeout, SideTimeoutState } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface TimeoutButtonProps {
  teamName: string;
  state: SideTimeoutState;
  color: string;
  onPress: () => void;
  testID?: string;
  stoppageActive?: boolean;
}

export function TimeoutButton({
  teamName,
  state,
  color,
  onPress,
  testID,
  stoppageActive,
}: TimeoutButtonProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const canUse = canCallTimeout(state) && !stoppageActive;
  const styles = createStyles(sizeClass);
  const remainingLabel = getTimeoutSummary(state);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!canUse}
      style={({ pressed }) => [styles.action, pressed && canUse && { opacity: 0.5 }]}>
      <ThemedText
        style={[styles.teamName, { color: canUse ? palette.textInverse : palette.textMuted }]}
        numberOfLines={1}>
        {teamName}
      </ThemedText>
      <View
        style={[
          styles.pillButton,
          {
            backgroundColor: canUse ? palette.cardBgAlt : palette.overlay05,
            borderColor: canUse ? color : palette.border,
          },
        ]}>
        <ThemedText
          style={[
            styles.pillText,
            {
              color: canUse ? color : palette.textMuted,
            },
          ]}>
          Take T/O
        </ThemedText>
      </View>
      <ThemedText style={[styles.remainingLabel, { color: palette.textMuted }]} numberOfLines={1}>
        {remainingLabel}
      </ThemedText>
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    action: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 0,
      paddingHorizontal: 8,
      paddingVertical: 8,
      gap: 6,
    },
    pillButton: {
      paddingHorizontal: scaleBySizeClass(10, sizeClass),
      paddingVertical: scaleBySizeClass(4, sizeClass),
      borderRadius: 999,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      includeFontPadding: false,
      textAlign: 'center',
    },
    teamName: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.extraBold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    remainingLabel: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: 0,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
  });
}

function getTimeoutSummary(state: SideTimeoutState) {
  const regularRemaining = Math.max(0, state.regularPerHalf - state.regularUsedInHalf);
  const floaterRemaining = state.floaterEnabled && !state.floaterUsed ? 1 : 0;
  const regularLabel = `${regularRemaining} TO`;

  if (!state.floaterEnabled) {
    return regularLabel;
  }

  return `${regularLabel} • ${floaterRemaining} FLOATER`;
}
