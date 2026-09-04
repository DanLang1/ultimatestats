import { migrateAdvancedTrackedGame } from '@/lib/advancedTracking/migrations';
import { ADVANCED_TRACKING_SCHEMA_VERSION } from '@/lib/advancedTracking/types';
import { createAdvancedGameFixture } from '@/test/fixtures/advancedGameBuilder';

function makeGame(schemaVersion: number) {
  return createAdvancedGameFixture({
    id: 'advanced-game',
    schemaVersion,
    createdAt: 1,
    updatedAt: 2,
    status: 'final',
    participants: [],
    points: [],
  });
}

describe('migrateAdvancedTrackedGame', () => {
  it('stamps older records without inventing optional fields', () => {
    const legacy = makeGame(2);

    const migrated = migrateAdvancedTrackedGame(legacy);

    expect(migrated.schemaVersion).toBe(ADVANCED_TRACKING_SCHEMA_VERSION);
    expect(migrated.points).toEqual([]);
    expect(migrated.metadata?.notes).toBeUndefined();
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
