const MIN_SOUND_KEY_LENGTH = 2;

/** Spelling rewrites applied in order; each maps letters to the consonant sound they make. */
const SOUND_REWRITES: [RegExp, string][] = [
  [/^(kn|gn)/, 'n'],
  [/^wr/, 'r'],
  [/^ps/, 's'],
  [/^x/, 's'],
  [/ph/g, 'f'],
  [/gh/g, ''],
  [/ng(?![aeiouy])/g, 'n'],
  [/chr/g, 'kr'],
  [/tch|ch|sh/g, 'x'],
  [/ck/g, 'k'],
  [/dg/g, 'j'],
  [/q/g, 'k'],
  [/x/g, 'ks'],
  [/c(?=[eiy])/g, 's'],
  [/c/g, 'k'],
  [/g(?=[eiy])/g, 'j'],
  [/th/g, 't'],
  [/z/g, 's'],
  [/v/g, 'f'],
  [/d/g, 't'],
];

/**
 * Reduces a normalized voice phrase to its consonant sounds, so different spellings of one spoken
 * name (`geoff`/`jeff`, `long`/`lang`) produce the same key. Vowels are dropped because they are
 * what the recognizer most often changes.
 */
export function getVoiceSoundKey(normalizedPhrase: string): string {
  return normalizedPhrase.split(' ').map(getWordSoundKey).join(' ');
}

export function soundsAlike(leftPhrase: string, rightPhrase: string): boolean {
  const leftKey = getVoiceSoundKey(leftPhrase);
  if (leftKey.length < MIN_SOUND_KEY_LENGTH) return false;

  return leftKey === getVoiceSoundKey(rightPhrase);
}

function getWordSoundKey(word: string): string {
  const consonantSpelling = SOUND_REWRITES.reduce(
    (spelling, [pattern, sound]) => spelling.replace(pattern, sound),
    word,
  );
  const leadingSound = /^[aeiou]/.test(consonantSpelling) ? 'a' : consonantSpelling.charAt(0);
  const trailingSounds = consonantSpelling.slice(1).replace(/[aeiouyhw]/g, '');

  return (leadingSound + trailingSounds).replace(/(.)\1+/g, '$1');
}
