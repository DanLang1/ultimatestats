import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type {
  ActionTone,
  AdvancedTimelineAction,
} from '@/lib/advancedTracking/advancedTimelineUtils';
import { formatClockDuration } from '@/lib/durationFormatUtils';
import { Fonts } from '@/theme/theme';

interface AdvancedTimelineActionChipProps {
  action: AdvancedTimelineAction;
  showElapsed?: boolean;
  onLongPress?: () => void;
}

function getToneColors(tone: ActionTone, palette: Record<string, string>) {
  switch (tone) {
    case 'success':
      return {
        backgroundColor: palette.successOverlay10,
        textColor: palette.success,
        borderColor: palette.successOverlay15,
      };
    case 'danger':
      return {
        backgroundColor: palette.dangerOverlay10,
        textColor: palette.danger,
        borderColor: palette.dangerOverlay15,
      };
    case 'warning':
      return {
        backgroundColor: palette.warningOverlay10,
        textColor: palette.warning,
        borderColor: palette.warningOverlay15,
      };
    case 'accent':
      return {
        backgroundColor: palette.accentOverlay10,
        textColor: palette.accent,
        borderColor: palette.accentOverlay30,
      };
    case 'muted':
    default:
      return {
        backgroundColor: palette.overlay05,
        textColor: palette.textInverse,
        borderColor: palette.overlay10,
      };
  }
}

export default function AdvancedTimelineActionChip({
  action,
  showElapsed = false,
  onLongPress,
}: AdvancedTimelineActionChipProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { backgroundColor, textColor, borderColor } = getToneColors(action.tone, palette);

  const chip = (
    <View style={[styles.chip, { backgroundColor, borderColor }]}>
      <ThemedText style={[styles.primaryLabel, { color: textColor }]} numberOfLines={1}>
        {action.primaryLabel}
      </ThemedText>
      {action.secondaryLabel && (
        <ThemedText style={[styles.secondaryLabel, { color: palette.textMuted }]} numberOfLines={1}>
          {action.secondaryLabel}
        </ThemedText>
      )}
      {showElapsed && action.elapsedMs != null && (
        <ThemedText style={[styles.elapsedLabel, { color: palette.textMuted }]}>
          {formatClockDuration(action.elapsedMs)}
        </ThemedText>
      )}
    </View>
  );

  if (onLongPress == null) return chip;

  return (
    <Pressable
      testID={`advanced-timeline-action-${action.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${action.primaryLabel}`}
      accessibilityHint="Long press to change the scorer"
      onLongPress={onLongPress}
      delayLongPress={400}>
      {chip}
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      flexWrap: 'wrap',
    },
    primaryLabel: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    secondaryLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    elapsedLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
      marginLeft: 4,
      opacity: 0.7,
    },
  });
}
