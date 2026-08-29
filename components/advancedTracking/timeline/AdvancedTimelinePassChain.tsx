import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { ThrowDisplayAction } from '@/lib/advancedTracking/advancedTimelineUtils';
import { formatClockDuration } from '@/lib/durationFormatUtils';
import { hasItems } from '@/lib/utils';
import { Fonts } from '@/theme/theme';

interface AdvancedTimelinePassChainProps {
  actions: ThrowDisplayAction[];
  showElapsed?: boolean;
  onEdit?: () => void;
}

export default function AdvancedTimelinePassChain({
  actions,
  showElapsed = false,
  onEdit,
}: AdvancedTimelinePassChainProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const [isTextExpanded, setIsTextExpanded] = useState(false);

  if (!hasItems(actions)) return null;

  const firstElapsed = actions[0].elapsedMs;
  const lastAction = actions.at(-1);
  const lastElapsed = lastAction?.elapsedMs;

  const chainText = actions.map((a) => a.throwerName).join(' -> ');
  const lastReceiver = lastAction?.receiverName;
  const fullText = lastReceiver ? `${chainText} -> ${lastReceiver}` : chainText;

  return (
    <Pressable
      testID={`advanced-timeline-chain-${actions[0].id}`}
      accessibilityRole="button"
      accessibilityLabel={isTextExpanded ? 'Collapse pass chain' : 'Show full pass chain'}
      onPress={() => setIsTextExpanded((prev) => !prev)}
      style={({ pressed }) => [
        styles.container,
        pressed && { backgroundColor: palette.overlay05 },
      ]}>
      <View style={styles.chainBody}>
        <ThemedText
          style={[styles.chainText, { color: palette.textInverse }]}
          numberOfLines={isTextExpanded ? undefined : 2}>
          {fullText}
        </ThemedText>
        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: palette.accentOverlay15 }]}>
            <ThemedText style={[styles.badgeText, { color: palette.accent }]}>
              {actions.length} pass{actions.length !== 1 ? 'es' : ''}
            </ThemedText>
          </View>
          {showElapsed && firstElapsed != null && lastElapsed != null && (
            <ThemedText style={[styles.elapsedLabel, { color: palette.textMuted }]}>
              {formatClockDuration(firstElapsed)} – {formatClockDuration(lastElapsed)}
            </ThemedText>
          )}
        </View>
      </View>
      {onEdit != null && (
        <Pressable
          testID={`advanced-timeline-action-${actions[0].id}`}
          accessibilityRole="button"
          accessibilityLabel="Edit pass chain participants"
          accessibilityHint="Opens participant correction"
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          style={({ pressed }) => [styles.editButton, pressed && styles.editButtonPressed]}>
          <MaterialCommunityIcons
            name="pencil-outline"
            size={scaleBySizeClass(15, sizeClass)}
            color={palette.accent}
          />
        </Pressable>
      )}
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
      paddingHorizontal: 4,
      borderRadius: 6,
    },
    chainBody: {
      flex: 1,
      gap: 4,
    },
    chainText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      lineHeight: scaleBySizeClass(17, sizeClass),
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    badge: {
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 1.5,
    },
    badgeText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
    },
    elapsedLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    editButton: {
      padding: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    editButtonPressed: {
      opacity: 0.7,
    },
  });
}
