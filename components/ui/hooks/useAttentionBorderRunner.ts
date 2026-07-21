import { useEffect, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const RUNNER_LENGTH = 22;
const RUNNER_THICKNESS = 5;
export const ATTENTION_RUN_DURATION_MS = 1400;

function getRunnerPosition(distance: number, width: number, height: number) {
  'worklet';

  const perimeter = 2 * (width + height);
  const d = distance % perimeter;
  let x = 0;
  let y = 0;
  let rotation = 0;

  if (d <= width) {
    x = d;
    y = 0;
    rotation = 0;
  } else if (d <= width + height) {
    x = width;
    y = d - width;
    rotation = 90;
  } else if (d <= 2 * width + height) {
    x = width - (d - (width + height));
    y = height;
    rotation = 180;
  } else {
    x = 0;
    y = height - (d - (2 * width + height));
    rotation = 270;
  }

  return { x, y, rotation };
}

export function useAttentionBorderRunner(enabled: boolean) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height) {
      setSize({ width, height });
    }
  };

  useEffect(() => {
    if (!enabled || size.width <= 0 || size.height <= 0) {
      cancelAnimation(progress);
      cancelAnimation(opacity);
      opacity.set(0);
      return;
    }

    progress.set(0);
    opacity.set(withTiming(0.82, { duration: 220 }));
    progress.set(withRepeat(withTiming(1, { duration: ATTENTION_RUN_DURATION_MS }), -1, false));
  }, [enabled, size.width, size.height, progress, opacity]);

  const runnerStyle = useAnimatedStyle(() => {
    if (size.width <= 0 || size.height <= 0) {
      return { opacity: 0 };
    }

    const perimeter = 2 * (size.width + size.height);
    const distance = progress.value * perimeter;
    const runner = getRunnerPosition(distance, size.width, size.height);

    return {
      opacity: opacity.value,
      transform: [
        { translateX: runner.x - RUNNER_LENGTH / 2 },
        { translateY: runner.y - RUNNER_THICKNESS / 2 },
        { rotate: `${runner.rotation}deg` },
      ],
    };
  });

  const runnerOffsetStyle = useAnimatedStyle(() => {
    if (size.width <= 0 || size.height <= 0) {
      return { opacity: 0 };
    }

    const perimeter = 2 * (size.width + size.height);
    const distance = (progress.value * perimeter + perimeter / 2) % perimeter;
    const runner = getRunnerPosition(distance, size.width, size.height);

    return {
      opacity: opacity.value,
      transform: [
        { translateX: runner.x - RUNNER_LENGTH / 2 },
        { translateY: runner.y - RUNNER_THICKNESS / 2 },
        { rotate: `${runner.rotation}deg` },
      ],
    };
  });

  return { onLayout, runnerStyle, runnerOffsetStyle, enabled };
}
