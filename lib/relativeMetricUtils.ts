export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getRoundedPercentagePointDelta(raw: number, comparison: number): number {
  return Math.round(raw * 100) - Math.round(comparison * 100);
}

export function getRoundedDecimalDelta(raw: number, comparison: number): number {
  return (Math.round(raw * 10) - Math.round(comparison * 10)) / 10;
}
