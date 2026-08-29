import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
  onPress?: () => void;
  editHint?: string;
}

function getToneColor(tone: ActionTone, palette: Record<string, string>) {
  switch (tone) {
    case 'success':
      return palette.success;
    case 'danger':
      return palette.danger;
    case 'warning':
      return palette.warning;
    case 'accent':
      return palette.accent;
    case 'muted':
    default:
      return palette.textInverse;
  }
}

export default function AdvancedTimelineActionChip({
  action,
  showElapsed = false,
  onPress,
  editHint,
}: AdvancedTimelineActionChipProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const textColor = getToneColor(action.tone, palette);

  const content = (
    <View style={styles.actionRow}>
      {showElapsed && action.elapsedMs != null && (
        <ThemedText style={[styles.elapsedText, { color: palette.textMuted }]}>
          {formatClockDuration(action.elapsedMs)}
        </ThemedText>
      )}
      <View style={styles.labelsContainer}>
        <ThemedText style={[styles.primaryLabel, { color: textColor }]} numberOfLines={2}>
          {action.primaryLabel}
        </ThemedText>
        {action.secondaryLabel && (
          <View style={[styles.secondaryBadge, { backgroundColor: palette.overlay08 }]}>
            <ThemedText
              style={[styles.secondaryLabel, { color: palette.textMuted }]}
              numberOfLines={1}>
              {action.secondaryLabel}
            </ThemedText>
          </View>
        )}
      </View>
      {onPress != null && (
        <View style={styles.editIconWrapper}>
          <MaterialCommunityIcons
            name="pencil-outline"
            size={scaleBySizeClass(14, sizeClass)}
            color={palette.accent}
          />
        </View>
      )}
    </View>
  );

  if (onPress == null) {
    return <View style={styles.container}>{content}</View>;
  }

  const editAccessibilityLabel = action.secondaryLabel
    ? `Edit ${action.primaryLabel}, ${action.secondaryLabel}`
    : `Edit ${action.primaryLabel}`;

  return (
    <Pressable
      testID={`advanced-timeline-action-${action.id}`}
      accessibilityRole="button"
      accessibilityLabel={editAccessibilityLabel}
      accessibilityHint={editHint ?? 'Opens participant correction'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && { backgroundColor: palette.overlay05 },
      ]}>
      {content}
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      minHeight: 34,
      justifyContent: 'center',
      paddingVertical: 3,
      paddingHorizontal: 4,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    elapsedText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
      minWidth: scaleBySizeClass(30, sizeClass),
    },
    labelsContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    primaryLabel: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    secondaryBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 4,
    },
    secondaryLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    editIconWrapper: {
      padding: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}
