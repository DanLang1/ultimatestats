import { useEffect } from 'react';
import {
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
}

export function useBounceAnimation({ delta, isHorizontal }: BounceAnimationOptions) {
  const translate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translate.set(
      withRepeat(
        withSequence(
          withTiming(delta, { duration: 520 }),
          withTiming(0, { duration: 1 }),
          withTiming(0, { duration: 280 }),
        ),
        -1,
        false,
      ),
    );
    opacity.set(
      withRepeat(
        withSequence(
          withTiming(0, { duration: 520 }),
          withTiming(1, { duration: 1 }),
          withTiming(1, { duration: 280 }),
        ),
        -1,
        false,
      ),
    );

    return () => {
      cancelAnimation(translate);
      cancelAnimation(opacity);
    };
  }, [delta, translate, opacity]);

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
