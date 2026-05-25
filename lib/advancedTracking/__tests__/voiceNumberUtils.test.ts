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

  it('uses natural spoken numbers instead of digit-by-digit phrases', () => {
    expect(buildVoiceNumberPhrases('21')).toEqual(
      expect.arrayContaining(['21', 'number 21', 'twenty one', 'number twenty one']),
    );
    expect(buildVoiceNumberPhrases('21')).not.toEqual(
      expect.arrayContaining(['two one', 'number two one']),
    );
    expect(buildVoiceNumberPhrases('33')).not.toEqual(
      expect.arrayContaining(['three three', 'number three three']),
    );
  });

  it('includes common speech-recognition aliases for single-digit numbers', () => {
    expect(buildVoiceNumberPhrases('1')).toEqual(
      expect.arrayContaining(['1', 'one', 'won', 'number won']),
    );
    expect(buildVoiceNumberPhrases('2')).toEqual(expect.arrayContaining(['two', 'to', 'too']));
    expect(buildVoiceNumberPhrases('3')).toEqual(expect.arrayContaining(['three', 'tree']));
    expect(buildVoiceNumberPhrases('4')).toEqual(expect.arrayContaining(['four', 'for', 'fore']));
    expect(buildVoiceNumberPhrases('8')).toEqual(expect.arrayContaining(['eight', 'ate']));
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
