// Generate a simple unique ID for storage entities
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/** True when an array exists and has at least one item. */
export function hasItems<T>(arr: readonly T[] | null | undefined): arr is readonly T[] {
  return Array.isArray(arr) && arr.length > 0;
}

/** Singular when count is exactly 1, plural otherwise. */
export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/** Compact decimal: integers as-is, others with one decimal place. */
export function formatDecimal(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1);
}

/** Ratio as a rounded percent string, e.g. 0.67 -> "67%". */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Percent string, or an em dash when there is no sample. */
export function formatNullablePercent(value: number | null): string {
  return value == null ? '—' : formatPercent(value);
}

/** Format seconds as M:SS, with a leading minus for negative (overtime) values. */
export function formatTimerSeconds(seconds: number): string {
  const abs = Math.abs(seconds);
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  const formatted = `${mins}:${secs.toString().padStart(2, '0')}`;
  return seconds < 0 ? `-${formatted}` : formatted;
}
