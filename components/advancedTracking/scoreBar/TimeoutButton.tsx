import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { canCallTimeout, SideTimeoutState } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: canUse ? palette.primary : palette.overlay02,
          borderColor: canUse ? palette.borderLight : palette.border,
        },
        pressed && canUse && { opacity: 0.7 },
      ]}>
      <View style={styles.contentRow}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: canUse ? palette.cardBgAlt : palette.overlay05,
              borderColor: canUse ? color : palette.border,
            },
          ]}>
          <MaterialCommunityIcons
            name="pause"
            size={scaleBySizeClass(15, sizeClass)}
            color={canUse ? color : palette.textMuted}
          />
        </View>
        <View style={styles.textStack}>
          <ThemedText
            style={[styles.teamName, { color: canUse ? palette.textInverse : palette.textMuted }]}
            numberOfLines={1}>
            {teamName}
          </ThemedText>
          <ThemedText style={[styles.actionLabel, { color: canUse ? color : palette.textMuted }]}>
            TIMEOUT
          </ThemedText>
          <ThemedText style={[styles.remainingLabel, { color: palette.textMuted }]}>
            {remainingLabel}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    action: {
      flex: 1,
      alignItems: 'stretch',
      justifyContent: 'center',
      minWidth: 0,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderWidth: 1,
      borderRadius: 16,
      borderCurve: 'continuous',
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 10,
      minWidth: 0,
    },
    iconCircle: {
      width: scaleBySizeClass(28, sizeClass),
      height: scaleBySizeClass(28, sizeClass),
      borderRadius: 999,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textStack: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    teamName: {
      flexShrink: 1,
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    actionLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    remainingLabel: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: 0,
      textTransform: 'uppercase',
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

  return `${regularLabel} • ${floaterRemaining} Floater`;
}
