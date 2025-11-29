import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useState } from 'react';

export function useScreenOrientation() {
  const [orientation, setOrientation] = useState<ScreenOrientation.Orientation>(
    ScreenOrientation.Orientation.UNKNOWN,
  );

  useEffect(() => {
    const checkOrientation = async () => {
      const currentOrientation = await ScreenOrientation.getOrientationAsync();
      setOrientation(currentOrientation);
    };

    checkOrientation();

    const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
      setOrientation(event.orientationInfo.orientation);
    });

    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, []);

  return orientation;
}
