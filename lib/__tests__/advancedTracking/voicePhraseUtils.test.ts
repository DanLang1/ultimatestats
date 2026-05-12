import { normalizeVoicePhrase } from '@/lib/advancedTracking/voicePhraseUtils';

describe('normalizeVoicePhrase', () => {
  it('lowercases input', () => {
    expect(normalizeVoicePhrase('Anne')).toBe('anne');
    expect(normalizeVoicePhrase('J D')).toBe('j d');
  });

  it('preserves letters and digits', () => {
    expect(normalizeVoicePhrase('number 4')).toBe('number 4');
    expect(normalizeVoicePhrase('C4')).toBe('c4');
  });

  it('replaces punctuation with spaces', () => {
    expect(normalizeVoicePhrase('J.D.')).toBe('j d');
    expect(normalizeVoicePhrase("O'Brien")).toBe('o brien');
    expect(normalizeVoicePhrase('Anne-Marie')).toBe('anne marie');
    expect(normalizeVoicePhrase('"JD"')).toBe('jd');
  });

  it('collapses consecutive whitespace', () => {
    expect(normalizeVoicePhrase('James   Donovan')).toBe('james donovan');
    expect(normalizeVoicePhrase('  J    D  ')).toBe('j d');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeVoicePhrase('  Anne  ')).toBe('anne');
    expect(normalizeVoicePhrase('\tJD\n')).toBe('jd');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeVoicePhrase('   ')).toBe('');
    expect(normalizeVoicePhrase('\t\n')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeVoicePhrase('')).toBe('');
  });

  it('returns empty string for punctuation-only input', () => {
    expect(normalizeVoicePhrase('-')).toBe('');
    expect(normalizeVoicePhrase('...')).toBe('');
    expect(normalizeVoicePhrase('"')).toBe('');
  });

  it('strips special characters', () => {
    expect(normalizeVoicePhrase('Ann!@#$%^&*()_+={}[]|\\:;"<>,.?/~`')).toBe('ann');
  });

  it('preserves emoji as spaces (not numbers/letters)', () => {
    const result = normalizeVoicePhrase('Anne🎯');
    expect(result).toBe('anne');
  });
});
