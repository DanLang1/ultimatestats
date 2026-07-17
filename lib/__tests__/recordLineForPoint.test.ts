import AsyncStorage from '@react-native-async-storage/async-storage';

import { computePlayingTime } from '@/lib/lineUtils';
import { useGameStore } from '@/store/basic/gameStore';

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

describe('recordLineForPoint replacement handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    mockedAsyncStorage.removeItem.mockResolvedValue(undefined);

    useGameStore.getState().resetGame();
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
});
