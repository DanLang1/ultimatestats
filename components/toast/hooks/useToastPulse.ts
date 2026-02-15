import { useEffect } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export function useToastPulse(visible: boolean, instanceId: number) {
  const scale = useSharedValue(1);
  const borderGlow = useSharedValue(0);

  useEffect(() => {
    if (!visible || instanceId === 0) return;
    scale.value = withSequence(
      withTiming(1.04, { duration: 120 }),
      withTiming(1, { duration: 200 }),
    );
    borderGlow.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 500 }),
    );
  }, [visible, instanceId, scale, borderGlow]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderWidth: 2,
    borderColor: `rgba(255,255,255,${0.25 + borderGlow.value * 0.75})`,
  }));

  return animatedStyle;
}
