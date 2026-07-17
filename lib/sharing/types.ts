import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import type { LinePreset, SavedGame, SavedTeam } from '@/lib/storage/types';

type SharedPayloadBase = {
  appVersion: string;
  schemaVersion: number;
  sharedAt: number;
  presets?: LinePreset[];
};

export type SharedPayload =
  | (SharedPayloadBase & { type: 'game'; data: SavedGame })
  | (SharedPayloadBase & { type: 'advanced-game'; data: AdvancedTrackedGame })
  | (SharedPayloadBase & { type: 'advanced-games'; data: AdvancedTrackedGame[] })
  | (SharedPayloadBase & { type: 'team'; data: SavedTeam })
  | (SharedPayloadBase & { type: 'games'; data: SavedGame[] });
