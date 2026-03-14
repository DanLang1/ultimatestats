/** Converts a Date to an ISO date string (YYYY-MM-DD), ignoring time. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Formats an ISO date string (YYYY-MM-DD) as MM/DD/YYYY for display. */
export function formatISODateForDisplay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${month}/${day}/${year}`;
}

/** Formats a Date as MM/DD/YYYY for display. */
export function formatDateForDisplay(date: Date): string {
  return formatISODateForDisplay(toISODate(date));
}
