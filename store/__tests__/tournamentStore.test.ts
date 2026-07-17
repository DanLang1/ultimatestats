import AsyncStorage from '@react-native-async-storage/async-storage';

import { SavedGame, Tournament, TournamentGameLink } from '@/lib/storage/types';

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
    schemaVersion: 6,
    createdAt: 1000,
    team1: { id: 'team-1', name: 'Timber', roster: [] },
    team2Name: 'Rivals',
    team1Score: 15,
    team2Score: 10,
    events: [],
    gameTo: 15,
    startingPossession: 'team1',
    ...overrides,
  };
}

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 'tournament-1',
    schemaVersion: 1,
    kind: 'basic',
    name: 'Spring Fling',
    startDate: '2026-03-14',
    endDate: '2026-03-15',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function makeLink(overrides: Partial<TournamentGameLink> = {}): TournamentGameLink {
  return {
    id: 'link-1',
    schemaVersion: 1,
    tournamentId: 'tournament-1',
    gameKind: 'basic',
    gameId: 'game-1',
    createdAt: 1000,
    ...overrides,
  };
}

describe('tournamentStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    useTournamentStore.setState({
      tournaments: [],
      gameLinks: [],
    });
  });

  describe('addTournament', () => {
    it('creates an untyped tournament and adds it to state', async () => {
      const id = await useTournamentStore
        .getState()
        .addTournament('Regionals', '2026-04-01', '2026-04-02');

      const { tournaments } = useTournamentStore.getState();
      expect(tournaments).toHaveLength(1);
      expect(tournaments[0].id).toBe(id);
      expect(tournaments[0].kind).toBeNull();
      expect(tournaments[0].schemaVersion).toBe(1);
      expect(tournaments[0].name).toBe('Regionals');
      expect(tournaments[0].startDate).toBe('2026-04-01');
      expect(tournaments[0].endDate).toBe('2026-04-02');
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        'ultimatestats_tournaments',
        expect.any(String),
      );
    });
  });

  describe('rehydration enrichment', () => {
    it('preserves explicitly untyped tournaments', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({
          state: {
            tournaments: [makeTournament({ kind: null })],
            gameLinks: [],
          },
          version: 0,
        }),
      );

      await useTournamentStore.persist.rehydrate();

      expect(useTournamentStore.getState().tournaments[0].kind).toBeNull();
    });
  });

  describe('updateTournament', () => {
    it('updates an existing tournament timestamp', async () => {
      const tournament = makeTournament();
      useTournamentStore.setState({ tournaments: [tournament] });

      await useTournamentStore.getState().updateTournament('tournament-1', {
        name: 'Fall Classic',
      });

      const { tournaments } = useTournamentStore.getState();
      expect(tournaments[0].name).toBe('Fall Classic');
      expect(tournaments[0].startDate).toBe('2026-03-14');
      expect(tournaments[0].updatedAt).toBeGreaterThanOrEqual(tournament.updatedAt);
    });

    it('no-ops when tournament id does not exist', async () => {
      await useTournamentStore.getState().updateTournament('nonexistent', {
        name: 'Nope',
      });

      expect(useTournamentStore.getState().tournaments).toHaveLength(0);
    });
  });

  describe('addGamesToTournament', () => {
    it('locks an untyped tournament to the first game kind', async () => {
      useTournamentStore.setState({ tournaments: [makeTournament({ kind: null })] });

      const didAdd = await useTournamentStore
        .getState()
        .addGamesToTournament('tournament-1', 'advanced', ['advanced-1']);

      expect(didAdd).toBe(true);
      expect(useTournamentStore.getState().tournaments[0].kind).toBe('advanced');
      expect(useTournamentStore.getState().gameLinks[0]).toMatchObject({
        tournamentId: 'tournament-1',
        gameKind: 'advanced',
        gameId: 'advanced-1',
      });
    });

    it('rejects opposite-kind games for a locked tournament', async () => {
      useTournamentStore.setState({ tournaments: [makeTournament({ kind: 'basic' })] });

      const didAdd = await useTournamentStore
        .getState()
        .addGamesToTournament('tournament-1', 'advanced', ['advanced-1']);

      expect(didAdd).toBe(false);
      expect(useTournamentStore.getState().gameLinks).toHaveLength(0);
    });

    it('replaces existing tournament membership for a game', async () => {
      useTournamentStore.setState({
        tournaments: [
          makeTournament({ id: 'tournament-1' }),
          makeTournament({ id: 'tournament-2', name: 'Other' }),
        ],
        gameLinks: [makeLink({ tournamentId: 'tournament-1', gameId: 'game-1' })],
      });

      await useTournamentStore.getState().addGamesToTournament('tournament-2', 'basic', ['game-1']);

      expect(useTournamentStore.getState().gameLinks).toHaveLength(1);
      expect(useTournamentStore.getState().gameLinks[0].tournamentId).toBe('tournament-2');
    });
  });

  describe('migrateBasicTournamentLinks', () => {
    it('creates links for valid local basic saved games', async () => {
      useTournamentStore.setState({ tournaments: [makeTournament()] });
      const game = makeSavedGame({ tournamentId: 'tournament-1' });

      await useTournamentStore.getState().migrateBasicTournamentLinks([game]);

      expect(useTournamentStore.getState().gameLinks[0]).toMatchObject({
        tournamentId: 'tournament-1',
        gameKind: 'basic',
        gameId: 'game-1',
      });
    });

    it('skips imported games and dangling tournament ids', async () => {
      useTournamentStore.setState({ tournaments: [makeTournament()] });
      const imported = makeSavedGame({
        id: 'imported',
        tournamentId: 'tournament-1',
        importedAt: 2000,
      });
      const dangling = makeSavedGame({ id: 'dangling', tournamentId: 'missing' });

      await useTournamentStore.getState().migrateBasicTournamentLinks([imported, dangling]);

      expect(useTournamentStore.getState().gameLinks).toHaveLength(0);
    });

    it('is idempotent', async () => {
      useTournamentStore.setState({ tournaments: [makeTournament()] });
      const game = makeSavedGame({ tournamentId: 'tournament-1' });

      await useTournamentStore.getState().migrateBasicTournamentLinks([game]);
      await useTournamentStore.getState().migrateBasicTournamentLinks([game]);

      expect(useTournamentStore.getState().gameLinks).toHaveLength(1);
    });
  });

  describe('removeGameFromTournament', () => {
    it('unlocks a tournament when its final game link is removed', async () => {
      useTournamentStore.setState({
        tournaments: [makeTournament({ kind: 'advanced' })],
        gameLinks: [makeLink({ gameKind: 'advanced', gameId: 'advanced-1' })],
      });

      await useTournamentStore.getState().removeGameFromTournament('advanced', 'advanced-1');

      expect(useTournamentStore.getState().gameLinks).toHaveLength(0);
      expect(useTournamentStore.getState().tournaments[0].kind).toBeNull();
    });

    it('keeps a tournament locked while it still has game links', async () => {
      useTournamentStore.setState({
        tournaments: [makeTournament({ kind: 'advanced' })],
        gameLinks: [
          makeLink({ gameKind: 'advanced', gameId: 'advanced-1' }),
          makeLink({ id: 'link-2', gameKind: 'advanced', gameId: 'advanced-2' }),
        ],
      });

      await useTournamentStore.getState().removeGameFromTournament('advanced', 'advanced-1');

      expect(useTournamentStore.getState().gameLinks).toHaveLength(1);
      expect(useTournamentStore.getState().tournaments[0].kind).toBe('advanced');
    });
  });

  describe('deleteTournament', () => {
    it('removes tournament and associated links', async () => {
      useTournamentStore.setState({
        tournaments: [makeTournament()],
        gameLinks: [makeLink()],
      });

      await useTournamentStore.getState().deleteTournament('tournament-1');

      expect(useTournamentStore.getState().tournaments).toHaveLength(0);
      expect(useTournamentStore.getState().gameLinks).toHaveLength(0);
    });
  });

  describe('selectors', () => {
    it('returns tournament ids and counts from links', () => {
      useTournamentStore.setState({
        gameLinks: [
          makeLink({ gameId: 'game-1' }),
          makeLink({ id: 'link-2', gameId: 'game-2' }),
          makeLink({
            id: 'link-3',
            tournamentId: 'advanced-tournament',
            gameKind: 'advanced',
            gameId: 'advanced-1',
          }),
        ],
      });

      expect(useTournamentStore.getState().getTournamentIdForGame('basic', 'game-1')).toBe(
        'tournament-1',
      );
      expect(useTournamentStore.getState().getLinksForTournament('tournament-1')).toHaveLength(2);
      expect(
        useTournamentStore.getState().getTournamentGameCounts('basic').get('tournament-1'),
      ).toBe(2);
    });
  });
});
