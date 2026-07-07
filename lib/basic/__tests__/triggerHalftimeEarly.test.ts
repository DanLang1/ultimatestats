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

describe('triggerHalftimeEarly', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    mockedAsyncStorage.removeItem.mockResolvedValue(undefined);

    const state = useGameStore.getState();
    state.resetGame();
    state.setAutoHalftimeEnabled(true);
    state.setStatTrackingEnabled(false);
  });

  it('marks the last goal as halftime and applies halftime state', () => {
    const state = useGameStore.getState();

    state.setStatTrackingEnabled(true);
    state.setPossession('team1');
    state.incrementScore(true);
    state.toggleTimeout(true, 0);
    state.undoLastAction();

    const didTrigger = state.triggerHalftimeEarly();
    const updatedState = useGameStore.getState();
    const lastEvent = updatedState.events[updatedState.events.length - 1];

    expect(didTrigger).toBe(true);
    expect(updatedState.gameHalf).toBe(2);
    expect(updatedState.isHalftimeBreak).toBe(true);
    expect(updatedState.team1Timeouts).toEqual([true, true]);
    expect(updatedState.team2Timeouts).toEqual([true, true]);
    expect(updatedState.possession).toBe('team2');
    expect(lastEvent).toMatchObject({ type: 'goal', triggeredHalftime: true });
  });

  it('does nothing when auto halftime is disabled', () => {
    const state = useGameStore.getState();

    state.incrementScore(true);
    state.setAutoHalftimeEnabled(false);

    const didTrigger = state.triggerHalftimeEarly();
    const updatedState = useGameStore.getState();

    expect(didTrigger).toBe(false);
    expect(updatedState.gameHalf).toBe(1);
    expect(updatedState.isHalftimeBreak).toBe(false);
    expect(updatedState.events[0]).toMatchObject({ type: 'goal' });
    expect(updatedState.events[0]).not.toHaveProperty('triggeredHalftime');
  });

  it('does nothing when the last event is not a goal', () => {
    const state = useGameStore.getState();

    state.setStatTrackingEnabled(true);
    state.setPossession('team1');
    state.incrementScore(true);
    state.toggleTimeout(true, 0);

    const didTrigger = state.triggerHalftimeEarly();
    const updatedState = useGameStore.getState();

    expect(didTrigger).toBe(false);
    expect(updatedState.gameHalf).toBe(1);
    expect(updatedState.isHalftimeBreak).toBe(false);
    expect(updatedState.events[0]).toMatchObject({ type: 'goal' });
    expect(updatedState.events[0]).not.toHaveProperty('triggeredHalftime');
  });

  it('does nothing in the second half', () => {
    const state = useGameStore.getState();

    state.incrementScore(true);
    useGameStore.setState({ gameHalf: 2 });

    const didTrigger = state.triggerHalftimeEarly();
    const updatedState = useGameStore.getState();

    expect(didTrigger).toBe(false);
    expect(updatedState.gameHalf).toBe(2);
    expect(updatedState.isHalftimeBreak).toBe(false);
    expect(updatedState.events[0]).not.toHaveProperty('triggeredHalftime');
  });

  it('does nothing when halftime has already been reached', () => {
    const state = useGameStore.getState();

    state.incrementScore(true);
    useGameStore.setState({
      events: [
        {
          type: 'goal',
          team: 'team1',
          goalPlayerId: null,
          assistPlayerId: null,
          pointNumber: 1,
          triggeredHalftime: true,
        },
      ],
    });

    const didTrigger = state.triggerHalftimeEarly();
    const updatedState = useGameStore.getState();

    expect(didTrigger).toBe(false);
    expect(updatedState.gameHalf).toBe(1);
    expect(updatedState.isHalftimeBreak).toBe(false);
    expect(updatedState.events).toHaveLength(1);
    expect(updatedState.events[0]).toMatchObject({ triggeredHalftime: true });
  });

  it('does nothing when the game is already over', () => {
    const state = useGameStore.getState();

    useGameStore.setState({
      team1Score: 15,
      team2Score: 13,
      gameTo: 15,
      timerTimeLeft: 90 * 60,
      events: [
        {
          type: 'goal',
          team: 'team1',
          goalPlayerId: null,
          assistPlayerId: null,
          pointNumber: 28,
        },
      ],
    });

    const didTrigger = state.triggerHalftimeEarly();
    const updatedState = useGameStore.getState();

    expect(didTrigger).toBe(false);
    expect(updatedState.gameHalf).toBe(1);
    expect(updatedState.isHalftimeBreak).toBe(false);
    expect(updatedState.events[0]).not.toHaveProperty('triggeredHalftime');
  });

  it('flips possession to team1 when startingPossession is team2', () => {
    const state = useGameStore.getState();

    state.setStatTrackingEnabled(true);
    state.setPossession('team2');
    state.incrementScore(false);

    const didTrigger = state.triggerHalftimeEarly();
    const updatedState = useGameStore.getState();

    expect(didTrigger).toBe(true);
    expect(updatedState.possession).toBe('team1');
  });

  it('clears any in-progress point timer when halftime starts early', () => {
    const state = useGameStore.getState();

    state.setStatTrackingEnabled(true);
    state.setPointTimerEnabled(true);
    state.setPossession('team1');
    state.startPoint();
    state.incrementScore(true);
    state.startPoint();

    expect(useGameStore.getState().currentPointStartTime).not.toBeNull();

    const didTrigger = state.triggerHalftimeEarly();
    const updatedState = useGameStore.getState();

    expect(didTrigger).toBe(true);
    expect(updatedState.currentPointStartTime).toBeNull();
    expect(updatedState.pointTimerPausedElapsed).toBeNull();
    expect(updatedState.isHalftimeBreak).toBe(true);
  });

  it('undoes halftime state by undoing the marked goal', () => {
    const state = useGameStore.getState();

    state.setStatTrackingEnabled(true);
    state.setPossession('team1');
    state.incrementScore(true);
    state.triggerHalftimeEarly();

    const didUndo = state.undoLastAction();
    const updatedState = useGameStore.getState();

    expect(didUndo).toBe(true);
    expect(updatedState.team1Score).toBe(0);
    expect(updatedState.gameHalf).toBe(1);
    expect(updatedState.isHalftimeBreak).toBe(false);
    expect(updatedState.team1Timeouts).toEqual([true, true]);
    expect(updatedState.team2Timeouts).toEqual([true, true]);
    expect(updatedState.events).toEqual([]);
  });
});
