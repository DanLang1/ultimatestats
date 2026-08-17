import { useEffect } from 'react';
import {
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface BounceAnimationOptions {
  delta: number;
  isHorizontal: boolean;
  reduceMotion?: ReduceMotion;
}

export function useBounceAnimation({
  delta,
  isHorizontal,
  reduceMotion = ReduceMotion.System,
}: BounceAnimationOptions) {
  const translate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translate.set(
      withRepeat(
        withSequence(
          reduceMotion,
          withTiming(delta, { duration: 520 }),
          withTiming(0, { duration: 1 }),
          withTiming(0, { duration: 280 }),
        ),
        -1,
        false,
        undefined,
        reduceMotion,
      ),
    );
    opacity.set(
      withRepeat(
        withSequence(
          reduceMotion,
          withTiming(0, { duration: 520 }),
          withTiming(1, { duration: 1 }),
          withTiming(1, { duration: 280 }),
        ),
        -1,
        false,
        undefined,
        reduceMotion,
      ),
    );

    return () => {
      cancelAnimation(translate);
      cancelAnimation(opacity);
    };
  }, [delta, opacity, reduceMotion, translate]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: isHorizontal
        ? [{ translateX: translate.get() }]
        : [{ translateY: translate.get() }],
      opacity: opacity.get(),
    };
  });

  return animatedStyle;
}
