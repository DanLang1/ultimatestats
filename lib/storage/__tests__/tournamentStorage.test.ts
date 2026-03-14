import AsyncStorage from '@react-native-async-storage/async-storage';
import { asyncStorageAdapter } from '../asyncStorageAdapter';
import { Tournament } from '../types';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 'tournament-1',
    name: 'Spring Fling',
    startDate: '2026-03-14',
    endDate: '2026-03-15',
    ...overrides,
  };
}

describe('tournament storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  describe('loadTournaments', () => {
    it('returns empty array when no data exists', async () => {
      const tournaments = await asyncStorageAdapter.loadTournaments();

      expect(tournaments).toEqual([]);
    });

    it('returns stored tournaments', async () => {
      const stored = [makeTournament()];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stored));

      const tournaments = await asyncStorageAdapter.loadTournaments();

      expect(tournaments).toEqual(stored);
    });
  });

  describe('saveTournament', () => {
    it('adds a new tournament', async () => {
      const tournament = makeTournament();

      await asyncStorageAdapter.saveTournament(tournament);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        'ultimatestats_tournaments',
        JSON.stringify([tournament]),
      );
    });

    it('updates an existing tournament by id', async () => {
      const existing = makeTournament();
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([existing]));

      const updated = makeTournament({ name: 'Updated Name' });

      await asyncStorageAdapter.saveTournament(updated);

      const [, savedValue] = mockedAsyncStorage.setItem.mock.calls[0];
      const saved = JSON.parse(savedValue);
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('Updated Name');
    });

    it('generates an id when not present', async () => {
      const tournament = { ...makeTournament(), id: '' };

      await asyncStorageAdapter.saveTournament(tournament);

      const [, savedValue] = mockedAsyncStorage.setItem.mock.calls[0];
      const saved = JSON.parse(savedValue);
      expect(saved[0].id).toBeTruthy();
      expect(saved[0].id).not.toBe('');
    });
  });

  describe('deleteTournament', () => {
    it('removes the tournament by id', async () => {
      const t1 = makeTournament({ id: 'keep' });
      const t2 = makeTournament({ id: 'delete' });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([t1, t2]));

      await asyncStorageAdapter.deleteTournament('delete');

      const [, savedValue] = mockedAsyncStorage.setItem.mock.calls[0];
      const saved = JSON.parse(savedValue);
      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe('keep');
    });

    it('no-ops gracefully when id does not exist', async () => {
      const t1 = makeTournament();
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([t1]));

      await asyncStorageAdapter.deleteTournament('nonexistent');

      const [, savedValue] = mockedAsyncStorage.setItem.mock.calls[0];
      const saved = JSON.parse(savedValue);
      expect(saved).toHaveLength(1);
    });
  });
});
