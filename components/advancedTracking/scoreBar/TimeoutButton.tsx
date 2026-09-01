import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { canCallTimeout, SideTimeoutState } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { Fonts } from '@/theme/theme';

interface TimeoutButtonProps {
  teamName: string;
  state: SideTimeoutState;
  color: string;
  onPress: () => void;
  testID?: string;
  stoppageActive?: boolean;
}

const TEAM_NAME_FONT_SIZE: Record<SizeClass, number> = { small: 12, medium: 16, large: 20 };
const PILL_TEXT_FONT_SIZE: Record<SizeClass, number> = { small: 11, medium: 14, large: 17 };
const REMAINING_FONT_SIZE: Record<SizeClass, number> = { small: 10, medium: 13, large: 16 };
const PILL_HORIZONTAL_PADDING: Record<SizeClass, number> = { small: 10, medium: 16, large: 22 };
const PILL_VERTICAL_PADDING: Record<SizeClass, number> = { small: 4, medium: 7, large: 10 };

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
    <View style={styles.action}>
      <ThemedText
        style={[styles.teamName, { color: canUse ? palette.textInverse : palette.textMuted }]}
        numberOfLines={1}>
        {teamName}
      </ThemedText>
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={!canUse}
        hitSlop={4}
        style={({ pressed }) => [
          styles.pillButton,
          {
            backgroundColor: canUse ? color + '18' : palette.overlay05,
            borderColor: canUse ? color : palette.border,
          },
          pressed && canUse && { opacity: 0.5 },
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
      </Pressable>
      <ThemedText style={[styles.remainingLabel, { color: palette.textMuted }]} numberOfLines={1}>
        {remainingLabel}
      </ThemedText>
    </View>
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
      paddingHorizontal: getSizeClassValue(PILL_HORIZONTAL_PADDING, sizeClass),
      paddingVertical: getSizeClassValue(PILL_VERTICAL_PADDING, sizeClass),
      borderRadius: 999,
      borderWidth: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillText: {
      fontSize: getSizeClassValue(PILL_TEXT_FONT_SIZE, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      includeFontPadding: false,
      textAlign: 'center',
    },
    teamName: {
      fontSize: getSizeClassValue(TEAM_NAME_FONT_SIZE, sizeClass),
      fontFamily: Fonts.extraBold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    remainingLabel: {
      fontSize: getSizeClassValue(REMAINING_FONT_SIZE, sizeClass),
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
