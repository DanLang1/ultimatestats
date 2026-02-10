import { useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';

/**
 * Unlocks orientation to allow portrait + landscape on the current screen.
 * Re-locks to landscape when the screen loses focus.
 *
 * Usage: call `useOrientationLock()` at the top of any screen component
 * that should support portrait mode.
 */
export function useOrientationLock() {
  useFocusEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    };
  });
}
