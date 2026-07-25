import type {
  AdvancedTrackedGame,
  FieldLocation,
  PlayerRef,
  PossessionAction,
} from '@/lib/advancedTracking/types';
import type { LinePreset, SavedGame, SavedTeam } from '@/lib/storage/types';

import type { SharedPayload } from './types';

const MAX_PAYLOAD_EVENTS = 500;
const MAX_ADVANCED_POINTS = 100;
const MAX_ADVANCED_POSSESSIONS = 1000;
const MAX_ADVANCED_ACTIONS = 5000;
const MAX_ADVANCED_PARTICIPANTS = 100;
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

function validatePlayerRef(ref: unknown): asserts ref is PlayerRef {
  if (!isRecord(ref)) {
    throw new Error('Invalid advanced game: invalid player reference');
  }
  if (ref.refType === 'participant') {
    if (!isString(ref.participantId) || ref.participantId.length === 0) {
      throw new Error('Invalid advanced game: missing participantId');
    }
    return;
  }
  if (ref.refType !== 'unknown' && ref.refType !== 'untracked') {
    throw new Error('Invalid advanced game: invalid player reference type');
  }
}

function validateFieldLocation(location: unknown): asserts location is FieldLocation {
  if (!isRecord(location)) {
    throw new Error('Invalid advanced game: invalid field location');
  }
  if (location.locationType === 'zone') {
    if (!isString(location.zoneId)) {
      throw new Error('Invalid advanced game: missing zoneId');
    }
    return;
  }
  if (location.locationType === 'xy') {
    if (!isNumber(location.x) || !isNumber(location.y)) {
      throw new Error('Invalid advanced game: invalid xy location');
    }
    return;
  }
  throw new Error('Invalid advanced game: invalid field location type');
}

function validateOptionalPlayerRef(ref: unknown) {
  if (ref !== undefined) {
    validatePlayerRef(ref);
  }
}

function validateOptionalFieldLocation(location: unknown) {
  if (location !== undefined) {
    validateFieldLocation(location);
  }
}

function validateAdvancedAction(action: unknown): asserts action is PossessionAction {
  if (!isRecord(action)) {
    throw new Error('Invalid advanced game: invalid action');
  }
  if (!isString(action.id) || action.id.length === 0) {
    throw new Error('Invalid advanced game: missing action id');
  }

  if (action.kind === 'pull') {
    if (!isString(action.sideId) || !isString(action.receivingSideId)) {
      throw new Error('Invalid advanced game: invalid pull side');
    }
    validatePlayerRef(action.puller);
    validateOptionalPlayerRef(action.receiver);
    validateOptionalFieldLocation(action.origin);
    validateOptionalFieldLocation(action.landing);
    if (
      action.result !== 'inbound' &&
      action.result !== 'ob' &&
      action.result !== 'dropped' &&
      action.result !== 'roller'
    ) {
      throw new Error('Invalid advanced game: invalid pull result');
    }
    return;
  }

  if (action.kind === 'disc_pickup') {
    if (!isString(action.sideId)) {
      throw new Error('Invalid advanced game: invalid pickup side');
    }
    validatePlayerRef(action.player);
    validateOptionalFieldLocation(action.location);
    return;
  }

  if (action.kind === 'throw') {
    if (!isString(action.sideId)) {
      throw new Error('Invalid advanced game: invalid throw side');
    }
    validatePlayerRef(action.thrower);
    validateOptionalPlayerRef(action.toPlayer);
    validateOptionalPlayerRef(action.defender);
    validateOptionalFieldLocation(action.origin);
    validateOptionalFieldLocation(action.target);
    const validResults = ['complete', 'goal', 'drop', 'throwaway', 'stall', 'block', 'callahan'];
    if (!validResults.includes(String(action.result))) {
      throw new Error('Invalid advanced game: invalid throw result');
    }
    return;
  }

  if (action.kind === 'stoppage') {
    if (
      action.reason !== 'timeout' &&
      action.reason !== 'injury' &&
      action.reason !== 'manual_pause'
    ) {
      throw new Error('Invalid advanced game: invalid stoppage reason');
    }
    if (action.sideId !== undefined && !isString(action.sideId)) {
      throw new Error('Invalid advanced game: invalid stoppage side');
    }
    return;
  }

  throw new Error('Invalid advanced game: invalid action kind');
}

function validateAdvancedGame(data: unknown): asserts data is AdvancedTrackedGame {
  if (!isRecord(data)) {
    throw new Error('Invalid advanced game: missing data');
  }
  if (!isString(data.id) || data.id.length === 0) {
    throw new Error('Invalid payload: missing data id');
  }
  if (!isNumber(data.schemaVersion)) {
    throw new Error('Invalid advanced game: missing schemaVersion');
  }
  if (!isNumber(data.createdAt) || !isNumber(data.updatedAt)) {
    throw new Error('Invalid advanced game: missing timestamps');
  }
  if (data.importedAt !== undefined && !isNumber(data.importedAt)) {
    throw new Error('Invalid advanced game: invalid importedAt');
  }
  if (data.status !== 'in_progress' && data.status !== 'final' && data.status !== 'terminated') {
    throw new Error('Invalid advanced game: invalid status');
  }
  if (!isString(data.focusSideId) || !isString(data.initialReceivingSideId)) {
    throw new Error('Invalid advanced game: missing side ids');
  }
  if (data.flip !== undefined) {
    if (!isRecord(data.flip) || (data.flip.result !== 'won' && data.flip.result !== 'lost')) {
      throw new Error('Invalid advanced game: invalid flip result');
    }
    if (
      data.flip.choice !== undefined &&
      data.flip.choice !== 'offense' &&
      data.flip.choice !== 'defense' &&
      data.flip.choice !== 'side'
    ) {
      throw new Error('Invalid advanced game: invalid flip choice');
    }
    if (data.flip.result === 'lost' && data.flip.choice !== undefined) {
      throw new Error('Invalid advanced game: lost flip cannot include a choice');
    }
  }
  if (!isRecord(data.settings) || !isString(data.settings.locationMode)) {
    throw new Error('Invalid advanced game: missing settings');
  }
  if (!Array.isArray(data.sides) || data.sides.length !== 2) {
    throw new Error('Invalid advanced game: expected two sides');
  }
  for (const side of data.sides) {
    if (!isRecord(side) || !isString(side.id) || !isString(side.label)) {
      throw new Error('Invalid advanced game: invalid side');
    }
    if (side.trackingMode !== 'full-roster' && side.trackingMode !== 'anonymous') {
      throw new Error('Invalid advanced game: invalid tracking mode');
    }
  }
  if (!Array.isArray(data.participants)) {
    throw new Error('Invalid advanced game: missing participants');
  }
  if (data.participants.length > MAX_ADVANCED_PARTICIPANTS) {
    throw new Error('Invalid advanced game: too many participants');
  }
  for (const participant of data.participants) {
    if (!isRecord(participant) || !isString(participant.id) || !isString(participant.name)) {
      throw new Error('Invalid advanced game: invalid participant');
    }
  }
  if (!Array.isArray(data.points)) {
    throw new Error('Invalid advanced game: missing points');
  }
  if (data.points.length > MAX_ADVANCED_POINTS) {
    throw new Error('Invalid advanced game: too many points');
  }

  let possessionCount = 0;
  let actionCount = 0;
  for (const point of data.points) {
    if (!isRecord(point) || !isString(point.id) || !Array.isArray(point.lines)) {
      throw new Error('Invalid advanced game: invalid point');
    }
    for (const line of point.lines) {
      if (!isRecord(line) || !isString(line.sideId) || !Array.isArray(line.participantIds)) {
        throw new Error('Invalid advanced game: invalid point line');
      }
    }
    if (!Array.isArray(point.possessions)) {
      throw new Error('Invalid advanced game: missing possessions');
    }
    possessionCount += point.possessions.length;
    for (const possession of point.possessions) {
      if (!isRecord(possession) || !isString(possession.id) || !isString(possession.sideId)) {
        throw new Error('Invalid advanced game: invalid possession');
      }
      if (!Array.isArray(possession.actions)) {
        throw new Error('Invalid advanced game: missing actions');
      }
      actionCount += possession.actions.length;
      for (const action of possession.actions) {
        validateAdvancedAction(action);
      }
    }
  }

  if (possessionCount > MAX_ADVANCED_POSSESSIONS) {
    throw new Error('Invalid advanced game: too many possessions');
  }
  if (actionCount > MAX_ADVANCED_ACTIONS) {
    throw new Error('Invalid advanced game: too many actions');
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

function validateAdvancedGamesPayload(
  payload: Record<string, unknown>,
  schemaVersion: number,
): SharedPayload {
  if (!Array.isArray(payload.data)) {
    throw new Error('Invalid payload: advanced games data must be an array');
  }
  if (payload.data.length === 0) {
    throw new Error('Invalid payload: no games in payload');
  }
  if (payload.data.length > MAX_BULK_GAMES) {
    throw new Error(`Invalid payload: too many games (max ${MAX_BULK_GAMES})`);
  }
  for (const item of payload.data) {
    validateAdvancedGame(item);
  }
  return {
    type: 'advanced-games',
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

  if (
    raw.type !== 'game' &&
    raw.type !== 'advanced-game' &&
    raw.type !== 'advanced-games' &&
    raw.type !== 'team' &&
    raw.type !== 'games'
  ) {
    throw new Error('Invalid payload: unknown type');
  }

  if (raw.type === 'games') {
    return validateGamesPayload(raw, schemaVersion);
  }

  if (raw.type === 'advanced-games') {
    return validateAdvancedGamesPayload(raw, schemaVersion);
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

  if (raw.type === 'advanced-game') {
    validateAdvancedGame(raw.data);
    return { ...base, type: 'advanced-game', data: raw.data };
  }

  validateTeam(raw.data);
  return { ...base, type: 'team', data: raw.data };
}
