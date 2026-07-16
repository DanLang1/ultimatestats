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

export type VoiceCommandMatchKind = 'name' | 'number';

export type VoiceCommandParseFailureReason =
  | 'empty'
  | 'ambiguous_player'
  | 'no_player_match'
  | 'unsupported_command';

export type VoiceCommandParseResult =
  | {
      ok: true;
      command: VoiceStatCommand;
      matchKind: VoiceCommandMatchKind;
      matchedPhrase: string;
    }
  | {
      ok: false;
      reason: string;
      reasonCode: VoiceCommandParseFailureReason;
    };

interface PlayerVoicePhrase {
  participantId: string;
  phrase: string;
  matchKind: VoiceCommandMatchKind;
}

export function buildVoiceContextualStrings(
  activeParticipants: VoiceParticipantContext[],
): string[] {
  const names = activeParticipants.map((participant) => participant.name.trim()).filter(Boolean);
  const nameParts = activeParticipants.flatMap((participant) =>
    participant.name.trim().split(/\s+/).filter(Boolean),
  );
  const numberPhrases = activeParticipants.flatMap((participant) =>
    buildVoiceNumberPhrases(participant.number),
  );

  return [...new Set([...names, ...nameParts, ...numberPhrases])];
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
    matchKind: receiver.matchKind,
    matchedPhrase: receiver.matchedPhrase,
  };
}

type PlayerMatchResult =
  | {
      status: 'match';
      participantId: string;
      matchKind: VoiceCommandMatchKind;
      matchedPhrase: string;
    }
  | { status: 'ambiguous' }
  | { status: 'none' };

function matchPlayer(tokens: string[], phrases: PlayerVoicePhrase[]): PlayerMatchResult {
  const phrase = tokens.join(' ').trim();
  if (!phrase) return { status: 'none' };

  const matches = phrases.filter((candidate) => candidate.phrase === phrase);
  const uniqueParticipantIds = [...new Set(matches.map((match) => match.participantId))];

  if (uniqueParticipantIds.length === 1) {
    const [match] = matches;
    return {
      status: 'match',
      participantId: uniqueParticipantIds[0],
      matchKind: match.matchKind,
      matchedPhrase: match.phrase,
    };
  }

  if (uniqueParticipantIds.length > 1) {
    return { status: 'ambiguous' };
  }

  if (tokens.some((token) => UNSUPPORTED_COMMAND_WORDS.has(token))) {
    return { status: 'none' };
  }

  const numberMatch = matchPlayerByBestEffortNumber(phrase, phrases);
  if (numberMatch.status !== 'none') {
    return numberMatch;
  }

  return matchPlayerByBestEffort(phrase, phrases);
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
    normalizeTranscript(participant.name).forEach((namePart) => {
      namePhrases.add(namePart);
    });
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

function matchPlayerByBestEffort(phrase: string, phrases: PlayerVoicePhrase[]): PlayerMatchResult {
  const candidates = getBestEffortNameScores(phrase, phrases)
    .filter((candidate) => candidate.distance <= getMaxNameEditDistance(phrase, candidate.phrase))
    .sort((a, b) => a.distance - b.distance);

  const [topCandidate, secondCandidate] = candidates;
  if (topCandidate == null) return { status: 'none' };

  if (
    secondCandidate != null &&
    topCandidate.participantId !== secondCandidate.participantId &&
    topCandidate.distance === secondCandidate.distance
  ) {
    return { status: 'ambiguous' };
  }

  return {
    status: 'match',
    participantId: topCandidate.participantId,
    matchKind: 'name',
    matchedPhrase: topCandidate.phrase,
  };
}

function matchPlayerByBestEffortNumber(
  phrase: string,
  phrases: PlayerVoicePhrase[],
): PlayerMatchResult {
  const candidates = getBestEffortNumberScores(phrase, phrases)
    .filter((candidate) => candidate.distance <= getMaxNumberEditDistance(phrase, candidate.phrase))
    .sort((a, b) => a.distance - b.distance);

  const [topCandidate, secondCandidate] = candidates;
  if (topCandidate == null) return { status: 'none' };

  if (
    secondCandidate != null &&
    topCandidate.participantId !== secondCandidate.participantId &&
    topCandidate.distance === secondCandidate.distance
  ) {
    return { status: 'ambiguous' };
  }

  return {
    status: 'match',
    participantId: topCandidate.participantId,
    matchKind: 'number',
    matchedPhrase: topCandidate.phrase,
  };
}

interface PlayerNameScore {
  participantId: string;
  phrase: string;
  distance: number;
}

function getBestEffortNameScores(phrase: string, phrases: PlayerVoicePhrase[]): PlayerNameScore[] {
  const bestMatchByParticipant = new Map<string, PlayerNameScore>();

  phrases
    .filter((candidate) => candidate.matchKind === 'name')
    .forEach((candidate) => {
      const currentBestMatch = bestMatchByParticipant.get(candidate.participantId);
      const distance = getDamerauLevenshteinDistance(phrase, candidate.phrase);
      if (currentBestMatch != null && currentBestMatch.distance <= distance) return;

      bestMatchByParticipant.set(candidate.participantId, {
        participantId: candidate.participantId,
        phrase: candidate.phrase,
        distance,
      });
    });

  return [...bestMatchByParticipant.values()];
}

function getBestEffortNumberScores(
  phrase: string,
  phrases: PlayerVoicePhrase[],
): PlayerNameScore[] {
  const bestMatchByParticipant = new Map<string, PlayerNameScore>();

  phrases
    .filter((candidate) => candidate.matchKind === 'number')
    .forEach((candidate) => {
      const currentBestMatch = bestMatchByParticipant.get(candidate.participantId);
      const distance = getDamerauLevenshteinDistance(phrase, candidate.phrase);
      if (currentBestMatch != null && currentBestMatch.distance <= distance) return;

      bestMatchByParticipant.set(candidate.participantId, {
        participantId: candidate.participantId,
        phrase: candidate.phrase,
        distance,
      });
    });

  return [...bestMatchByParticipant.values()];
}

function normalizeTranscript(transcript: string): string[] {
  const normalized = normalizeVoicePhrase(transcript);
  return normalized ? normalized.split(' ') : [];
}

function getFirstName(name: string): string | null {
  const [firstName] = normalizeTranscript(name);
  return firstName ?? null;
}

const UNSUPPORTED_COMMAND_WORDS = new Set(['assist', 'block', 'by', 'drop', 'goal', 'to']);

function getMaxNameEditDistance(phrase: string, candidatePhrase: string): number {
  const shortestLength = Math.min(phrase.length, candidatePhrase.length);
  if (shortestLength <= 4) return 2;
  if (shortestLength <= 8) return 2;

  return 3;
}

function getMaxNumberEditDistance(phrase: string, candidatePhrase: string): number {
  const shortestLength = Math.min(phrase.length, candidatePhrase.length);
  if (shortestLength <= 2) return 0;
  if (shortestLength <= 5) return 1;

  return 2;
}

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
