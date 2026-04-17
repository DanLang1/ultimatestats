import type { LinePreset, SavedGame, SavedTeam } from '@/lib/storage/types';

type SharedPayloadBase = {
  appVersion: string;
  schemaVersion: number;
  sharedAt: number;
  presets?: LinePreset[];
};

export type SharedPayload =
  | (SharedPayloadBase & { type: 'game'; data: SavedGame })
  | (SharedPayloadBase & { type: 'team'; data: SavedTeam })
  | (SharedPayloadBase & { type: 'games'; data: SavedGame[] });
