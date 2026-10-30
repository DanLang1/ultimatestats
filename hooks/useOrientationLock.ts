import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';

import { OrientationMode } from '@/store/settingsStore';

export function useOrientationLock(mode: OrientationMode) {
  useEffect(() => {
    const applyOrientation = async () => {
      try {
        if (mode === 'portrait') {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        } else if (mode === 'landscape') {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        } else {
          await ScreenOrientation.unlockAsync();
        }
      } catch {
        // Some devices/OS variants can reject lock requests; fail silently.
      }
    };

    void applyOrientation();
  }, [mode]);
}
