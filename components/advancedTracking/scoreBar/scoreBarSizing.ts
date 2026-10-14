import { getSizeClassValue, scaleBySizeClass, SizeClass } from '@/hooks/useLayout';

/**
 * Score bar sizes that jump by design on tablets. In the tablet landscape header row the score bar
 * is half width, about a phone wide, so it scales the phone value instead.
 */
export function getScoreBarSize(
  values: Record<SizeClass, number>,
  sizeClass: SizeClass,
  isHalfWidth: boolean,
): number {
  return isHalfWidth
    ? scaleBySizeClass(values.small, sizeClass)
    : getSizeClassValue(values, sizeClass);
}
