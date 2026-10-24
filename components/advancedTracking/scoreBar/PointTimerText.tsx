import type { StyleProp, TextStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useNow } from '@/hooks/useTimer';
import { formatPointTime } from '@/lib/advancedTracking/trackingDisplayHelpers';

interface PointTimerTextProps {
  pointTimerBase: number | null;
  pointTimerPausedAt: number | null;
  showPointTimer: boolean;
  pointIsOver: boolean;
  isPointTimerPaused: boolean;
  style: StyleProp<TextStyle>;
}

export function PointTimerText({
  pointTimerBase,
  pointTimerPausedAt,
  showPointTimer,
  pointIsOver,
  isPointTimerPaused,
  style,
}: PointTimerTextProps) {
  const now = useNow(showPointTimer && !isPointTimerPaused);
  // A point without a recorded start has no timing to show.
  const showsElapsed = pointTimerBase !== null && (showPointTimer || pointIsOver);
  const label = showsElapsed
    ? formatPointTime(Math.max(0, (pointTimerPausedAt ?? now) - pointTimerBase))
    : '-:--';

  return (
    <ThemedText testID="scorebar-point-timer" style={style}>
      {label}
    </ThemedText>
  );
}
