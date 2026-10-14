import { useWindowDimensions } from 'react-native';

import {
  COMPACT_HEIGHT_THRESHOLD,
  SIZE_CLASS_LARGE_THRESHOLD,
  SIZE_CLASS_MEDIUM_THRESHOLD,
} from '@/lib/constants';

export type SizeClass = 'small' | 'medium' | 'large';

const SIZE_CLASS_SCALE: Record<SizeClass, number> = {
  small: 1,
  medium: 1.1,
  large: 1.2,
};

export type LayoutInfo = {
  width: number;
  height: number;
  isLandscape: boolean;
  sizeClass: SizeClass;
  /**
   * Short window in the current orientation. Independent of `sizeClass`: fixed-height screens opt
   * in to shrink their chrome, while scrolling screens can ignore it. Shrink only the fixed parts
   * and let a measured flexible area (e.g. the tracker's player grid) take the freed space.
   */
  isCompactHeight: boolean;
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

function determineSizeClass(dimension: number): SizeClass {
  if (dimension >= SIZE_CLASS_LARGE_THRESHOLD) return 'large';
  if (dimension >= SIZE_CLASS_MEDIUM_THRESHOLD) return 'medium';
  return 'small';
}

export function useLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();
  // Size class uses the shorter screen edge so it stays constant across rotation; text and spacing
  // scaling should not jump when the device turns (unlike Material's width-based classes).
  const smallestDimension = Math.min(width, height);

  const sizeClass = determineSizeClass(smallestDimension);

  return {
    width,
    height,
    isLandscape: width > height,
    sizeClass,
    isCompactHeight: height < COMPACT_HEIGHT_THRESHOLD,
  };
}
