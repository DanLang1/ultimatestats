import { getMarginRange } from '../marginChartUtils';

describe('getMarginRange', () => {
  it('spans only the range reached, including zero', () => {
    expect(getMarginRange([4, -2, 1])).toEqual({ top: 4, bottom: -2 });
    expect(getMarginRange([-7, -3])).toEqual({ top: 0, bottom: -7 });
  });

  it('pads a narrow range on the side the margins lean toward', () => {
    expect(getMarginRange([2, 1])).toEqual({ top: 3, bottom: 0 });
    expect(getMarginRange([-1])).toEqual({ top: 0, bottom: -3 });
  });
});
