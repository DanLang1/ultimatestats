import {
  buildVoiceContextualStrings,
  parseVoiceStatCommand,
} from '@/lib/advancedTracking/voiceCommandParser';
import { Participant } from '@/lib/advancedTracking/types';

const activeParticipants: Participant[] = [
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
  it('parses explicit and short pass commands', () => {
    expect(parseVoiceStatCommand('Joe to Ted', activeParticipants)).toEqual({
      ok: true,
      command: { kind: 'pass', fromParticipantId: 'joe', toParticipantId: 'ted' },
    });

    expect(parseVoiceStatCommand('Ted Mark', activeParticipants)).toEqual({
      ok: true,
      command: { kind: 'pass', fromParticipantId: 'ted', toParticipantId: 'mark' },
    });
  });

  it('rejects non-pass commands for the MVP', () => {
    expect(parseVoiceStatCommand('Rob drop', activeParticipants).ok).toBe(false);
    expect(parseVoiceStatCommand('Block John', activeParticipants).ok).toBe(false);
    expect(parseVoiceStatCommand('Goal by Sarah', activeParticipants).ok).toBe(false);
  });

  it('rejects players outside the active line', () => {
    const result = parseVoiceStatCommand('Joe to Bench', activeParticipants);

    expect(result.ok).toBe(false);
  });

  it('rejects ambiguous first-name aliases', () => {
    const result = parseVoiceStatCommand('Taylor to Ted', activeParticipants);

    expect(result).toEqual({ ok: false, reason: 'Player name is ambiguous.' });
  });

  it('allows full names when first names are ambiguous', () => {
    expect(parseVoiceStatCommand('Taylor Adams to Ted', activeParticipants)).toEqual({
      ok: true,
      command: { kind: 'pass', fromParticipantId: 'taylor-a', toParticipantId: 'ted' },
    });
  });

  it('rejects alternate spellings until aliases or fuzzy matching are supported', () => {
    expect(parseVoiceStatCommand('Sara to Katie', activeParticipants).ok).toBe(false);
  });
});

describe('buildVoiceContextualStrings', () => {
  it('includes active player names and command vocabulary', () => {
    expect(buildVoiceContextualStrings(activeParticipants)).toEqual(
      expect.arrayContaining(['Joe Ramirez', 'Joe', 'Ted', 'to']),
    );
  });
});
