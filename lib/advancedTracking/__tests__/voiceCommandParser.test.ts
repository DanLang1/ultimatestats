import {
  buildVoiceContextualStrings,
  parseVoiceStatCommand,
  VoiceParticipantContext,
} from '@/lib/advancedTracking/voiceCommandParser';

const activeParticipants: VoiceParticipantContext[] = [
  { id: 'joe', name: 'Joe Ramirez' },
  { id: 'ted', name: 'Ted' },
  { id: 'mark', name: 'Mark' },
  { id: 'rob', name: 'Rob' },
  { id: 'john', name: 'John' },
  { id: 'sarah', name: 'Sarah' },
  { id: 'katy', name: 'Katy' },
  { id: 'taylor-a', name: 'Taylor Adams' },
  { id: 'taylor-b', name: 'Taylor Brown' },
];

describe('parseVoiceStatCommand', () => {
  it('parses receiver names', () => {
    expect(parseVoiceStatCommand('Mark', activeParticipants)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'mark' },
      matchKind: 'name',
      matchedPhrase: 'mark',
    });

    expect(parseVoiceStatCommand('Joe Ramirez', activeParticipants)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'joe' },
      matchKind: 'name',
      matchedPhrase: 'joe ramirez',
    });
  });

  it('rejects commands that include throwers or action words', () => {
    expect(parseVoiceStatCommand('Joe to Ted', activeParticipants)).toMatchObject({
      ok: false,
      reasonCode: 'unsupported_command',
    });
    expect(parseVoiceStatCommand('Ted Mark', activeParticipants)).toMatchObject({
      ok: false,
      reasonCode: 'unsupported_command',
    });
    expect(parseVoiceStatCommand('Rob drop', activeParticipants)).toMatchObject({
      ok: false,
      reasonCode: 'unsupported_command',
    });
    expect(parseVoiceStatCommand('Block John', activeParticipants)).toMatchObject({
      ok: false,
      reasonCode: 'unsupported_command',
    });
    expect(parseVoiceStatCommand('Goal by Sarah', activeParticipants)).toMatchObject({
      ok: false,
      reasonCode: 'unsupported_command',
    });
  });

  it('rejects players outside the active line', () => {
    const result = parseVoiceStatCommand('Bench', activeParticipants);

    expect(result).toMatchObject({ ok: false, reasonCode: 'no_player_match' });
  });

  it('rejects ambiguous first-name matches', () => {
    const result = parseVoiceStatCommand('Taylor', activeParticipants);

    expect(result).toEqual({
      ok: false,
      reason: 'Player name is ambiguous.',
      reasonCode: 'ambiguous_player',
    });
  });

  it('allows full names when first names are ambiguous', () => {
    expect(parseVoiceStatCommand('Taylor Adams', activeParticipants)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'taylor-a' },
    });
  });

  it('rejects commands that include alternate spelling names and action words', () => {
    expect(parseVoiceStatCommand('Sara to Katie', activeParticipants)).toMatchObject({
      ok: false,
      reasonCode: 'unsupported_command',
    });
  });

  it('parses conservative alternate name spellings', () => {
    const participantsWithNameVariants: VoiceParticipantContext[] = [
      { id: 'brian', name: 'Brian' },
      { id: 'anne', name: 'Anne' },
      { id: 'sarah', name: 'Sarah' },
      { id: 'katy', name: 'Katy' },
    ];

    expect(parseVoiceStatCommand('Bryan', participantsWithNameVariants)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'brian' },
    });
    expect(parseVoiceStatCommand('Ann', participantsWithNameVariants)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'anne' },
    });
    expect(parseVoiceStatCommand('Sara', participantsWithNameVariants)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'sarah' },
    });
    expect(parseVoiceStatCommand('Katie', participantsWithNameVariants)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'katy' },
    });
  });

  it('makes best-effort guesses for close active-line name variants', () => {
    const participantsWithShortNames: VoiceParticipantContext[] = [
      { id: 'lang', name: 'Lang' },
      { id: 'tate', name: 'Tate' },
      { id: 'milo', name: 'Milo' },
      { id: 'riley', name: 'Riley' },
      { id: 'sloan', name: 'Sloan' },
      { id: 'wynn', name: 'Wynn' },
      { id: 'zara', name: 'Zara' },
    ];

    expect(parseVoiceStatCommand('Lane', participantsWithShortNames)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'lang' },
    });
    expect(parseVoiceStatCommand('Take', participantsWithShortNames)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'tate' },
    });
  });

  it('matches last names on the active line', () => {
    const participantsWithLastNames: VoiceParticipantContext[] = [
      { id: 'jordan', name: 'Jordan Rasmussen' },
      { id: 'avery', name: 'Avery Okafor' },
      { id: 'casey', name: 'Casey Nguyen' },
    ];

    expect(parseVoiceStatCommand('Rasmussen', participantsWithLastNames)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'jordan' },
    });
    expect(parseVoiceStatCommand('Okafor', participantsWithLastNames)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'avery' },
    });
  });

  it('parses player numbers and spoken number words', () => {
    const participantsWithNumbers: VoiceParticipantContext[] = [
      { id: 'tate', name: 'Tate', number: '12' },
      { id: 'lang', name: 'Lang', number: '7' },
      { id: 'piper', name: 'Piper', number: '1' },
      { id: 'river', name: 'River', number: '2' },
      { id: 'mika', name: 'Mika', number: '3' },
      { id: 'noor', name: 'Noor', number: '4' },
    ];

    expect(parseVoiceStatCommand('12', participantsWithNumbers)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'tate' },
      matchKind: 'number',
      matchedPhrase: '12',
    });
    expect(parseVoiceStatCommand('twelve', participantsWithNumbers)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'tate' },
      matchKind: 'number',
      matchedPhrase: 'twelve',
    });
    expect(parseVoiceStatCommand('number twelve', participantsWithNumbers)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'tate' },
      matchKind: 'number',
      matchedPhrase: 'number twelve',
    });
    expect(parseVoiceStatCommand('seven', participantsWithNumbers)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'lang' },
      matchKind: 'number',
      matchedPhrase: 'seven',
    });
    expect(parseVoiceStatCommand('won', participantsWithNumbers)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'piper' },
      matchKind: 'number',
    });
    expect(parseVoiceStatCommand('to', participantsWithNumbers)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'river' },
      matchKind: 'number',
    });
    expect(parseVoiceStatCommand('tree', participantsWithNumbers)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'mika' },
      matchKind: 'number',
    });
    expect(parseVoiceStatCommand('for', participantsWithNumbers)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'noor' },
      matchKind: 'number',
    });
    expect(parseVoiceStatCommand('free', participantsWithNumbers)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'mika' },
      matchKind: 'number',
    });
  });

  it('parses two-word player numbers', () => {
    const participantsWithNumbers: VoiceParticipantContext[] = [
      { id: 'maya', name: 'Maya', number: '33' },
    ];

    expect(parseVoiceStatCommand('thirty three', participantsWithNumbers)).toMatchObject({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'maya' },
      matchKind: 'number',
      matchedPhrase: 'thirty three',
    });
    expect(parseVoiceStatCommand('three three', participantsWithNumbers)).toMatchObject({
      ok: false,
      reasonCode: 'unsupported_command',
    });
  });

  it('rejects ambiguous player numbers', () => {
    const participantsWithDuplicateNumbers: VoiceParticipantContext[] = [
      { id: 'one', name: 'One', number: '12' },
      { id: 'two', name: 'Two', number: '12' },
    ];

    expect(parseVoiceStatCommand('twelve', participantsWithDuplicateNumbers)).toEqual({
      ok: false,
      reason: 'Player name is ambiguous.',
      reasonCode: 'ambiguous_player',
    });
  });

  it('rejects ambiguous alternate name spellings', () => {
    const participantsWithSimilarNames: VoiceParticipantContext[] = [
      { id: 'anne', name: 'Anne' },
      { id: 'anna', name: 'Anna' },
    ];

    expect(parseVoiceStatCommand('Ann', participantsWithSimilarNames)).toEqual({
      ok: false,
      reason: 'Player name is ambiguous.',
      reasonCode: 'ambiguous_player',
    });
  });

  it('rejects best-effort guesses when nearby active names are too close', () => {
    const participantsWithCloseNames: VoiceParticipantContext[] = [
      { id: 'lane', name: 'Lane' },
      { id: 'lang', name: 'Lang' },
    ];

    expect(parseVoiceStatCommand('Lan', participantsWithCloseNames)).toEqual({
      ok: false,
      reason: 'Player name is ambiguous.',
      reasonCode: 'ambiguous_player',
    });
  });
});

describe('buildVoiceContextualStrings', () => {
  it('includes active player names', () => {
    expect(buildVoiceContextualStrings(activeParticipants)).toEqual(
      expect.arrayContaining(['Joe Ramirez', 'Joe', 'Ramirez', 'Ted']),
    );
    expect(buildVoiceContextualStrings(activeParticipants)).not.toContain('to');
  });

  it('includes player number phrases', () => {
    const participantsWithNumbers: VoiceParticipantContext[] = [
      { id: 'tate', name: 'Tate', number: '12' },
    ];

    expect(buildVoiceContextualStrings(participantsWithNumbers)).toEqual(
      expect.arrayContaining(['12', 'twelve', 'number twelve']),
    );
  });
});
