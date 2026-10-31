/** Keeps a narrow margin range from stretching one point or game to the full chart height. */
const MIN_MARGIN_SPAN = 3;

export interface MarginRange {
  top: number;
  bottom: number;
}

/**
 * Margins a chart spans: only the range reached, always including the zero line, so one-sided data
 * uses the full height instead of leaving the other half empty.
 */
export function getMarginRange(margins: number[]): MarginRange {
  const top = Math.max(0, ...margins);
  const bottom = Math.min(0, ...margins);
  const shortfall = Math.max(0, MIN_MARGIN_SPAN - (top - bottom));
  // Pad on the side the margins lean toward so the chart keeps its direction.
  return top >= -bottom ? { top: top + shortfall, bottom } : { top, bottom: bottom - shortfall };
}
