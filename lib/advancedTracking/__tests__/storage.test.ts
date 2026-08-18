import { loadAdvancedGame } from '@/lib/advancedTracking/storage';
import {
  ADVANCED_TRACKING_SCHEMA_VERSION,
  type AdvancedTrackedGame,
} from '@/lib/advancedTracking/types';

jest.unmock('@/lib/advancedTracking/storage');

const mockGetFirstAsync = jest.fn();
const mockDb = {
  execAsync: jest.fn(async () => undefined),
  getFirstAsync: mockGetFirstAsync,
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => mockDb),
}));

function makeLegacyGame(): AdvancedTrackedGame {
  return {
    id: 'legacy-game',
    schemaVersion: 2,
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

describe('advanced tracking storage migration boundary', () => {
  it('migrates a legacy record when it is loaded from SQLite', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({
      data_json: JSON.stringify(makeLegacyGame()),
    });

    const loaded = await loadAdvancedGame('legacy-game');

    expect(loaded?.schemaVersion).toBe(ADVANCED_TRACKING_SCHEMA_VERSION);
    expect(mockGetFirstAsync).toHaveBeenCalledWith(
      'SELECT data_json FROM advanced_game_records WHERE id = ?',
      'legacy-game',
    );
  });
});
