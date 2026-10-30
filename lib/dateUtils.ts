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

/** A game's day, e.g. "Sat, Oct 3, 2026". */
export function formatDayTitle(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isCurrentYear(date: Date): boolean {
  return date.getFullYear() === new Date().getFullYear();
}

/** A recent day like "Oct 19", with the year only when it isn't the current year. */
export function formatRecentDay(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: isCurrentYear(date) ? undefined : 'numeric',
  });
}

/** Parses an ISO date string (YYYY-MM-DD) as local midnight, not UTC. */
function parseISODate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Tournament dates: "Oct 4", "Oct 18–19", or "Sep 30 – Oct 2", with the year added when the
 * tournament isn't in the current year ("Oct 18–19, 2025", "Dec 30, 2025 – Jan 2, 2026").
 */
export function formatTournamentDateRange(startDate: string, endDate: string): string {
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  const showYear = !isCurrentYear(start) || !isCurrentYear(end);
  const endLabel = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: showYear ? 'numeric' : undefined,
  });
  if (startDate === endDate) return endLabel;
  const isSameYear = start.getFullYear() === end.getFullYear();
  if (isSameYear && start.getMonth() === end.getMonth()) {
    const month = start.toLocaleDateString(undefined, { month: 'short' });
    const yearSuffix = showYear ? `, ${end.getFullYear()}` : '';
    return `${month} ${start.getDate()}–${end.getDate()}${yearSuffix}`;
  }
  const startLabel = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: isSameYear ? undefined : 'numeric',
  });
  return `${startLabel} – ${endLabel}`;
}

export function formatTimestampForDisplay(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// CSV-safe date format (no commas or special chars)
export function formatTimestampForCSV(timestamp: number): string {
  const date = new Date(timestamp);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
