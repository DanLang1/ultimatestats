export type CSVCell = string | number | boolean | null | undefined;

export function escapeCSVCell(value: CSVCell): string {
  if (value == null) return '';

  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;

  return `"${text.replace(/"/g, '""')}"`;
}

export function csvRow(cells: CSVCell[]): string {
  return cells.map(escapeCSVCell).join(',');
}
