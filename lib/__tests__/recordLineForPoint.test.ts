import AsyncStorage from '@react-native-async-storage/async-storage';

import { computePlayingTime } from '@/lib/lineUtils';
import { Player, SavedGame } from '@/lib/storage';
import { useGameStore } from '@/store/basic/gameStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

function makePlayer(id: string): Player {
  return {
    id,
    name: id.toUpperCase(),
    isActive: true,
    matchingType: null,
    role: null,
  };
}

describe('recordLineForPoint replacement handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    mockedAsyncStorage.removeItem.mockResolvedValue(undefined);

    useGameStore.getState().resetGame();
    useGameStore.setState({ savedGames: [] });
  });

  it('replaces the full point lineup history after earlier injury subs', () => {
    const initialLine = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const injuryLine = ['a', 'b', 'c', 'd', 'e', 'f', 'h'];
    const replacementLine = ['i', 'j', 'k', 'l', 'm', 'n', 'o'];

    useGameStore.getState().setCurrentLine(initialLine);
    useGameStore.getState().recordLineForPoint(1, false);

    useGameStore.getState().setCurrentLine(injuryLine);
    useGameStore.getState().recordLineForPoint(1, true, 'injury');

    useGameStore.getState().setCurrentLine(replacementLine);
    useGameStore.getState().recordLineForPoint(1, true, 'replacement');

    const { pointLines } = useGameStore.getState();
    expect(pointLines).toHaveLength(1);
    expect(pointLines[0]).toEqual(
      expect.objectContaining({
        pointNumber: 1,
        playerIds: replacementLine,
        isSubstitution: false,
      }),
    );

    const playingTime = computePlayingTime(pointLines);

    replacementLine.forEach((playerId) => {
      expect(playingTime.get(playerId)).toBe(1);
    });
    [...initialLine, 'h'].forEach((playerId) => {
      expect(playingTime.has(playerId)).toBe(false);
    });
  });

  it('corrects a completed live point without changing later point order', () => {
    const roster = ['a', 'b', 'c', 'd', 'e'].map(makePlayer);
    const originalPointLines = [
      { pointNumber: 1, playerIds: ['a', 'b'], timestamp: 1 },
      {
        pointNumber: 1,
        playerIds: ['a', 'c'],
        timestamp: 2,
        isSubstitution: true,
        substitutionType: 'injury' as const,
        subbedInPlayerIds: ['c'],
        subbedOutPlayerIds: ['b'],
      },
      { pointNumber: 2, playerIds: ['d', 'e'], timestamp: 3 },
    ];
    const savedGame: SavedGame = {
      id: 'current-game',
      schemaVersion: 6,
      createdAt: 1,
      team1: { id: 'team', name: 'Team', roster },
      team2Name: 'Opponent',
      team1Score: 2,
      team2Score: 0,
      events: [],
      gameTo: 15,
      startingPossession: 'team1',
      pointLines: originalPointLines,
    };
    useGameStore.setState({
      currentTeam: { id: 'team', name: 'Team', roster },
      currentGameId: savedGame.id,
      currentPoint: 3,
      pointLines: originalPointLines,
      savedGames: [savedGame],
    });

    expect(useGameStore.getState().replacePointLine(1, ['b', 'c'])).toBe(true);

    expect(useGameStore.getState().pointLines).toEqual([
      expect.objectContaining({
        pointNumber: 1,
        playerIds: ['b', 'c'],
        isSubstitution: false,
      }),
      { pointNumber: 2, playerIds: ['d', 'e'], timestamp: 3 },
    ]);
    expect(useGameStore.getState().savedGames[0].pointLines).toEqual(
      useGameStore.getState().pointLines,
    );
  });

  it('rejects edits to the live in-progress point', () => {
    const roster = ['a', 'b', 'c'].map(makePlayer);
    const pointLines = [{ pointNumber: 2, playerIds: ['a', 'b'], timestamp: 1 }];
    useGameStore.setState({
      currentTeam: { id: 'team', name: 'Team', roster },
      currentPoint: 2,
      pointLines,
    });

    expect(useGameStore.getState().replacePointLine(2, ['a', 'c'])).toBe(false);
    expect(useGameStore.getState().pointLines).toEqual(pointLines);
  });

  it('corrects a saved point and clears its substitution history', async () => {
    const roster = ['a', 'b', 'c', 'd'].map(makePlayer);
    const game: SavedGame = {
      id: 'saved-game',
      schemaVersion: 6,
      createdAt: 1,
      team1: { id: 'team', name: 'Team', roster },
      team2Name: 'Opponent',
      team1Score: 1,
      team2Score: 0,
      events: [
        {
          type: 'goal',
          team: 'team1',
          goalPlayerId: 'a',
          assistPlayerId: 'b',
          pointNumber: 1,
        },
      ],
      gameTo: 15,
      startingPossession: 'team1',
      pointLines: [
        { pointNumber: 1, playerIds: ['a', 'b'], timestamp: 1 },
        { pointNumber: 1, playerIds: ['a', 'c'], timestamp: 2, isSubstitution: true },
      ],
    };
    useGameStore.setState({
      currentTeam: game.team1,
      currentGameId: game.id,
      currentGameStatus: 'inProgress',
      currentPoint: 2,
      pointLines: game.pointLines,
      savedGames: [game],
    });

    await expect(
      useGameStore.getState().replaceSavedGamePointLine(game.id, 1, ['b', 'd']),
    ).resolves.toBe(true);

    expect(useGameStore.getState().savedGames[0].pointLines).toEqual([
      expect.objectContaining({
        pointNumber: 1,
        playerIds: ['b', 'd'],
        isSubstitution: false,
      }),
    ]);
    expect(useGameStore.getState().savedGames[0].events).toEqual(game.events);
    expect(useGameStore.getState().pointLines).toEqual([
      expect.objectContaining({
        pointNumber: 1,
        playerIds: ['b', 'd'],
        isSubstitution: false,
      }),
    ]);

    await useGameStore.getState().saveCurrentGame();

    expect(useGameStore.getState().savedGames[0].pointLines).toEqual([
      expect.objectContaining({
        pointNumber: 1,
        playerIds: ['b', 'd'],
        isSubstitution: false,
      }),
    ]);
  });

  it('does not mirror a live correction into an incompatible saved roster snapshot', () => {
    const liveRoster = ['a', 'b', 'c'].map(makePlayer);
    const savedRoster = ['a', 'b'].map(makePlayer);
    const pointLines = [{ pointNumber: 1, playerIds: ['a', 'b'], timestamp: 1 }];
    const game: SavedGame = {
      id: 'saved-game',
      schemaVersion: 6,
      createdAt: 1,
      team1: { id: 'team', name: 'Team', roster: savedRoster },
      team2Name: 'Opponent',
      team1Score: 1,
      team2Score: 0,
      events: [],
      gameTo: 15,
      startingPossession: 'team1',
      pointLines,
    };
    useGameStore.setState({
      currentTeam: { id: 'team', name: 'Team', roster: liveRoster },
      currentGameId: game.id,
      currentPoint: 2,
      pointLines,
      savedGames: [game],
    });

    expect(useGameStore.getState().replacePointLine(1, ['a', 'c'])).toBe(true);
    expect(useGameStore.getState().pointLines[0]?.playerIds).toEqual(['a', 'c']);
    expect(useGameStore.getState().savedGames[0].pointLines?.[0]?.playerIds).toEqual(['a', 'b']);
  });

  it('rejects a linked saved correction that is invalid for the live roster', async () => {
    const liveRoster = ['a', 'b'].map(makePlayer);
    const savedRoster = ['a', 'b', 'c'].map(makePlayer);
    const pointLines = [{ pointNumber: 1, playerIds: ['a', 'b'], timestamp: 1 }];
    const game: SavedGame = {
      id: 'saved-game',
      schemaVersion: 6,
      createdAt: 1,
      team1: { id: 'team', name: 'Team', roster: savedRoster },
      team2Name: 'Opponent',
      team1Score: 1,
      team2Score: 0,
      events: [],
      gameTo: 15,
      startingPossession: 'team1',
      pointLines,
    };
    useGameStore.setState({
      currentTeam: { id: 'team', name: 'Team', roster: liveRoster },
      currentGameId: game.id,
      currentPoint: 2,
      pointLines,
      savedGames: [game],
    });

    await expect(
      useGameStore.getState().replaceSavedGamePointLine(game.id, 1, ['a', 'c']),
    ).resolves.toBe(false);
    expect(useGameStore.getState().pointLines[0]?.playerIds).toEqual(['a', 'b']);
    expect(useGameStore.getState().savedGames[0].pointLines?.[0]?.playerIds).toEqual(['a', 'b']);
  });
});
