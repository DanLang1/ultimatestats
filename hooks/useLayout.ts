import { SIZE_CLASS_LARGE_THRESHOLD, SIZE_CLASS_MEDIUM_THRESHOLD } from '@/lib/constants';
import { useWindowDimensions } from 'react-native';

export type SizeClass = 'small' | 'medium' | 'large';

export type LayoutInfo = {
  width: number;
  height: number;
  isLandscape: boolean;
  sizeClass: SizeClass;
};

export function useLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();
  const smallestDimension = Math.min(width, height);

  const sizeClass: SizeClass =
    smallestDimension >= SIZE_CLASS_LARGE_THRESHOLD
      ? 'large'
      : smallestDimension >= SIZE_CLASS_MEDIUM_THRESHOLD
        ? 'medium'
        : 'small';

  return {
    width,
    height,
    isLandscape: width > height,
    sizeClass,
  };
}
