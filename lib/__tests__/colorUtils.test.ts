import { ensureContrast, getContrastingTextColor, normalizeHexColor } from '../colorUtils';

describe('team color formatting', () => {
  it.each([
    ['abc', '#AABBCC'],
    ['#ab12ef', '#AB12EF'],
    ['#ab12ef80', '#AB12EF'],
    ['', '#000000'],
  ])('normalizes %s to an opaque picker color', (input, expected) => {
    expect(normalizeHexColor(input)).toBe(expected);
  });

  it.each([
    ['#fff', '#000000'],
    ['#000000', '#FFFFFF'],
    ['#0000ff', '#FFFFFF'],
    ['#00ff00', '#000000'],
    ['#ff0000', '#000000'],
    ['#invalid', '#FFFFFF'],
    ['#zzzzzz', '#FFFFFF'],
    ['', '#FFFFFF'],
  ])('chooses readable text against %s', (background, expected) => {
    expect(getContrastingTextColor(background)).toBe(expected);
  });
});

describe('contrast adjustment', () => {
  it.each(['rgba(0,0,0,0.5)', '#zzzzzz', ''])(
    'preserves an unparseable palette color: %s',
    (color) => {
      expect(ensureContrast(color, '#ffffff', 4.5)).toBe(color);
    },
  );

  it('keeps an already readable color and handles shorthand and alpha inputs', () => {
    expect(ensureContrast('#fff', '#000000', 4.5)).toBe('#fff');
    expect(ensureContrast('#00000080', '#ffffff', 4.5)).toBe('#00000080');
  });

  it('can reach maximum contrast on either theme', () => {
    // Black/white is the known 21:1 endpoint of the contrast scale.
    expect(ensureContrast('#800020', '#000000', 21)).toBe('#ffffff');
    expect(ensureContrast('#800020', '#ffffff', 21)).toBe('#000000');
  });

  it('stops at the strongest possible color when the requested contrast is unattainable', () => {
    expect(ensureContrast('#303030', '#000000', 30)).toBe('#ffffff');
    expect(ensureContrast('#cccccc', '#ffffff', 30)).toBe('#000000');
  });
});
