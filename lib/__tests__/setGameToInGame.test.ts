import { useGameStore } from '@/store/basic/gameStore';
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

describe('setGameToInGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    mockedAsyncStorage.removeItem.mockResolvedValue(undefined);

    const { setAutoHalftimeEnabled, setGameTo, resetGame } = useGameStore.getState();
    setAutoHalftimeEnabled(true);
    setGameTo(15);
    resetGame();
  });

  it('updates gameTo and baseGameTo in the first half when soft cap is inactive', () => {
    useGameStore.setState({
      team1Score: 5,
      team2Score: 4,
      gameHalf: 1,
      isSoftCap: false,
      softCapPending: false,
      autoHalftimeEnabled: true,
    });

    useGameStore.getState().setGameToInGame(11);

    const { gameTo, baseGameTo } = useGameStore.getState();
    expect(gameTo).toBe(11);
    expect(baseGameTo).toBe(11);
  });

  it('does nothing in the second half', () => {
    useGameStore.setState({
      team1Score: 5,
      team2Score: 4,
      gameHalf: 2,
      gameTo: 15,
      baseGameTo: 15,
    });

    useGameStore.getState().setGameToInGame(17);

    const { gameTo, baseGameTo } = useGameStore.getState();
    expect(gameTo).toBe(15);
    expect(baseGameTo).toBe(15);
  });

  it('does nothing when soft cap is already active', () => {
    useGameStore.setState({
      team1Score: 10,
      team2Score: 9,
      isSoftCap: true,
      softCapPending: false,
      gameTo: 15,
      baseGameTo: 15,
    });

    useGameStore.getState().setGameToInGame(21);

    const { gameTo, baseGameTo } = useGameStore.getState();
    expect(gameTo).toBe(15);
    expect(baseGameTo).toBe(15);
  });

  it('does nothing when soft cap is pending', () => {
    useGameStore.setState({
      team1Score: 10,
      team2Score: 9,
      isSoftCap: false,
      softCapPending: true,
      gameTo: 15,
      baseGameTo: 15,
    });

    useGameStore.getState().setGameToInGame(21);

    const { gameTo, baseGameTo } = useGameStore.getState();
    expect(gameTo).toBe(15);
    expect(baseGameTo).toBe(15);
  });

  it('does nothing when auto halftime is on and the value is below the minimum', () => {
    useGameStore.setState({
      team1Score: 5,
      team2Score: 4,
      autoHalftimeEnabled: true,
      gameTo: 15,
      baseGameTo: 15,
    });

    useGameStore.getState().setGameToInGame(10);

    const { gameTo, baseGameTo } = useGameStore.getState();
    expect(gameTo).toBe(15);
    expect(baseGameTo).toBe(15);
  });

  it('updates both values when auto halftime is on and the value is at the minimum', () => {
    useGameStore.setState({
      team1Score: 5,
      team2Score: 4,
      autoHalftimeEnabled: true,
    });

    useGameStore.getState().setGameToInGame(11);

    const { gameTo, baseGameTo } = useGameStore.getState();
    expect(gameTo).toBe(11);
    expect(baseGameTo).toBe(11);
  });

  it('does nothing when auto halftime is off and the value would immediately end the game', () => {
    useGameStore.setState({
      team1Score: 8,
      team2Score: 7,
      autoHalftimeEnabled: false,
      gameTo: 15,
      baseGameTo: 15,
    });

    useGameStore.getState().setGameToInGame(8);

    const { gameTo, baseGameTo } = useGameStore.getState();
    expect(gameTo).toBe(15);
    expect(baseGameTo).toBe(15);
  });

  it('updates both values when auto halftime is off and the value is above the max score', () => {
    useGameStore.setState({
      team1Score: 8,
      team2Score: 7,
      autoHalftimeEnabled: false,
    });

    useGameStore.getState().setGameToInGame(9);

    const { gameTo, baseGameTo } = useGameStore.getState();
    expect(gameTo).toBe(9);
    expect(baseGameTo).toBe(9);
  });

  it('restores the edited baseGameTo after undoing a later soft-cap goal', () => {
    useGameStore.setState({
      team1Score: 10,
      team2Score: 10,
      autoHalftimeEnabled: false,
      gameTo: 15,
      baseGameTo: 15,
      softCapPending: false,
      isSoftCap: false,
      timerTimeLeft: 90 * 60,
    });

    useGameStore.getState().setGameToInGame(17);
    useGameStore.setState({ softCapPending: true });

    useGameStore.getState().incrementScore(true);

    expect(useGameStore.getState().gameTo).toBe(12);
    expect(useGameStore.getState().baseGameTo).toBe(17);

    const didUndo = useGameStore.getState().undoLastAction();

    expect(didUndo).toBe(true);
    expect(useGameStore.getState().gameTo).toBe(17);
    expect(useGameStore.getState().baseGameTo).toBe(17);
  });
});
