import { SavedGame, Tournament } from '@/lib/storage/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore } from '../gameStore';
import { useTournamentStore } from '../tournamentStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: <T>(options: { ios?: T; android?: T; default?: T }) => options.ios ?? options.default,
  },
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

function makeSavedGame(overrides: Partial<SavedGame> = {}): SavedGame {
  return {
    id: 'game-1',
    schemaVersion: 5,
    createdAt: 1000,
    team1: { id: 'team-1', name: 'Timber', roster: [] },
    team2Name: 'Rivals',
    team1Score: 15,
    team2Score: 10,
    events: [],
    gameTo: 15,
    gameLength: 0,
    startingPossession: 'team1',
    ...overrides,
  };
}

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 'tournament-1',
    name: 'Spring Fling',
    startDate: '2026-03-14',
    endDate: '2026-03-15',
    ...overrides,
  };
}

describe('tournamentStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    useTournamentStore.setState({ tournaments: [] });
  });

  describe('addTournament', () => {
    it('creates a tournament and adds it to state', async () => {
      const id = await useTournamentStore
        .getState()
        .addTournament('Regionals', '2026-04-01', '2026-04-02');

      const { tournaments } = useTournamentStore.getState();
      expect(tournaments).toHaveLength(1);
      expect(tournaments[0].id).toBe(id);
      expect(tournaments[0].name).toBe('Regionals');
      expect(tournaments[0].startDate).toBe('2026-04-01');
      expect(tournaments[0].endDate).toBe('2026-04-02');
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        'ultimatestats_tournaments',
        expect.any(String),
      );
    });
  });

  describe('updateTournament', () => {
    it('updates an existing tournament', async () => {
      const tournament = makeTournament();
      useTournamentStore.setState({ tournaments: [tournament] });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([tournament]));

      await useTournamentStore.getState().updateTournament('tournament-1', {
        name: 'Fall Classic',
      });

      const { tournaments } = useTournamentStore.getState();
      expect(tournaments[0].name).toBe('Fall Classic');
      expect(tournaments[0].startDate).toBe('2026-03-14');
    });

    it('no-ops when tournament id does not exist', async () => {
      useTournamentStore.setState({ tournaments: [] });

      await useTournamentStore.getState().updateTournament('nonexistent', {
        name: 'Nope',
      });

      expect(useTournamentStore.getState().tournaments).toHaveLength(0);
    });
  });

  describe('clearTournamentFromGames', () => {
    it('removes tournamentId from games that reference the deleted tournament', async () => {
      const game = makeSavedGame({ tournamentId: 'tournament-1' });
      useGameStore.setState({ savedGames: [game] });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([game]));

      await useGameStore.getState().clearTournamentFromGames('tournament-1');

      expect(useGameStore.getState().savedGames[0].tournamentId).toBeUndefined();
    });

    it('does not affect games with a different tournamentId', async () => {
      const game = makeSavedGame({ tournamentId: 'other-tournament' });
      useGameStore.setState({ savedGames: [game] });

      await useGameStore.getState().clearTournamentFromGames('tournament-1');

      expect(useGameStore.getState().savedGames[0].tournamentId).toBe('other-tournament');
    });
  });

  describe('deleteTournament', () => {
    it('removes tournament from state and storage', async () => {
      const tournament = makeTournament();
      useTournamentStore.setState({ tournaments: [tournament] });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([tournament]));

      await useTournamentStore.getState().deleteTournament('tournament-1');

      expect(useTournamentStore.getState().tournaments).toHaveLength(0);
    });

    it('removes tournament from storage', async () => {
      const tournament = makeTournament();
      useTournamentStore.setState({ tournaments: [tournament] });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([tournament]));

      await useTournamentStore.getState().deleteTournament('tournament-1');

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        'ultimatestats_tournaments',
        expect.any(String),
      );
    });
  });
});
