import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  finishActiveGameSession,
  restoreAdvancedGameSession,
  restoreBasicGameSession,
  startAdvancedGameSession,
  startBasicGameSession,
} from '@/hooks/useGameSessionActions';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/gameStore';
import { useGameSessionStore } from '@/store/gameSessionStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@/lib/advancedTracking/storage', () => ({
  deleteAdvancedGameRecord: jest.fn().mockResolvedValue(undefined),
  loadAdvancedGame: jest.fn().mockResolvedValue(null),
  loadAdvancedGames: jest.fn().mockResolvedValue([]),
  loadAdvancedGameSummaries: jest.fn().mockResolvedValue([]),
  upsertAdvancedGame: jest.fn().mockResolvedValue({
    id: 'advanced-game',
    schemaVersion: 1,
    createdAt: 0,
    updatedAt: 0,
    playedAt: null,
    sortTimestamp: 0,
    status: 'in_progress',
    gameType: 'game',
    focusSideId: 'home',
    focusSourceTeamId: null,
    myTeamName: 'Home',
    opponentName: 'Away',
    myScore: 0,
    opponentScore: 0,
    pointsTracked: 0,
  }),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: <T>(options: { ios?: T; android?: T; default?: T }) => options.ios ?? options.default,
  },
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

function resetStores() {
  useGameSessionStore.setState({ activeGameType: null });
  useAdvancedTrackingStore.setState({
    currentGameId: null,
    currentGame: null,
    undoStack: [],
    isHalftimeBreakActive: false,
  });
  useGameStore.getState().resetGame();
}

describe('game session actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    mockedAsyncStorage.removeItem.mockResolvedValue(undefined);
    resetStores();
  });

  it('starts a basic session and clears advanced draft state', () => {
    useAdvancedTrackingStore.setState({
      currentGameId: 'advanced-game',
      currentGame: { id: 'advanced-game', status: 'in_progress', points: [] } as never,
    });
    useGameStore.setState({ team1Score: 4, currentGameStatus: 'inProgress' });

    startBasicGameSession();

    expect(useGameSessionStore.getState().activeGameType).toBe('basic');
    expect(useAdvancedTrackingStore.getState().currentGameId).toBeNull();
    expect(useAdvancedTrackingStore.getState().currentGame).toBeNull();
    expect(useGameStore.getState().team1Score).toBe(0);
    expect(useGameStore.getState().currentGameStatus).toBe('fresh');
  });

  it('starts an advanced session and clears basic game state', () => {
    useGameStore.setState({ team1Score: 3, currentGameStatus: 'inProgress' });

    startAdvancedGameSession();

    expect(useGameSessionStore.getState().activeGameType).toBe('advanced');
    expect(useGameStore.getState().team1Score).toBe(0);
    expect(useGameStore.getState().currentGameStatus).toBe('fresh');
  });

  it('clears and restores active session type for game complete undo flows', () => {
    restoreBasicGameSession();
    expect(useGameSessionStore.getState().activeGameType).toBe('basic');

    finishActiveGameSession();
    expect(useGameSessionStore.getState().activeGameType).toBeNull();

    restoreAdvancedGameSession();
    expect(useGameSessionStore.getState().activeGameType).toBe('advanced');
  });
});
