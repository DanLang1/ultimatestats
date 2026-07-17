import Constants from 'expo-constants';

import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { ADVANCED_TRACKING_SCHEMA_VERSION } from '@/lib/advancedTracking/types';
import type { LinePreset, SavedGame, SavedTeam } from '@/lib/storage/types';
import { CURRENT_SCHEMA_VERSION } from '@/lib/storage/types';

import type { SharedPayload } from './types';

export function serializeGame(game: SavedGame): SharedPayload {
  return {
    type: 'game',
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    sharedAt: Date.now(),
    data: game,
  };
}

export function serializeAdvancedGame(game: AdvancedTrackedGame): SharedPayload {
  return {
    type: 'advanced-game',
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    schemaVersion: ADVANCED_TRACKING_SCHEMA_VERSION,
    sharedAt: Date.now(),
    data: game,
  };
}

export function serializeAdvancedGames(games: AdvancedTrackedGame[]): SharedPayload {
  return {
    type: 'advanced-games',
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    schemaVersion: ADVANCED_TRACKING_SCHEMA_VERSION,
    sharedAt: Date.now(),
    data: games,
  };
}

export function serializeTeam(team: SavedTeam, presets: LinePreset[]): SharedPayload {
  const teamPresets = presets.filter((p) => p.teamId === team.id);
  return {
    type: 'team',
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    sharedAt: Date.now(),
    data: team,
    ...(teamPresets.length > 0 && { presets: teamPresets }),
  };
}

export function serializeGames(games: SavedGame[]): SharedPayload {
  return {
    type: 'games',
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    sharedAt: Date.now(),
    data: games,
  };
}
