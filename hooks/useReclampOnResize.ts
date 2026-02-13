import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import { SharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ReclampOptions {
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  effectiveWidth: number;
  effectiveHeight: number;
}

/**
 * Re-clamps a draggable element's position within screen bounds
 * whenever the screen dimensions change (e.g. rotation).
 */
export function useReclampOnResize({
  translateX,
  translateY,
  effectiveWidth,
  effectiveHeight,
}: ReclampOptions) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const leftBound = insets.left + 8;
    const rightBound = screenWidth - insets.right - effectiveWidth - 24;
    const topBound = insets.top + 40;
    const bottomBound = screenHeight - insets.bottom - effectiveHeight - 8;

    const clampedX = Math.max(leftBound, Math.min(translateX.value, rightBound));
    const clampedY = Math.max(topBound, Math.min(translateY.value, bottomBound));

    translateX.value = withSpring(clampedX);
    translateY.value = withSpring(clampedY);
  }, [screenWidth, screenHeight, effectiveWidth, effectiveHeight, insets, translateX, translateY]);
}
