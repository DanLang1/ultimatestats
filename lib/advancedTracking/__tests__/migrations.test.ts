import { migrateAdvancedTrackedGame } from '@/lib/advancedTracking/migrations';
import {
  ADVANCED_TRACKING_SCHEMA_VERSION,
  type AdvancedTrackedGame,
} from '@/lib/advancedTracking/types';

function makeGame(schemaVersion: number): AdvancedTrackedGame {
  return {
    id: 'advanced-game',
    schemaVersion,
    createdAt: 1,
    updatedAt: 2,
    gameType: 'game',
    status: 'final',
    focusSideId: 'home',
    initialReceivingSideId: 'home',
    settings: { locationMode: 'none' },
    sides: [
      { id: 'home', label: 'Home', trackingMode: 'full-roster' },
      { id: 'away', label: 'Away', trackingMode: 'anonymous' },
    ],
    participants: [],
    points: [],
  };
}

describe('migrateAdvancedTrackedGame', () => {
  it('stamps older records without inventing throw details', () => {
    const legacy = makeGame(2);

    const migrated = migrateAdvancedTrackedGame(legacy);

    expect(migrated.schemaVersion).toBe(ADVANCED_TRACKING_SCHEMA_VERSION);
    expect(migrated.points).toEqual([]);
    expect(legacy.schemaVersion).toBe(2);
  });

  it('returns a current record unchanged', () => {
    const current = makeGame(ADVANCED_TRACKING_SCHEMA_VERSION);

    expect(migrateAdvancedTrackedGame(current)).toBe(current);
  });

  it('rejects records from a newer schema', () => {
    expect(() =>
      migrateAdvancedTrackedGame(makeGame(ADVANCED_TRACKING_SCHEMA_VERSION + 1)),
    ).toThrow('newer than supported version');
  });
});
