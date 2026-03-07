import { useGameStore } from '@/store/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

describe('line rollback after goal reversal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    mockedAsyncStorage.removeItem.mockResolvedValue(undefined);

    useGameStore.getState().resetGame();
    useLinePresetsStore.setState({
      presets: [],
      lineConfirmedForNextPoint: false,
    });
  });

  it('restores the previous current line when undoing a goal after setting the next line', () => {
    const pointOneLine = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const pointTwoLine = ['h', 'i', 'j', 'k', 'l', 'm', 'n'];

    useGameStore.getState().setCurrentLine(pointOneLine);
    useGameStore.getState().recordLineForPoint(1, false);

    useGameStore.getState().incrementScore(true);

    useGameStore.getState().setCurrentLine(pointTwoLine);
    useGameStore.getState().recordLineForPoint(2, false);
    useLinePresetsStore.getState().setLineConfirmedForNextPoint(true);

    const didUndo = useGameStore.getState().undoLastAction();
    const { currentLine, pointLines, currentPoint } = useGameStore.getState();

    expect(didUndo).toBe(true);
    expect(currentPoint).toBe(1);
    expect(currentLine).toEqual(pointOneLine);
    expect(pointLines).toHaveLength(1);
    expect(pointLines[0]).toEqual(
      expect.objectContaining({
        pointNumber: 1,
        playerIds: pointOneLine,
      }),
    );
    expect(useLinePresetsStore.getState().lineConfirmedForNextPoint).toBe(false);
  });

  it('restores the previous current line when canceling pending stat entry after setting the next line', () => {
    const pointOneLine = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const pointTwoLine = ['h', 'i', 'j', 'k', 'l', 'm', 'n'];

    useGameStore.getState().setCurrentLine(pointOneLine);
    useGameStore.getState().recordLineForPoint(1, false);
    useGameStore.getState().setStatTrackingEnabled(true);

    useGameStore.getState().incrementScore(true);

    useGameStore.getState().setCurrentLine(pointTwoLine);
    useGameStore.getState().recordLineForPoint(2, false);
    useLinePresetsStore.getState().setLineConfirmedForNextPoint(true);

    useGameStore.getState().cancelPendingGoal();

    const { currentLine, pointLines, currentPoint, team1Score } = useGameStore.getState();

    expect(currentPoint).toBe(1);
    expect(team1Score).toBe(0);
    expect(currentLine).toEqual(pointOneLine);
    expect(pointLines).toHaveLength(1);
    expect(pointLines[0]).toEqual(
      expect.objectContaining({
        pointNumber: 1,
        playerIds: pointOneLine,
      }),
    );
    expect(useLinePresetsStore.getState().lineConfirmedForNextPoint).toBe(false);
  });

  it('clears currentLine when undoing to a point with no recorded line', () => {
    const pointTwoLine = ['h', 'i', 'j', 'k', 'l', 'm', 'n'];

    useGameStore.getState().incrementScore(true);

    useGameStore.getState().setCurrentLine(pointTwoLine);
    useGameStore.getState().recordLineForPoint(2, false);
    useLinePresetsStore.getState().setLineConfirmedForNextPoint(true);

    const didUndo = useGameStore.getState().undoLastAction();
    const { currentLine, pointLines, currentPoint } = useGameStore.getState();

    expect(didUndo).toBe(true);
    expect(currentPoint).toBe(1);
    expect(currentLine).toEqual([]);
    expect(pointLines).toEqual([]);
    expect(useLinePresetsStore.getState().lineConfirmedForNextPoint).toBe(false);
  });

  it('restores the latest recorded line for the reverted point when multiple line records exist', () => {
    const pointOneOpeningLine = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const pointOneEditedLine = ['a', 'b', 'c', 'd', 'e', 'f', 'h'];
    const pointTwoLine = ['i', 'j', 'k', 'l', 'm', 'n', 'o'];

    useGameStore.getState().setCurrentLine(pointOneOpeningLine);
    useGameStore.getState().recordLineForPoint(1, false);

    useGameStore.getState().setCurrentLine(pointOneEditedLine);
    useGameStore.getState().recordLineForPoint(1, true, 'injury');

    useGameStore.getState().incrementScore(true);

    useGameStore.getState().setCurrentLine(pointTwoLine);
    useGameStore.getState().recordLineForPoint(2, false);
    useLinePresetsStore.getState().setLineConfirmedForNextPoint(true);

    const didUndo = useGameStore.getState().undoLastAction();
    const { currentLine, pointLines, currentPoint } = useGameStore.getState();

    expect(didUndo).toBe(true);
    expect(currentPoint).toBe(1);
    expect(currentLine).toEqual(pointOneEditedLine);
    expect(pointLines).toHaveLength(2);
    expect(pointLines[1]).toEqual(
      expect.objectContaining({
        pointNumber: 1,
        playerIds: pointOneEditedLine,
        isSubstitution: true,
        substitutionType: 'injury',
      }),
    );
    expect(useLinePresetsStore.getState().lineConfirmedForNextPoint).toBe(false);
  });
});
