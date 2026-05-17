import { csvRow, escapeCSVCell } from '../csvUtils';

describe('csvUtils', () => {
  it('quotes cells containing commas, quotes, or newlines', () => {
    expect(escapeCSVCell('Chicago, IL')).toBe('"Chicago, IL"');
    expect(escapeCSVCell('Sam "Ace" Lee')).toBe('"Sam ""Ace"" Lee"');
    expect(escapeCSVCell('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    expect(escapeCSVCell('Line 1\r\nLine 2')).toBe('"Line 1\r\nLine 2"');
  });

  it('joins escaped cells into a CSV row', () => {
    expect(csvRow(['Player', 'Chicago, IL', 2, null])).toBe('Player,"Chicago, IL",2,');
  });

  it('handles empty and blank rows', () => {
    expect(csvRow([])).toBe('');
    expect(csvRow(['', '', ''])).toBe(',,');
  });

  it('stringifies booleans and leaves nullish values empty', () => {
    expect(csvRow([true, false, undefined, null])).toBe('true,false,,');
  });
});
