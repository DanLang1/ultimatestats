import { Participant } from '@/lib/advancedTracking/types';

export type VoiceStatCommand = {
  kind: 'pass';
  fromParticipantId: string;
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

const PASS_WORDS = new Set(['to']);

interface PlayerVoiceAlias {
  participantId: string;
  phrase: string;
}

export function buildVoiceContextualStrings(activeParticipants: Participant[]): string[] {
  const names = activeParticipants.map((participant) => participant.name.trim()).filter(Boolean);
  const firstNames = activeParticipants
    .map((participant) => participant.name.trim().split(/\s+/)[0])
    .filter((name): name is string => name != null);

  return [...new Set([...names, ...firstNames, 'to'])];
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
  const parsedPass = parsePass(tokens, aliases);
  return parsedPass.ok || tokens.some((token) => PASS_WORDS.has(token))
    ? parsedPass
    : { ok: false, reason: 'Say a pass like "Tom to Jerry".' };
}

function parsePass(tokens: string[], aliases: PlayerVoiceAlias[]): VoiceCommandParseResult {
  const connectorIndex = tokens.findIndex((token) => PASS_WORDS.has(token));

  if (connectorIndex !== -1) {
    const from = matchPlayer(tokens.slice(0, connectorIndex), aliases);
    const to = matchPlayer(tokens.slice(connectorIndex + 1), aliases);
    return buildPassResult(from, to);
  }

  for (let splitIndex = 1; splitIndex < tokens.length; splitIndex += 1) {
    const from = matchPlayer(tokens.slice(0, splitIndex), aliases);
    const to = matchPlayer(tokens.slice(splitIndex), aliases);
    if (from.status === 'match' && to.status === 'match') {
      return buildPassResult(from, to);
    }
  }

  return { ok: false, reason: 'No pass command found.' };
}

function buildPassResult(from: PlayerMatchResult, to: PlayerMatchResult): VoiceCommandParseResult {
  if (from.status === 'ambiguous' || to.status === 'ambiguous') {
    return { ok: false, reason: 'Player name is ambiguous.' };
  }

  if (from.status !== 'match' || to.status !== 'match') {
    return { ok: false, reason: 'Pass command needs two active players.' };
  }

  return {
    ok: true,
    command: {
      kind: 'pass',
      fromParticipantId: from.participantId,
      toParticipantId: to.participantId,
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
