import { normalizeVoicePhrase } from '@/lib/advancedTracking/voicePhraseUtils';

const NUMBER_WORDS_UNDER_TWENTY = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
] as const;

const TENS_WORDS: Record<number, string> = {
  20: 'twenty',
  30: 'thirty',
  40: 'forty',
  50: 'fifty',
  60: 'sixty',
  70: 'seventy',
  80: 'eighty',
  90: 'ninety',
};

const SINGLE_DIGIT_VOICE_ALIASES: Record<number, string[]> = {
  0: ['oh'],
  1: ['won'],
  2: ['to', 'too'],
  3: ['tree'],
  4: ['for', 'fore'],
  5: [],
  6: [],
  7: [],
  8: ['ate'],
  9: [],
};

export function normalizePlayerNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 3);
  if (!digits) return '';

  return String(Number(digits));
}

export function getPlayerNumberIdentity(value: string | undefined): number | null {
  if (value == null) return null;

  const normalizedNumber = normalizePlayerNumber(value);
  if (!normalizedNumber) return null;

  return Number(normalizedNumber);
}

export function buildVoiceNumberPhrases(playerNumber: string | undefined): string[] {
  if (playerNumber == null) return [];

  const normalizedNumber = normalizePlayerNumber(playerNumber);
  if (!normalizedNumber) return [];

  const phrases = new Set<string>([normalizedNumber]);
  const numericValue = Number(normalizedNumber);
  const numericPhrase = numberToWords(numericValue);

  if (numericPhrase != null) {
    phrases.add(numericPhrase);
  }
  getVoiceAliasesForNumber(numericValue).forEach((alias) => {
    phrases.add(alias);
  });

  return [...phrases].flatMap((phrase) => {
    const normalizedPhrase = normalizeVoicePhrase(phrase);
    if (!normalizedPhrase) return [];
    return [normalizedPhrase, `number ${normalizedPhrase}`];
  });
}

function getVoiceAliasesForNumber(value: number): string[] {
  return SINGLE_DIGIT_VOICE_ALIASES[value] ?? [];
}

function numberToWords(value: number): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 999) return null;

  if (value < 20) {
    return NUMBER_WORDS_UNDER_TWENTY[value];
  }

  if (value < 100) {
    const tens = Math.floor(value / 10) * 10;
    const ones = value % 10;
    return ones === 0 ? TENS_WORDS[tens] : `${TENS_WORDS[tens]} ${NUMBER_WORDS_UNDER_TWENTY[ones]}`;
  }

  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  const prefix = `${NUMBER_WORDS_UNDER_TWENTY[hundreds]} hundred`;
  if (remainder === 0) return prefix;

  const remainderPhrase = numberToWords(remainder);
  return remainderPhrase == null ? null : `${prefix} ${remainderPhrase}`;
}
