import { Platform, useWindowDimensions } from 'react-native';

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const smallestDimension = Math.min(width, height);

  return {
    width,
    height,
    isLandscape: width > height,
    isNarrow: width < 380,
    isAndroidLargeScreen: Platform.OS === 'android' && smallestDimension >= 600,
  };
}
