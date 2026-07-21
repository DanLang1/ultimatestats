import { useEffect } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export function usePulseAnimation(active: boolean, duration = 800) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (active) {
      // Snap to 0 first so the repeat always starts from a consistent baseline,
      // regardless of what value the inactive reset left behind.
      pulse.set(
        withSequence(
          withTiming(0, { duration: 0 }),
          withRepeat(withTiming(1, { duration }), -1, true),
        ),
      );
    } else {
      // Fade to fully visible so mounted views don't get stuck at a partial opacity.
      pulse.set(withTiming(1, { duration: 200 }));
    }
  }, [active, duration, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return animatedStyle;
}
