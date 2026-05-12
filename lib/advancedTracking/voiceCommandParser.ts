import { normalizeVoicePhrase } from '@/lib/advancedTracking/voicePhraseUtils';
import { buildVoiceNumberPhrases } from '@/lib/advancedTracking/voiceNumberUtils';

export interface VoiceParticipantContext {
  id: string;
  name: string;
  number?: string;
}

export type VoiceStatCommand = {
  kind: 'pass';
  toParticipantId: string;
};

export type VoiceCommandParseFailureReason =
  | 'empty'
  | 'ambiguous_player'
  | 'no_player_match'
  | 'unsupported_command';

export type VoiceCommandParseResult =
  | {
      ok: true;
      command: VoiceStatCommand;
    }
  | {
      ok: false;
      reason: string;
      reasonCode: VoiceCommandParseFailureReason;
    };

interface PlayerVoicePhrase {
  participantId: string;
  phrase: string;
  matchKind: 'name' | 'number';
}

export function buildVoiceContextualStrings(
  activeParticipants: VoiceParticipantContext[],
): string[] {
  const names = activeParticipants.map((participant) => participant.name.trim()).filter(Boolean);
  const firstNames = activeParticipants
    .map((participant) => participant.name.trim().split(/\s+/)[0])
    .filter((name): name is string => name != null);
  const numberPhrases = activeParticipants.flatMap((participant) =>
    buildVoiceNumberPhrases(participant.number),
  );

  return [...new Set([...names, ...firstNames, ...numberPhrases])];
}

export function parseVoiceStatCommand(
  transcript: string,
  activeParticipants: VoiceParticipantContext[],
): VoiceCommandParseResult {
  const tokens = normalizeTranscript(transcript);
  if (tokens.length === 0) {
    return { ok: false, reason: 'No command heard.', reasonCode: 'empty' };
  }

  const phrases = buildPlayerVoicePhrases(activeParticipants);
  const receiver = matchPlayer(tokens, phrases);
  return buildReceiverOnlyResult(receiver, tokens);
}

function buildReceiverOnlyResult(
  receiver: PlayerMatchResult,
  tokens: string[],
): VoiceCommandParseResult {
  if (receiver.status === 'ambiguous') {
    return {
      ok: false,
      reason: 'Player name is ambiguous.',
      reasonCode: 'ambiguous_player',
    };
  }

  if (receiver.status !== 'match') {
    if (tokens.length > 1) {
      return {
        ok: false,
        reason: 'No pass command found.',
        reasonCode: 'unsupported_command',
      };
    }

    return {
      ok: false,
      reason: 'No pass command found.',
      reasonCode: 'no_player_match',
    };
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

function matchPlayer(tokens: string[], phrases: PlayerVoicePhrase[]): PlayerMatchResult {
  const phrase = tokens.join(' ').trim();
  if (!phrase) return { status: 'none' };

  const matches = phrases.filter((candidate) => candidate.phrase === phrase);
  const uniqueParticipantIds = [...new Set(matches.map((match) => match.participantId))];

  if (uniqueParticipantIds.length === 1) {
    return { status: 'match', participantId: uniqueParticipantIds[0] };
  }

  if (uniqueParticipantIds.length > 1) {
    return { status: 'ambiguous' };
  }

  return matchPlayerByConservativeSpelling(phrase, tokens, phrases);
}

function buildPlayerVoicePhrases(
  activeParticipants: VoiceParticipantContext[],
): PlayerVoicePhrase[] {
  return activeParticipants.flatMap((participant) => {
    const normalizedName = normalizeVoicePhrase(participant.name);
    if (!normalizedName) return [];

    const firstName = getFirstName(participant.name);
    const namePhrases = new Set([normalizedName]);
    if (firstName != null && firstName !== normalizedName) {
      namePhrases.add(firstName);
    }
    const playerNamePhrases = [...namePhrases].map((phrase) => ({
      participantId: participant.id,
      phrase,
      matchKind: 'name' as const,
    }));
    const numberPhrases = buildVoiceNumberPhrases(participant.number).map((numberPhrase) => ({
      participantId: participant.id,
      phrase: numberPhrase,
      matchKind: 'number' as const,
    }));

    return [...playerNamePhrases, ...numberPhrases];
  });
}

function matchPlayerByConservativeSpelling(
  phrase: string,
  tokens: string[],
  phrases: PlayerVoicePhrase[],
): PlayerMatchResult {
  const candidates = phrases
    .filter((candidate) => candidate.matchKind === 'name')
    .filter((candidate) => tokens.length === 1 || candidate.phrase.includes(' '))
    .map((candidate) => ({
      participantId: candidate.participantId,
      score: getDamerauLevenshteinDistance(phrase, candidate.phrase),
    }))
    .filter((candidate) => candidate.score <= MAX_SPELLING_DISTANCE)
    .sort((a, b) => a.score - b.score);

  const [topCandidate, secondCandidate] = candidates;
  if (topCandidate == null) return { status: 'none' };

  if (secondCandidate != null && topCandidate.score === secondCandidate.score) {
    return { status: 'ambiguous' };
  }

  return { status: 'match', participantId: topCandidate.participantId };
}

function normalizeTranscript(transcript: string): string[] {
  const normalized = normalizeVoicePhrase(transcript);
  return normalized ? normalized.split(' ') : [];
}

function getFirstName(name: string): string | null {
  const [firstName] = normalizeTranscript(name);
  return firstName ?? null;
}

const MAX_SPELLING_DISTANCE = 2;

function getDamerauLevenshteinDistance(left: string, right: string): number {
  const distances = Array.from({ length: left.length + 1 }, () =>
    Array.from({ length: right.length + 1 }, () => 0),
  );

  for (let leftIndex = 0; leftIndex <= left.length; leftIndex++) {
    distances[leftIndex][0] = leftIndex;
  }

  for (let rightIndex = 0; rightIndex <= right.length; rightIndex++) {
    distances[0][rightIndex] = rightIndex;
  }

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      distances[leftIndex][rightIndex] = Math.min(
        distances[leftIndex - 1][rightIndex] + 1,
        distances[leftIndex][rightIndex - 1] + 1,
        distances[leftIndex - 1][rightIndex - 1] + substitutionCost,
      );

      if (
        leftIndex > 1 &&
        rightIndex > 1 &&
        left[leftIndex - 1] === right[rightIndex - 2] &&
        left[leftIndex - 2] === right[rightIndex - 1]
      ) {
        distances[leftIndex][rightIndex] = Math.min(
          distances[leftIndex][rightIndex],
          distances[leftIndex - 2][rightIndex - 2] + 1,
        );
      }
    }
  }

  return distances[left.length][right.length];
}
