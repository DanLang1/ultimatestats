import type { SharedPayload } from './types';

const MAX_PAYLOAD_EVENTS = 500;
const MAX_ROSTER_SIZE = 50;
const MAX_STRING_LENGTH = 200;
const MAX_BULK_GAMES = 10;

function isString(val: unknown): val is string {
  return typeof val === 'string';
}

function isNumber(val: unknown): val is number {
  return typeof val === 'number' && !isNaN(val);
}

function sanitizeString(val: unknown): string {
  if (!isString(val)) return '';
  return val.slice(0, MAX_STRING_LENGTH);
}

export function validatePayload(raw: unknown): SharedPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid payload: not an object');
  }

  const payload = raw as Record<string, unknown>;

  if (payload.type !== 'game' && payload.type !== 'team' && payload.type !== 'games') {
    throw new Error('Invalid payload: unknown type');
  }

  if (!isNumber(payload.schemaVersion)) {
    throw new Error('Invalid payload: missing schemaVersion');
  }

  if (payload.type === 'games') {
    return validateGamesPayload(payload);
  }

  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error('Invalid payload: missing data');
  }

  const data = payload.data as Record<string, unknown>;

  if (!isString(data.id) || data.id.length === 0) {
    throw new Error('Invalid payload: missing data id');
  }

  if (payload.type === 'game') {
    validateGame(data);
  } else {
    validateTeam(data);
  }

  const result: SharedPayload = {
    type: payload.type,
    appVersion: sanitizeString(payload.appVersion),
    schemaVersion: payload.schemaVersion,
    sharedAt: isNumber(payload.sharedAt) ? payload.sharedAt : Date.now(),
    data: payload.data as SharedPayload['data'],
  };

  if (Array.isArray(payload.presets)) {
    validatePresets(payload.presets);
    result.presets = payload.presets as SharedPayload['presets'];
  }

  return result;
}

function validateGame(data: Record<string, unknown>) {
  if (!isString(data.team2Name)) {
    throw new Error('Invalid game: missing team2Name');
  }

  if (!isNumber(data.team1Score) || !isNumber(data.team2Score)) {
    throw new Error('Invalid game: missing scores');
  }

  if (!Array.isArray(data.events)) {
    throw new Error('Invalid game: missing events');
  }

  if (data.events.length > MAX_PAYLOAD_EVENTS) {
    throw new Error('Invalid game: too many events');
  }

  // Validate team1 has a roster
  const team1 = data.team1 as Record<string, unknown> | undefined;
  if (!team1 || !Array.isArray(team1.roster)) {
    throw new Error('Invalid game: missing team1 roster');
  }

  if (team1.roster.length > MAX_ROSTER_SIZE) {
    throw new Error('Invalid game: roster too large');
  }
}

const MAX_PRESETS = 20;

function validatePresets(presets: unknown[]) {
  if (presets.length > MAX_PRESETS) {
    throw new Error('Invalid payload: too many presets');
  }

  for (const preset of presets) {
    if (!preset || typeof preset !== 'object') {
      throw new Error('Invalid preset: not an object');
    }
    const p = preset as Record<string, unknown>;
    if (!isString(p.id) || !isString(p.name) || !isString(p.teamId)) {
      throw new Error('Invalid preset: missing required fields');
    }
    if (!Array.isArray(p.playerIds)) {
      throw new Error('Invalid preset: missing playerIds');
    }
  }
}

function validateTeam(data: Record<string, unknown>) {
  if (!isString(data.name) || data.name.length === 0) {
    throw new Error('Invalid team: missing name');
  }

  if (!Array.isArray(data.roster)) {
    throw new Error('Invalid team: missing roster');
  }

  if (data.roster.length > MAX_ROSTER_SIZE) {
    throw new Error('Invalid team: roster too large');
  }
}

function validateGamesPayload(payload: Record<string, unknown>): SharedPayload {
  if (!Array.isArray(payload.data)) {
    throw new Error('Invalid payload: games data must be an array');
  }

  if (payload.data.length === 0) {
    throw new Error('Invalid payload: no games in payload');
  }

  if (payload.data.length > MAX_BULK_GAMES) {
    throw new Error(`Invalid payload: too many games (max ${MAX_BULK_GAMES})`);
  }

  for (const item of payload.data) {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid payload: game entry is not an object');
    }
    const data = item as Record<string, unknown>;
    if (!isString(data.id) || data.id.length === 0) {
      throw new Error('Invalid payload: game missing id');
    }
    validateGame(data);
  }

  return {
    type: 'games',
    appVersion: sanitizeString(payload.appVersion),
    schemaVersion: payload.schemaVersion as number,
    sharedAt: isNumber(payload.sharedAt) ? payload.sharedAt : Date.now(),
    data: payload.data as SharedPayload['data'],
  };
}
