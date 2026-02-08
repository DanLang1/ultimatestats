import Constants from 'expo-constants';

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
