import { hasItems } from '../utils';

describe('utils', () => {
  describe('hasItems', () => {
    it('returns false for null/undefined/empty arrays', () => {
      expect(hasItems(null)).toBe(false);
      expect(hasItems(undefined)).toBe(false);
      expect(hasItems([])).toBe(false);
    });

    it('returns true for non-empty arrays', () => {
      expect(hasItems([1])).toBe(true);
      expect(hasItems(['a', 'b'])).toBe(true);
    });
  });
});
