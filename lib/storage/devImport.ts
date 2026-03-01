import type { SavedGame } from './types';

const UNSUPPORTED_JSON_MESSAGE =
  'Paste a saved game object, a games array, { games: [...] }, or a persisted store blob with state.savedGames.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSavedTeamLike(value: unknown): boolean {
  return isRecord(value) && typeof value.name === 'string' && Array.isArray(value.roster);
}

function isSavedGameLike(value: unknown): value is SavedGame {
  return (
    isRecord(value) &&
    typeof value.schemaVersion === 'number' &&
    isSavedTeamLike(value.team1) &&
    typeof value.team2Name === 'string' &&
    typeof value.team1Score === 'number' &&
    typeof value.team2Score === 'number' &&
    Array.isArray(value.events) &&
    typeof value.gameTo === 'number' &&
    typeof value.gameLength === 'number' &&
    (value.startingPossession === 'team1' || value.startingPossession === 'team2')
  );
}

function getSavedGamesCandidate(value: unknown): unknown {
  if (Array.isArray(value) || isSavedGameLike(value)) {
    return value;
  }

  if (!isRecord(value)) {
    return null;
  }

  if (Array.isArray(value.games)) {
    return value.games;
  }

  if (Array.isArray(value.savedGames)) {
    return value.savedGames;
  }

  if (isSavedGameLike(value.data) || Array.isArray(value.data)) {
    return value.data;
  }

  if (isRecord(value.state) && Array.isArray(value.state.savedGames)) {
    return value.state.savedGames;
  }

  return null;
}

function getRawSavedGamesCandidate(value: unknown): unknown {
  if (Array.isArray(value) || isSavedGameLike(value)) {
    return value;
  }

  if (!isRecord(value)) {
    return null;
  }

  if (Array.isArray(value.games)) {
    return value.games;
  }

  if (Array.isArray(value.savedGames)) {
    return value.savedGames;
  }

  if (Array.isArray(value.data)) {
    return value.data;
  }

  if (isRecord(value.data)) {
    return [value.data];
  }

  if (isRecord(value.state) && Array.isArray(value.state.savedGames)) {
    return value.state.savedGames;
  }

  return [value];
}

export function extractSavedGamesFromValue(value: unknown): SavedGame[] {
  const candidate = getSavedGamesCandidate(value);

  if (isSavedGameLike(candidate)) {
    return [candidate];
  }

  if (!Array.isArray(candidate) || candidate.length === 0) {
    throw new Error(UNSUPPORTED_JSON_MESSAGE);
  }

  if (!candidate.every(isSavedGameLike)) {
    throw new Error(UNSUPPORTED_JSON_MESSAGE);
  }

  return candidate;
}

export function extractRawSavedGamesFromValue(value: unknown): unknown[] {
  const candidate = getRawSavedGamesCandidate(value);

  if (!Array.isArray(candidate) || candidate.length === 0) {
    throw new Error(UNSUPPORTED_JSON_MESSAGE);
  }

  return candidate;
}

function parseJsonValue(rawJson: string): unknown {
  const trimmedJson = rawJson.trim();

  if (!trimmedJson) {
    throw new Error('Paste some JSON first.');
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmedJson);
  } catch {
    throw new Error('Invalid JSON. Check for missing commas or brackets and try again.');
  }

  // Some storage inspectors wrap the JSON payload in an escaped string.
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      throw new Error(UNSUPPORTED_JSON_MESSAGE);
    }
  }

  return parsed;
}

export function parseSavedGamesJson(rawJson: string): SavedGame[] {
  return extractSavedGamesFromValue(parseJsonValue(rawJson));
}

export function parseRawSavedGamesJson(rawJson: string): unknown[] {
  return extractRawSavedGamesFromValue(parseJsonValue(rawJson));
}
