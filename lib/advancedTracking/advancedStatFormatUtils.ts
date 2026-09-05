export function formatDecimal(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1);
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatNullablePercent(value: number | null): string {
  return value == null ? '—' : formatPercent(value);
}
