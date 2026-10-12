import type { StyleProp, TextStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useNow } from '@/hooks/useTimer';
import { formatPointTime } from '@/lib/advancedTracking/trackingDisplayHelpers';

interface PointTimerTextProps {
  pointTimerAdjustedTimestamp: number | null;
  pointTimerPausedAt: number | null;
  showPointTimer: boolean;
  pointIsOver: boolean;
  isPointTimerPaused: boolean;
  style: StyleProp<TextStyle>;
}

export function PointTimerText({
  pointTimerAdjustedTimestamp,
  pointTimerPausedAt,
  showPointTimer,
  pointIsOver,
  isPointTimerPaused,
  style,
}: PointTimerTextProps) {
  const now = useNow(showPointTimer && !isPointTimerPaused);
  const pointElapsedMs =
    pointTimerAdjustedTimestamp === null
      ? 0
      : Math.max(0, (pointTimerPausedAt ?? now) - pointTimerAdjustedTimestamp);
  const label = showPointTimer || pointIsOver ? formatPointTime(pointElapsedMs) : '-:--';

  return (
    <ThemedText testID="scorebar-point-timer" style={style}>
      {label}
    </ThemedText>
  );
}
