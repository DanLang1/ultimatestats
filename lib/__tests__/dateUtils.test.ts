import { formatRecentDay, formatTournamentDateRange } from '../dateUtils';

const thisYear = new Date().getFullYear();
const lastYear = thisYear - 1;

function format(year: number, month: number, day: number, options: Intl.DateTimeFormatOptions) {
  return new Date(year, month, day).toLocaleDateString(undefined, options);
}

const monthDay = { month: 'short', day: 'numeric' } as const;
const monthDayYear = { ...monthDay, year: 'numeric' } as const;

describe('formatTournamentDateRange', () => {
  it('shortens single days, same-month ranges, and cross-month ranges in the current year', () => {
    const october = format(thisYear, 9, 1, { month: 'short' });
    expect(formatTournamentDateRange(`${thisYear}-10-04`, `${thisYear}-10-04`)).toBe(
      format(thisYear, 9, 4, monthDay),
    );
    expect(formatTournamentDateRange(`${thisYear}-10-18`, `${thisYear}-10-19`)).toBe(
      `${october} 18–19`,
    );
    expect(formatTournamentDateRange(`${thisYear}-09-30`, `${thisYear}-10-02`)).toBe(
      `${format(thisYear, 8, 30, monthDay)} – ${format(thisYear, 9, 2, monthDay)}`,
    );
  });

  it('adds the year outside the current year, on both ends when the range crosses a year', () => {
    const october = format(lastYear, 9, 1, { month: 'short' });
    expect(formatTournamentDateRange(`${lastYear}-10-04`, `${lastYear}-10-04`)).toBe(
      format(lastYear, 9, 4, monthDayYear),
    );
    expect(formatTournamentDateRange(`${lastYear}-10-18`, `${lastYear}-10-19`)).toBe(
      `${october} 18–19, ${lastYear}`,
    );
    expect(formatTournamentDateRange(`${lastYear}-12-30`, `${thisYear}-01-02`)).toBe(
      `${format(lastYear, 11, 30, monthDayYear)} – ${format(thisYear, 0, 2, monthDayYear)}`,
    );
  });
});

describe('formatRecentDay', () => {
  it('adds the year only outside the current year', () => {
    expect(formatRecentDay(new Date(thisYear, 9, 19).getTime())).toBe(
      format(thisYear, 9, 19, monthDay),
    );
    expect(formatRecentDay(new Date(lastYear, 9, 19).getTime())).toBe(
      format(lastYear, 9, 19, monthDayYear),
    );
  });
});
