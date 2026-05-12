import { Participant } from '@/lib/advancedTracking/types';

export type VoiceStatCommand = {
  kind: 'pass';
  toParticipantId: string;
};

export type VoiceCommandParseResult =
  | {
      ok: true;
      command: VoiceStatCommand;
    }
  | {
      ok: false;
      reason: string;
    };

interface PlayerVoiceAlias {
  participantId: string;
  phrase: string;
}

export function buildVoiceContextualStrings(activeParticipants: Participant[]): string[] {
  const names = activeParticipants.map((participant) => participant.name.trim()).filter(Boolean);
  const firstNames = activeParticipants
    .map((participant) => participant.name.trim().split(/\s+/)[0])
    .filter((name): name is string => name != null);

  return [...new Set([...names, ...firstNames])];
}

export function parseVoiceStatCommand(
  transcript: string,
  activeParticipants: Participant[],
): VoiceCommandParseResult {
  const tokens = normalizeTranscript(transcript);
  if (tokens.length === 0) {
    return { ok: false, reason: 'No command heard.' };
  }

  const aliases = buildAliases(activeParticipants);
  const receiver = matchPlayer(tokens, aliases);
  return buildReceiverOnlyResult(receiver);
}

function buildReceiverOnlyResult(receiver: PlayerMatchResult): VoiceCommandParseResult {
  if (receiver.status === 'ambiguous') {
    return { ok: false, reason: 'Player name is ambiguous.' };
  }

  if (receiver.status !== 'match') {
    return { ok: false, reason: 'No pass command found.' };
  }

  return {
    ok: true,
    command: {
      kind: 'pass',
      toParticipantId: receiver.participantId,
    },
  };
}

type PlayerMatchResult =
  | { status: 'match'; participantId: string }
  | { status: 'ambiguous' }
  | { status: 'none' };

function matchPlayer(tokens: string[], aliases: PlayerVoiceAlias[]): PlayerMatchResult {
  const phrase = tokens.join(' ').trim();
  if (!phrase) return { status: 'none' };

  const matches = aliases.filter((alias) => alias.phrase === phrase);
  const uniqueParticipantIds = [...new Set(matches.map((match) => match.participantId))];

  if (uniqueParticipantIds.length === 1) {
    return { status: 'match', participantId: uniqueParticipantIds[0] };
  }

  if (uniqueParticipantIds.length > 1) {
    return { status: 'ambiguous' };
  }

  return { status: 'none' };
}

function buildAliases(activeParticipants: Participant[]): PlayerVoiceAlias[] {
  return activeParticipants.flatMap((participant) => {
    const normalizedName = normalizePhrase(participant.name);
    if (!normalizedName) return [];

    const firstName = getFirstName(participant.name);
    const aliasPhrases = new Set([normalizedName]);
    if (firstName != null && firstName !== normalizedName) {
      aliasPhrases.add(firstName);
    }
    return [...aliasPhrases].map((phrase) => ({ participantId: participant.id, phrase }));
  });
}

function normalizeTranscript(transcript: string): string[] {
  const normalized = normalizePhrase(transcript);
  return normalized ? normalized.split(' ') : [];
}

function normalizePhrase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFirstName(name: string): string | null {
  const [firstName] = normalizeTranscript(name);
  return firstName ?? null;
}
