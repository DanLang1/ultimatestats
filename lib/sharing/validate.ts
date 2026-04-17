import type { LinePreset, SavedGame, SavedTeam } from '@/lib/storage/types';
import type { SharedPayload } from './types';

const MAX_PAYLOAD_EVENTS = 500;
const MAX_ROSTER_SIZE = 50;
const MAX_STRING_LENGTH = 200;
const MAX_BULK_GAMES = 10;

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null;
}

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

function validateGame(data: unknown): asserts data is SavedGame {
  if (!isRecord(data)) {
    throw new Error('Invalid payload: missing data');
  }
  if (!isString(data.id) || data.id.length === 0) {
    throw new Error('Invalid payload: missing data id');
  }
  if (!isString(data.team2Name)) {
    throw new Error('Invalid game: missing team2Name');
  }
  if (!isNumber(data.team1Score) || !isNumber(data.team2Score)) {
    throw new Error('Invalid game: missing scores');
  }
  if (data.playedAt !== undefined && !isNumber(data.playedAt)) {
    throw new Error('Invalid game: invalid playedAt');
  }
  if (!Array.isArray(data.events)) {
    throw new Error('Invalid game: missing events');
  }
  if (data.events.length > MAX_PAYLOAD_EVENTS) {
    throw new Error('Invalid game: too many events');
  }
  if (!isRecord(data.team1) || !Array.isArray(data.team1.roster)) {
    throw new Error('Invalid game: missing team1 roster');
  }
  if (data.team1.roster.length > MAX_ROSTER_SIZE) {
    throw new Error('Invalid game: roster too large');
  }
}

function validateTeam(data: unknown): asserts data is SavedTeam {
  if (!isRecord(data)) {
    throw new Error('Invalid team: missing data');
  }
  if (!isString(data.id) || data.id.length === 0) {
    throw new Error('Invalid payload: missing data id');
  }
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

const MAX_PRESETS = 20;

function validatePresets(presets: unknown[]) {
  if (presets.length > MAX_PRESETS) {
    throw new Error('Invalid payload: too many presets');
  }
  for (const preset of presets) {
    if (!isRecord(preset)) {
      throw new Error('Invalid preset: not an object');
    }
    if (!isString(preset.id) || !isString(preset.name) || !isString(preset.teamId)) {
      throw new Error('Invalid preset: missing required fields');
    }
    if (!Array.isArray(preset.playerIds)) {
      throw new Error('Invalid preset: missing playerIds');
    }
  }
}

function validateGamesPayload(
  payload: Record<string, unknown>,
  schemaVersion: number,
): SharedPayload {
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
    validateGame(item);
  }
  return {
    type: 'games',
    appVersion: sanitizeString(payload.appVersion),
    schemaVersion,
    sharedAt: isNumber(payload.sharedAt) ? payload.sharedAt : Date.now(),
    data: payload.data,
  };
}

export function validatePayload(raw: unknown): SharedPayload {
  if (!isRecord(raw)) {
    throw new Error('Invalid payload: not an object');
  }

  const schemaVersion = raw.schemaVersion;
  if (!isNumber(schemaVersion)) {
    throw new Error('Invalid payload: missing schemaVersion');
  }

  if (raw.type !== 'game' && raw.type !== 'team' && raw.type !== 'games') {
    throw new Error('Invalid payload: unknown type');
  }

  if (raw.type === 'games') {
    return validateGamesPayload(raw, schemaVersion);
  }

  let presets: LinePreset[] | undefined;
  if (Array.isArray(raw.presets)) {
    validatePresets(raw.presets);
    presets = raw.presets;
  }

  const base = {
    appVersion: sanitizeString(raw.appVersion),
    schemaVersion,
    sharedAt: isNumber(raw.sharedAt) ? raw.sharedAt : Date.now(),
    ...(presets !== undefined && { presets }),
  };

  if (raw.type === 'game') {
    validateGame(raw.data);
    return { ...base, type: 'game', data: raw.data };
  }

  validateTeam(raw.data);
  return { ...base, type: 'team', data: raw.data };
}
