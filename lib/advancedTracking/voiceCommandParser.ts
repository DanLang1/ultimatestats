import { normalizeVoicePhrase } from '@/lib/advancedTracking/voicePhraseUtils';

export interface VoiceParticipantContext {
  id: string;
  name: string;
  voiceAliases?: string[];
}

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

export function buildVoiceContextualStrings(
  activeParticipants: VoiceParticipantContext[],
): string[] {
  const names = activeParticipants.map((participant) => participant.name.trim()).filter(Boolean);
  const firstNames = activeParticipants
    .map((participant) => participant.name.trim().split(/\s+/)[0])
    .filter((name): name is string => name != null);
  const voiceAliases = activeParticipants.flatMap((participant) => participant.voiceAliases ?? []);

  return [...new Set([...names, ...firstNames, ...voiceAliases])];
}

export function parseVoiceStatCommand(
  transcript: string,
  activeParticipants: VoiceParticipantContext[],
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

function buildAliases(activeParticipants: VoiceParticipantContext[]): PlayerVoiceAlias[] {
  return activeParticipants.flatMap((participant) => {
    const normalizedName = normalizeVoicePhrase(participant.name);
    if (!normalizedName) return [];

    const firstName = getFirstName(participant.name);
    const aliasPhrases = new Set([normalizedName]);
    if (firstName != null && firstName !== normalizedName) {
      aliasPhrases.add(firstName);
    }
    for (const alias of participant.voiceAliases ?? []) {
      const normalizedAlias = normalizeVoicePhrase(alias);
      if (normalizedAlias) {
        aliasPhrases.add(normalizedAlias);
      }
    }
    return [...aliasPhrases].map((phrase) => ({ participantId: participant.id, phrase }));
  });
}

function normalizeTranscript(transcript: string): string[] {
  const normalized = normalizeVoicePhrase(transcript);
  return normalized ? normalized.split(' ') : [];
}

function getFirstName(name: string): string | null {
  const [firstName] = normalizeTranscript(name);
  return firstName ?? null;
}
