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

describe('updateRosterPlayer inactive guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    mockedAsyncStorage.removeItem.mockResolvedValue(undefined);

    useGameStore.getState().resetGame();
    useLinePresetsStore.setState({ presets: [], lineConfirmedForNextPoint: false });

    useGameStore.setState({
      currentTeam: {
        id: 'team-1',
        name: 'Test Team',
        roster: [
          { id: 'a', name: 'Alice', isActive: true, matchingType: null, role: null },
          { id: 'b', name: 'Bea', isActive: true, matchingType: null, role: null },
        ],
      },
      events: [],
      pointLines: [],
    });
  });

  it('allows deactivating a player who has not participated and removes them from presets', () => {
    useLinePresetsStore.setState({
      presets: [{ id: 'preset-1', name: 'O-Line', playerIds: ['a', 'b'], teamId: 'team-1' }],
      lineConfirmedForNextPoint: false,
    });

    const result = useGameStore.getState().updateRosterPlayer('a', { isActive: false });

    expect(result).toBe('updated');
    expect(
      useGameStore.getState().currentTeam.roster.find((player) => player.id === 'a')?.isActive,
    ).toBe(false);
    expect(useLinePresetsStore.getState().presets[0]?.playerIds).toEqual(['b']);
  });

  it('blocks deactivation when the player has already appeared in a recorded point line', () => {
    useLinePresetsStore.setState({
      presets: [{ id: 'preset-1', name: 'O-Line', playerIds: ['a', 'b'], teamId: 'team-1' }],
      lineConfirmedForNextPoint: false,
    });
    useGameStore.setState({
      pointLines: [{ pointNumber: 1, playerIds: ['a', 'b'], timestamp: 1000 }],
    });

    const result = useGameStore.getState().updateRosterPlayer('a', { isActive: false });

    expect(result).toBe('blocked-current-game-participation');
    expect(
      useGameStore.getState().currentTeam.roster.find((player) => player.id === 'a')?.isActive,
    ).toBe(true);
    expect(useLinePresetsStore.getState().presets[0]?.playerIds).toEqual(['a', 'b']);
  });

  it('blocks deactivation when the player only appears in current-game stat events', () => {
    useGameStore.setState({
      events: [
        {
          type: 'goal',
          team: 'team1',
          goalPlayerId: 'a',
          assistPlayerId: null,
        },
      ],
    });

    const result = useGameStore.getState().updateRosterPlayer('a', { isActive: false });

    expect(result).toBe('blocked-current-game-participation');
    expect(
      useGameStore.getState().currentTeam.roster.find((player) => player.id === 'a')?.isActive,
    ).toBe(true);
  });
});
