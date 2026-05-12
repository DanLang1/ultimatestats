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
    expect(parseVoiceStatCommand('Mark', activeParticipants)).toEqual({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'mark' },
    });

    expect(parseVoiceStatCommand('Joe Ramirez', activeParticipants)).toEqual({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'joe' },
    });
  });

  it('rejects commands that include throwers or action words', () => {
    expect(parseVoiceStatCommand('Joe to Ted', activeParticipants).ok).toBe(false);
    expect(parseVoiceStatCommand('Ted Mark', activeParticipants).ok).toBe(false);
    expect(parseVoiceStatCommand('Rob drop', activeParticipants).ok).toBe(false);
    expect(parseVoiceStatCommand('Block John', activeParticipants).ok).toBe(false);
    expect(parseVoiceStatCommand('Goal by Sarah', activeParticipants).ok).toBe(false);
  });

  it('rejects players outside the active line', () => {
    const result = parseVoiceStatCommand('Bench', activeParticipants);

    expect(result.ok).toBe(false);
  });

  it('rejects ambiguous first-name aliases', () => {
    const result = parseVoiceStatCommand('Taylor', activeParticipants);

    expect(result).toEqual({ ok: false, reason: 'Player name is ambiguous.' });
  });

  it('allows full names when first names are ambiguous', () => {
    expect(parseVoiceStatCommand('Taylor Adams', activeParticipants)).toEqual({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'taylor-a' },
    });
  });

  it('rejects alternate spellings until aliases or fuzzy matching are supported', () => {
    expect(parseVoiceStatCommand('Sara to Katie', activeParticipants).ok).toBe(false);
  });

  it('parses saved voice aliases', () => {
    const participantsWithAliases: VoiceParticipantContext[] = [
      { id: 'james', name: 'James Donovan', voiceAliases: ['JD', 'J D', 'number four'] },
      { id: 'anne', name: 'Anne' },
    ];

    expect(parseVoiceStatCommand('j d', participantsWithAliases)).toEqual({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'james' },
    });
    expect(parseVoiceStatCommand('number four', participantsWithAliases)).toEqual({
      ok: true,
      command: { kind: 'pass', toParticipantId: 'james' },
    });
  });

  it('rejects ambiguous saved voice aliases', () => {
    const participantsWithAliases: VoiceParticipantContext[] = [
      { id: 'anne', name: 'Anne', voiceAliases: ['Ann'] },
      { id: 'anna', name: 'Anna', voiceAliases: ['Ann'] },
    ];

    expect(parseVoiceStatCommand('Ann', participantsWithAliases)).toEqual({
      ok: false,
      reason: 'Player name is ambiguous.',
    });
  });
});

describe('buildVoiceContextualStrings', () => {
  it('includes active player names', () => {
    expect(buildVoiceContextualStrings(activeParticipants)).toEqual(
      expect.arrayContaining(['Joe Ramirez', 'Joe', 'Ted']),
    );
    expect(buildVoiceContextualStrings(activeParticipants)).not.toContain('to');
  });

  it('includes saved voice aliases', () => {
    const participantsWithAliases: VoiceParticipantContext[] = [
      { id: 'james', name: 'James Donovan', voiceAliases: ['JD'] },
    ];

    expect(buildVoiceContextualStrings(participantsWithAliases)).toEqual(
      expect.arrayContaining(['James Donovan', 'James', 'JD']),
    );
  });
});
