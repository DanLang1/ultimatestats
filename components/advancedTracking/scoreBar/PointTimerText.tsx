import { ThemedText } from '@/components/ThemedText';
import { useTimestampTimer } from '@/hooks/advancedTracking/useTimer';
import { formatPointTime } from '@/lib/advancedTracking/trackingDisplayHelpers';
import type { StyleProp, TextStyle } from 'react-native';

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
  const runningPointElapsedMs = useTimestampTimer({
    timestamp: pointTimerAdjustedTimestamp,
    mode: 'elapsed',
    intervalMs: 1000,
    enabled: showPointTimer && !isPointTimerPaused,
  });
  const pointElapsedMs =
    pointTimerAdjustedTimestamp != null && pointTimerPausedAt != null
      ? Math.max(0, pointTimerPausedAt - pointTimerAdjustedTimestamp)
      : runningPointElapsedMs;
  const label = showPointTimer || pointIsOver ? formatPointTime(pointElapsedMs) : '-:--';

  return <ThemedText style={style}>{label}</ThemedText>;
}
