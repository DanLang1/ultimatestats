import TimelineInteractiveRow from '@/components/basic/timeline/TimelineInteractiveRow';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { DisplayTimeout } from '@/lib/basic/timelineUtils';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';

interface TimelineTimeoutRowProps {
  timeout: DisplayTimeout;
  relativeTime?: string;
  canEditTime: boolean;
  onEditTime: () => void;
}

export default function TimelineTimeoutRow({
  timeout,
  relativeTime,
  canEditTime,
  onEditTime,
}: TimelineTimeoutRowProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const isOurTimeout = timeout.team === 'team1';

  return (
    <TimelineInteractiveRow canTap={canEditTime} onTap={onEditTime}>
      <View style={[styles.eventRow, { backgroundColor: palette.warning + '20' }]}>
        <ThemedText style={[styles.eventLabel, { color: palette.warning }]}>
          {timeout.isFloater ? 'FLOATER' : 'TIMEOUT'}
        </ThemedText>
        <ThemedText style={[styles.eventPlayer, { color: palette.textMuted }]}>
          {isOurTimeout ? 'Us' : 'Opp'}
        </ThemedText>
        {relativeTime && (
          <ThemedText style={[styles.eventTimestamp, { color: palette.textMuted }]}>
            {relativeTime}
          </ThemedText>
        )}
      </View>
    </TimelineInteractiveRow>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    eventLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.3,
    },
    eventPlayer: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      maxWidth: 100,
      flexShrink: 1,
    },
    eventTimestamp: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
      marginLeft: 4,
      opacity: 0.7,
    },
  });
}
