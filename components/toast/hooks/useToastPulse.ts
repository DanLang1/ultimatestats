import { useEffect } from 'react';
import {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const BORDER_RUNNER_LENGTH = 44;
const BORDER_RUNNER_THICKNESS = 5;

export function useToastPulse(
  visible: boolean,
  instanceId: number,
  toastWidth: number,
  toastHeight: number,
) {
  const scale = useSharedValue(1);
  const borderRunnerProgress = useSharedValue(0);
  const borderRunnerOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible || instanceId === 0 || toastWidth <= 0 || toastHeight <= 0) {
      cancelAnimation(borderRunnerProgress);
      cancelAnimation(borderRunnerOpacity);
      borderRunnerOpacity.set(0);
      return;
    }

    scale.set(withSequence(withTiming(1.04, { duration: 120 }), withTiming(1, { duration: 200 })));
    borderRunnerProgress.set(0);
    borderRunnerOpacity.set(withTiming(1, { duration: 120 }));
    borderRunnerProgress.set(withRepeat(withTiming(1, { duration: 1700 }), -1, false));
  }, [
    visible,
    instanceId,
    toastWidth,
    toastHeight,
    scale,
    borderRunnerProgress,
    borderRunnerOpacity,
  ]);

  const toastAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: scale.get() }],
    };
  });

  const borderRunnerAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    if (toastWidth <= 0 || toastHeight <= 0) {
      return { opacity: 0 };
    }

    const perimeter = 2 * (toastWidth + toastHeight);
    const distance = borderRunnerProgress.get() * perimeter;
    let x = 0;
    let y = 0;
    let rotation = 0;

    if (distance <= toastWidth) {
      x = distance;
      y = 0;
      rotation = 0;
    } else if (distance <= toastWidth + toastHeight) {
      x = toastWidth;
      y = distance - toastWidth;
      rotation = 90;
    } else if (distance <= 2 * toastWidth + toastHeight) {
      x = toastWidth - (distance - (toastWidth + toastHeight));
      y = toastHeight;
      rotation = 180;
    } else {
      x = 0;
      y = toastHeight - (distance - (2 * toastWidth + toastHeight));
      rotation = 270;
    }

    return {
      opacity: borderRunnerOpacity.get(),
      transform: [
        { translateX: x - BORDER_RUNNER_LENGTH / 2 },
        { translateY: y - BORDER_RUNNER_THICKNESS / 2 },
        { rotate: `${rotation}deg` },
      ],
    };
  });

  const borderRunnerOffsetAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    if (toastWidth <= 0 || toastHeight <= 0) {
      return { opacity: 0 };
    }

    const perimeter = 2 * (toastWidth + toastHeight);
    const distance = (borderRunnerProgress.get() * perimeter + perimeter / 2) % perimeter;
    let x = 0;
    let y = 0;
    let rotation = 0;

    if (distance <= toastWidth) {
      x = distance;
      y = 0;
      rotation = 0;
    } else if (distance <= toastWidth + toastHeight) {
      x = toastWidth;
      y = distance - toastWidth;
      rotation = 90;
    } else if (distance <= 2 * toastWidth + toastHeight) {
      x = toastWidth - (distance - (toastWidth + toastHeight));
      y = toastHeight;
      rotation = 180;
    } else {
      x = 0;
      y = toastHeight - (distance - (2 * toastWidth + toastHeight));
      rotation = 270;
    }

    return {
      opacity: borderRunnerOpacity.get(),
      transform: [
        { translateX: x - BORDER_RUNNER_LENGTH / 2 },
        { translateY: y - BORDER_RUNNER_THICKNESS / 2 },
        { rotate: `${rotation}deg` },
      ],
    };
  });

  return { toastAnimatedStyle, borderRunnerAnimatedStyle, borderRunnerOffsetAnimatedStyle };
}
