import type { LinePreset, SavedGame, SavedTeam } from '@/lib/storage/types';

export interface SharedPayload {
  type: 'game' | 'team' | 'games';
  appVersion: string;
  schemaVersion: number;
  sharedAt: number;
  data: SavedGame | SavedTeam | SavedGame[];
  presets?: LinePreset[];
}
