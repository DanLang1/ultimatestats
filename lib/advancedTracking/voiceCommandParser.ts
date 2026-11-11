import {
  buildVoiceNumberHomophonePhrases,
  buildVoiceNumberPhrases,
} from '@/lib/advancedTracking/voiceNumberUtils';
import { soundsAlike } from '@/lib/advancedTracking/voicePhoneticUtils';
import { normalizeVoicePhrase } from '@/lib/advancedTracking/voicePhraseUtils';

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

/**
 * How strongly the transcript identifies the player: `exact` is the player's own name or number,
 * `sounds_like` is a same-sounding spelling or a number homophone, `approximate` is a spelling
 * guess.
 */
export type VoiceCommandMatchCertainty = 'exact' | 'sounds_like' | 'approximate';

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
      matchCertainty: VoiceCommandMatchCertainty;
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
  isNumberHomophone: boolean;
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
    matchCertainty: receiver.matchCertainty,
    matchedPhrase: receiver.matchedPhrase,
  };
}

type PlayerMatchResult =
  | {
      status: 'match';
      participantId: string;
      matchKind: VoiceCommandMatchKind;
      matchCertainty: VoiceCommandMatchCertainty;
      matchedPhrase: string;
    }
  | { status: 'ambiguous' }
  | { status: 'none' };

function matchPlayer(tokens: string[], phrases: PlayerVoicePhrase[]): PlayerMatchResult {
  const exactMatch = matchPlayerByExactPhrase(tokens.join(' '), phrases);
  if (exactMatch.status !== 'none') return exactMatch;

  if (tokens.some((token) => UNSUPPORTED_COMMAND_WORDS.has(token))) {
    return { status: 'none' };
  }

  const spokenNameMatch = matchPlayerBySpokenName(tokens, phrases);
  if (spokenNameMatch.status === 'match') return spokenNameMatch;

  return matchPlayerByClosestSpelling(tokens.join(' '), phrases);
}

function matchPlayerByExactPhrase(phrase: string, phrases: PlayerVoicePhrase[]): PlayerMatchResult {
  const matches = phrases.filter((candidate) => candidate.phrase === phrase);
  const ownPhraseMatches = matches.filter((candidate) => !candidate.isNumberHomophone);
  // A player actually named `Won` or `Oh` outranks another player's number homophone.
  const strongestMatches = ownPhraseMatches.length > 0 ? ownPhraseMatches : matches;
  const uniqueParticipantIds = new Set(strongestMatches.map((match) => match.participantId));

  if (uniqueParticipantIds.size === 0) return { status: 'none' };
  if (uniqueParticipantIds.size > 1) return { status: 'ambiguous' };

  const [match] = strongestMatches;
  return {
    status: 'match',
    participantId: match.participantId,
    matchKind: match.matchKind,
    matchCertainty: match.isNumberHomophone ? 'sounds_like' : 'exact',
    matchedPhrase: match.phrase,
  };
}

/**
 * Finds the one player named anywhere in the transcript, so filler such as `uh Lang` still
 * resolves. Unmatched words are ignored; naming two players is not a receiver-only command.
 * Numbers are excluded: a lone `three` inside `twenty three` must not select player 3.
 */
function matchPlayerBySpokenName(
  tokens: string[],
  phrases: PlayerVoicePhrase[],
): PlayerMatchResult {
  const namePhrases = phrases.filter((candidate) => candidate.matchKind === 'name');
  const spokenNameMatches = getContiguousPhrases(tokens).flatMap((spokenPhrase) =>
    namePhrases
      .filter(
        (candidate) =>
          candidate.phrase === spokenPhrase || soundsAlike(spokenPhrase, candidate.phrase),
      )
      .map((candidate) => ({ candidate, isOwnSpelling: candidate.phrase === spokenPhrase })),
  );
  const uniqueParticipantIds = new Set(
    spokenNameMatches.map((match) => match.candidate.participantId),
  );
  if (uniqueParticipantIds.size !== 1) return { status: 'none' };

  const ownSpellingMatch = spokenNameMatches.find((match) => match.isOwnSpelling);
  const { candidate } = ownSpellingMatch ?? spokenNameMatches[0];
  return {
    status: 'match',
    participantId: candidate.participantId,
    matchKind: 'name',
    matchCertainty: ownSpellingMatch == null ? 'sounds_like' : 'exact',
    matchedPhrase: candidate.phrase,
  };
}

function getContiguousPhrases(tokens: string[]): string[] {
  return tokens.flatMap((_, startIndex) =>
    tokens
      .slice(startIndex)
      .map((__, length) => tokens.slice(startIndex, startIndex + length + 1).join(' ')),
  );
}

function buildPlayerVoicePhrases(
  activeParticipants: VoiceParticipantContext[],
): PlayerVoicePhrase[] {
  return activeParticipants.flatMap((participant) => {
    const normalizedName = normalizeVoicePhrase(participant.name);
    if (!normalizedName) return [];

    const namePhrases = new Set([normalizedName, ...normalizedName.split(' ')]);
    const playerNamePhrases = [...namePhrases].map((phrase) => ({
      participantId: participant.id,
      phrase,
      matchKind: 'name' as const,
      isNumberHomophone: false,
    }));
    const numberPhrases = buildVoiceNumberPhrases(participant.number).map((phrase) => ({
      participantId: participant.id,
      phrase,
      matchKind: 'number' as const,
      isNumberHomophone: false,
    }));
    const numberHomophonePhrases = buildVoiceNumberHomophonePhrases(participant.number).map(
      (phrase) => ({
        participantId: participant.id,
        phrase,
        matchKind: 'number' as const,
        isNumberHomophone: true,
      }),
    );

    return [...playerNamePhrases, ...numberPhrases, ...numberHomophonePhrases];
  });
}

/**
 * Guesses from spelling distance across names and numbers together. Two players at the same
 * distance are ambiguous, whichever kind of phrase each matched.
 */
function matchPlayerByClosestSpelling(
  phrase: string,
  phrases: PlayerVoicePhrase[],
): PlayerMatchResult {
  const [topCandidate, secondCandidate] = getClosestPhraseByParticipant(phrase, phrases).sort(
    (a, b) => a.distance - b.distance,
  );
  if (topCandidate == null) return { status: 'none' };

  if (secondCandidate != null && topCandidate.distance === secondCandidate.distance) {
    return { status: 'ambiguous' };
  }

  return {
    status: 'match',
    participantId: topCandidate.participantId,
    matchKind: topCandidate.matchKind,
    matchCertainty: 'approximate',
    matchedPhrase: topCandidate.phrase,
  };
}

interface PlayerPhraseDistance {
  participantId: string;
  phrase: string;
  matchKind: VoiceCommandMatchKind;
  distance: number;
}

function getClosestPhraseByParticipant(
  phrase: string,
  phrases: PlayerVoicePhrase[],
): PlayerPhraseDistance[] {
  const closestByParticipant = new Map<string, PlayerPhraseDistance>();

  phrases.forEach((candidate) => {
    const distance = getDamerauLevenshteinDistance(phrase, candidate.phrase);
    if (distance > getMaxEditDistance(candidate.matchKind, phrase, candidate.phrase)) return;

    const currentClosest = closestByParticipant.get(candidate.participantId);
    if (currentClosest != null && currentClosest.distance <= distance) return;

    closestByParticipant.set(candidate.participantId, {
      participantId: candidate.participantId,
      phrase: candidate.phrase,
      matchKind: candidate.matchKind,
      distance,
    });
  });

  return [...closestByParticipant.values()];
}

function normalizeTranscript(transcript: string): string[] {
  const normalized = normalizeVoicePhrase(transcript);
  return normalized ? normalized.split(' ') : [];
}

const UNSUPPORTED_COMMAND_WORDS = new Set(['assist', 'block', 'by', 'drop', 'goal']);

function getMaxEditDistance(
  matchKind: VoiceCommandMatchKind,
  phrase: string,
  candidatePhrase: string,
): number {
  return matchKind === 'number'
    ? getMaxNumberEditDistance(phrase, candidatePhrase)
    : getMaxNameEditDistance(phrase, candidatePhrase);
}

function getMaxNameEditDistance(phrase: string, candidatePhrase: string): number {
  const shortestLength = Math.min(phrase.length, candidatePhrase.length);
  if (shortestLength <= 4) return 1;
  if (shortestLength <= 8) return 2;

  return 3;
}

const NUMBER_PHRASE_PREFIX = 'number ';

/** The `number ` prefix identifies no player, so it must not earn a short number extra edits. */
function getMaxNumberEditDistance(phrase: string, candidatePhrase: string): number {
  const shortestLength = Math.min(
    getSpokenNumberLength(phrase),
    getSpokenNumberLength(candidatePhrase),
  );
  if (shortestLength <= 2) return 0;
  if (shortestLength <= 5) return 1;

  return 2;
}

function getSpokenNumberLength(phrase: string): number {
  return phrase.startsWith(NUMBER_PHRASE_PREFIX)
    ? phrase.length - NUMBER_PHRASE_PREFIX.length
    : phrase.length;
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
