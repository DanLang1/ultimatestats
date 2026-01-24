import { formatRatio, GenderRatio, getExpectedRatio } from '../genderRatioUtils';

describe('getExpectedRatio', () => {
  describe('when first point ratio is more-women (FMP+)', () => {
    const firstRatio: GenderRatio = 'more-women';

    it('point 1 is more-women', () => {
      expect(getExpectedRatio(1, firstRatio)).toBe('more-women');
    });

    it('points 2-3 are more-men (reverse)', () => {
      expect(getExpectedRatio(2, firstRatio)).toBe('more-men');
      expect(getExpectedRatio(3, firstRatio)).toBe('more-men');
    });

    it('points 4-5 are more-women (same as first)', () => {
      expect(getExpectedRatio(4, firstRatio)).toBe('more-women');
      expect(getExpectedRatio(5, firstRatio)).toBe('more-women');
    });

    it('points 6-7 are more-men (reverse)', () => {
      expect(getExpectedRatio(6, firstRatio)).toBe('more-men');
      expect(getExpectedRatio(7, firstRatio)).toBe('more-men');
    });

    it('continues pattern for later points', () => {
      // Points 8-9: same as first
      expect(getExpectedRatio(8, firstRatio)).toBe('more-women');
      expect(getExpectedRatio(9, firstRatio)).toBe('more-women');
      // Points 10-11: reverse
      expect(getExpectedRatio(10, firstRatio)).toBe('more-men');
      expect(getExpectedRatio(11, firstRatio)).toBe('more-men');
    });
  });

  describe('when first point ratio is more-men (MMP+)', () => {
    const firstRatio: GenderRatio = 'more-men';

    it('point 1 is more-men', () => {
      expect(getExpectedRatio(1, firstRatio)).toBe('more-men');
    });

    it('points 2-3 are more-women (reverse)', () => {
      expect(getExpectedRatio(2, firstRatio)).toBe('more-women');
      expect(getExpectedRatio(3, firstRatio)).toBe('more-women');
    });

    it('points 4-5 are more-men (same as first)', () => {
      expect(getExpectedRatio(4, firstRatio)).toBe('more-men');
      expect(getExpectedRatio(5, firstRatio)).toBe('more-men');
    });

    it('points 6-7 are more-women (reverse)', () => {
      expect(getExpectedRatio(6, firstRatio)).toBe('more-women');
      expect(getExpectedRatio(7, firstRatio)).toBe('more-women');
    });
  });
});

describe('formatRatio', () => {
  it('formats more-women as FMP+', () => {
    expect(formatRatio('more-women')).toBe('FMP+');
  });

  it('formats more-men as MMP+', () => {
    expect(formatRatio('more-men')).toBe('MMP+');
  });
});
