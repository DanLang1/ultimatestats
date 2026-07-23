import { useEffect, useRef } from 'react';
import { SharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLayout } from './useLayout';

interface ReclampOptions {
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  effectiveWidth: number;
  effectiveHeight: number;
}

/**
 * Re-clamps a draggable element's position within screen bounds
 * whenever the screen dimensions change (e.g. rotation).
 * On landscape → portrait transitions, snaps Y to bottom to avoid
 * overlapping the settings bar.
 */
export function useReclampOnResize({
  translateX,
  translateY,
  effectiveWidth,
  effectiveHeight,
}: ReclampOptions) {
  const { width: screenWidth, height: screenHeight, isLandscape } = useLayout();
  const insets = useSafeAreaInsets();
  const wasLandscape = useRef(isLandscape);

  useEffect(() => {
    const leftBound = 8;
    const rightBound = screenWidth - insets.left - insets.right - effectiveWidth - 24;
    const topBound = insets.top + 40;
    const bottomBound = screenHeight - insets.top - insets.bottom - effectiveHeight - 48;

    const clampedX = Math.max(leftBound, Math.min(translateX.get(), rightBound));

    const didFlipToPortrait = wasLandscape.current && !isLandscape;
    wasLandscape.current = isLandscape;

    const clampedY = didFlipToPortrait
      ? bottomBound
      : Math.max(topBound, Math.min(translateY.get(), bottomBound));

    translateX.set(withSpring(clampedX));
    translateY.set(withSpring(clampedY));
  }, [
    screenWidth,
    screenHeight,
    effectiveWidth,
    effectiveHeight,
    insets,
    translateX,
    translateY,
    isLandscape,
  ]);
}
