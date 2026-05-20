import {
  buildVoiceNumberPhrases,
  getPlayerNumberIdentity,
  normalizePlayerNumber,
} from '@/lib/advancedTracking/voiceNumberUtils';

describe('voiceNumberUtils', () => {
  it('normalizes player numbers to digits only', () => {
    expect(normalizePlayerNumber('#12')).toBe('12');
    expect(normalizePlayerNumber('007')).toBe('7');
    expect(normalizePlayerNumber('00')).toBe('0');
    expect(normalizePlayerNumber('12a4')).toBe('124');
    expect(normalizePlayerNumber('1234')).toBe('123');
  });

  it('builds numeric and spoken phrases', () => {
    expect(buildVoiceNumberPhrases('12')).toEqual(
      expect.arrayContaining(['12', 'number 12', 'twelve', 'number twelve']),
    );
  });

  it('collapses leading-zero numbers to canonical numeric phrases', () => {
    expect(buildVoiceNumberPhrases('07')).toEqual(
      expect.arrayContaining(['7', 'number 7', 'seven', 'number seven']),
    );
    expect(buildVoiceNumberPhrases('07')).not.toEqual(expect.arrayContaining(['07', 'zero seven']));
  });

  it('uses numeric identity for duplicate checks', () => {
    expect(getPlayerNumberIdentity('007')).toBe(7);
    expect(getPlayerNumberIdentity('7')).toBe(7);
    expect(getPlayerNumberIdentity('00')).toBe(0);
    expect(getPlayerNumberIdentity('')).toBeNull();
  });
});
