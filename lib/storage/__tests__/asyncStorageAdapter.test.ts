import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoalEvent } from '@/store/gameStore.types';
import { asyncStorageAdapter } from '../asyncStorageAdapter';
import { SavedGamesStorageCorruptionError } from '../errors';
import { CURRENT_SCHEMA_VERSION, SavedGame } from '../types';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const goal = (team: 'team1' | 'team2'): GoalEvent => ({
  type: 'goal',
  team,
  goalPlayerId: null,
  assistPlayerId: null,
});

function makeSavedGame(overrides: Partial<SavedGame> = {}): SavedGame {
  return {
    id: 'game-1',
    schemaVersion: 2,
    createdAt: 1,
    team1: {
      id: 'team-1',
      name: 'My Team',
      roster: [],
    },
    team2Name: 'Opponent',
    team1Score: 0,
    team2Score: 0,
    events: [],
    gameTo: 15,
    gameLength: 90,
    startingPossession: 'team1',
    ...overrides,
  };
}

describe('asyncStorageAdapter', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('quarantines a bad saved-game entry without dropping the rest of the list', async () => {
    const legacyGame = makeSavedGame({
      events: [
        goal('team1'),
        goal('team2'),
        goal('team1'),
        goal('team2'),
        goal('team1'),
        goal('team2'),
        goal('team1'),
        goal('team2'),
        goal('team1'),
        goal('team1'),
        goal('team1'),
      ],
      team1Score: 7,
      team2Score: 4,
      gameTo: 13,
    });
    mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([legacyGame, null]));

    const games = await asyncStorageAdapter.loadGames();

    expect(games).toHaveLength(1);
    expect(games[0].id).toBe(legacyGame.id);
    expect(games[0].schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledTimes(2);
    expect(mockedAsyncStorage.setItem).toHaveBeenNthCalledWith(
      1,
      'ultimatestats_games_quarantine',
      expect.any(String),
    );
    expect(mockedAsyncStorage.setItem).toHaveBeenNthCalledWith(
      2,
      'ultimatestats_games',
      JSON.stringify(games),
    );
  });

  it('writes only once when saveGame reads legacy games and then persists the final updated list', async () => {
    const existingLegacyGame = makeSavedGame({
      id: 'existing-game',
      events: [
        goal('team1'),
        goal('team2'),
        goal('team1'),
        goal('team2'),
        goal('team1'),
        goal('team2'),
        goal('team1'),
        goal('team2'),
        goal('team1'),
        goal('team1'),
        goal('team1'),
      ],
      team1Score: 7,
      team2Score: 4,
      gameTo: 13,
    });
    const newGame = makeSavedGame({
      id: 'new-game',
      schemaVersion: CURRENT_SCHEMA_VERSION,
    });
    mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([existingLegacyGame]));

    await asyncStorageAdapter.saveGame(newGame);

    expect(mockedAsyncStorage.setItem).toHaveBeenCalledTimes(1);
    const [, savedValue] = mockedAsyncStorage.setItem.mock.calls[0];
    const savedGames = JSON.parse(savedValue);

    expect(savedGames).toHaveLength(2);
    expect(savedGames.find((game: SavedGame) => game.id === 'existing-game').schemaVersion).toBe(
      CURRENT_SCHEMA_VERSION,
    );
    expect(savedGames.find((game: SavedGame) => game.id === 'new-game').schemaVersion).toBe(
      CURRENT_SCHEMA_VERSION,
    );
  });

  it('throws for unrecoverable saved-games blob corruption', async () => {
    mockedAsyncStorage.getItem.mockResolvedValue('{not-json');

    const loadGamesPromise = asyncStorageAdapter.loadGames();

    await expect(loadGamesPromise).rejects.toBeInstanceOf(SavedGamesStorageCorruptionError);
    await expect(loadGamesPromise).rejects.toThrow('Saved games storage is unreadable');
    expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
