import { assertValidSlug, isValidSlug, normalizeSlug, uniqueSlug } from './slug.util';

describe('slug.util', () => {
  describe('isValidSlug', () => {
    it('accepts valid slugs', () => {
      expect(isValidSlug('mega-fortune')).toBe(true);
      expect(isValidSlug('book-of-ra-deluxe')).toBe(true);
      expect(isValidSlug('game123')).toBe(true);
    });

    it('rejects invalid slugs', () => {
      expect(isValidSlug('Mega Fortune')).toBe(false);
      expect(isValidSlug('-leading')).toBe(false);
      expect(isValidSlug('trailing-')).toBe(false);
      expect(isValidSlug('double--hyphen')).toBe(false);
      expect(isValidSlug('a')).toBe(false);
    });
  });

  describe('normalizeSlug', () => {
    it('slugifies arbitrary names', () => {
      expect(normalizeSlug('Mega Fortune Deluxe!')).toBe('mega-fortune-deluxe');
      expect(normalizeSlug('Book of Ra (2024)')).toBe('book-of-ra-2024');
    });
  });

  describe('assertValidSlug', () => {
    it('throws on invalid input', () => {
      expect(() => assertValidSlug('Not Valid')).toThrow();
    });
  });

  describe('uniqueSlug', () => {
    it('returns the base slug when free', async () => {
      const result = await uniqueSlug('Mega Fortune', async () => false);
      expect(result).toBe('mega-fortune');
    });

    it('appends a numeric suffix on collision', async () => {
      const taken = new Set(['mega-fortune', 'mega-fortune-2']);
      const result = await uniqueSlug('Mega Fortune', async (s) => taken.has(s));
      expect(result).toBe('mega-fortune-3');
    });
  });
});
