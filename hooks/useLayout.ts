import { SIZE_CLASS_LARGE_THRESHOLD, SIZE_CLASS_MEDIUM_THRESHOLD } from '@/lib/constants';
import { useWindowDimensions } from 'react-native';

export type SizeClass = 'small' | 'medium' | 'large';

export const SIZE_CLASS_SCALE: Record<SizeClass, number> = {
  small: 1,
  medium: 1.1,
  large: 1.2,
};

export type LayoutInfo = {
  width: number;
  height: number;
  isLandscape: boolean;
  sizeClass: SizeClass;
};

type ScaleBySizeClassOptions = {
  min?: number;
  max?: number;
  rounding?: 'round' | 'floor' | 'ceil' | 'none';
};

export function getSizeClassValue<T>(values: Record<SizeClass, T>, sizeClass: SizeClass): T {
  return values[sizeClass];
}

export function scaleBySizeClass(
  base: number,
  sizeClass: SizeClass,
  options?: ScaleBySizeClassOptions,
): number {
  const scaled = base * SIZE_CLASS_SCALE[sizeClass];
  const min = options?.min ?? Number.NEGATIVE_INFINITY;
  const max = options?.max ?? Number.POSITIVE_INFINITY;
  const clamped = Math.min(max, Math.max(min, scaled));

  if (options?.rounding === 'none') return clamped;
  if (options?.rounding === 'floor') return Math.floor(clamped);
  if (options?.rounding === 'ceil') return Math.ceil(clamped);
  return Math.round(clamped);
}

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
