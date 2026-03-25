import { useEffect } from 'react';
import { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

export function usePulseAnimation(active: boolean, duration = 800) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = active ? withRepeat(withTiming(1, { duration }), -1, true) : 0;
  }, [active, duration, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return animatedStyle;
}
