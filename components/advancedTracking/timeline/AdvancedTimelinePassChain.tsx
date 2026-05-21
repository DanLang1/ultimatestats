import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { ThrowDisplayAction } from '@/lib/advancedTracking/advancedTimelineUtils';
import { formatClockDuration } from '@/lib/timelineUtils';
import { hasItems } from '@/lib/utils';
import { Fonts } from '@/theme/theme';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface AdvancedTimelinePassChainProps {
  actions: ThrowDisplayAction[];
  showElapsed?: boolean;
}

export default function AdvancedTimelinePassChain({
  actions,
  showElapsed = false,
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
    <Pressable onPress={() => setIsTextExpanded((prev) => !prev)}>
      <View
        style={[
          styles.container,
          { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
        ]}>
        <ThemedText
          style={[styles.chainText, { color: palette.textInverse }]}
          numberOfLines={isTextExpanded ? undefined : 2}>
          {fullText}
        </ThemedText>
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
    </Pressable>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      flexWrap: 'wrap',
    },
    chainText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      flexShrink: 1,
    },
    badge: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    badgeText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
    },
    elapsedLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
      opacity: 0.7,
    },
  });
}
