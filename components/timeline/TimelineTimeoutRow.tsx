import TimelineInteractiveRow from '@/components/timeline/TimelineInteractiveRow';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { DisplayTimeout } from '@/lib/timelineUtils';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
        <Text style={[styles.eventLabel, { color: palette.warning }]}>
          {timeout.isFloater ? 'FLOATER' : 'TIMEOUT'}
        </Text>
        <Text style={[styles.eventPlayer, { color: palette.textMuted }]}>
          {isOurTimeout ? 'Us' : 'Opp'}
        </Text>
        {relativeTime && (
          <Text style={[styles.eventTimestamp, { color: palette.textMuted }]}>{relativeTime}</Text>
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
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    eventPlayer: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '500',
      maxWidth: 100,
      flexShrink: 1,
    },
    eventTimestamp: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontWeight: '500',
      marginLeft: 4,
      opacity: 0.7,
    },
  });
}
