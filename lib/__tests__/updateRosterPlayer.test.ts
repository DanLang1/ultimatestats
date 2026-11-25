import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearRoster, updateRosterPlayer } from '@/lib/rosterActions';
import { SavedTeam } from '@/lib/storage/types';
import { useGameStore } from '@/store/basic/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { getCurrentTeam, useTeamStore } from '@/store/teamStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  // The team store reads storage while this module loads, before beforeEach configures the mock.
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('updateRosterPlayer inactive guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    mockedAsyncStorage.removeItem.mockResolvedValue(undefined);

    useGameStore.getState().resetGame();
    useLinePresetsStore.setState({ presets: [] });

    const team: SavedTeam = {
      id: 'team-1',
      name: 'Test Team',
      roster: [
        { id: 'a', name: 'Alice', isActive: true, matchingType: null, role: null },
        { id: 'b', name: 'Bea', isActive: true, matchingType: null, role: null },
      ],
    };
    useTeamStore.setState({ teams: [team], currentTeamId: team.id });
    useGameStore.setState({ events: [], pointLines: [] });
  });

  it('allows deactivating a player who has not participated and removes them from presets', () => {
    useLinePresetsStore.setState({
      presets: [{ id: 'preset-1', name: 'O-Line', playerIds: ['a', 'b'], teamId: 'team-1' }],
    });

    const { result } = updateRosterPlayer('a', { isActive: false });

    expect(result).toBe('updated');
    expect(getCurrentTeam().roster.find((player) => player.id === 'a')?.isActive).toBe(false);
    expect(useLinePresetsStore.getState().presets[0]?.playerIds).toEqual(['b']);
  });

  it('blocks deactivation when the player has already appeared in a recorded point line', () => {
    useLinePresetsStore.setState({
      presets: [{ id: 'preset-1', name: 'O-Line', playerIds: ['a', 'b'], teamId: 'team-1' }],
    });
    useGameStore.setState({
      pointLines: [{ pointNumber: 1, playerIds: ['a', 'b'], timestamp: 1000 }],
    });

    const { result } = updateRosterPlayer('a', { isActive: false });

    expect(result).toBe('blocked-current-game-participation');
    expect(getCurrentTeam().roster.find((player) => player.id === 'a')?.isActive).toBe(true);
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

    const { result } = updateRosterPlayer('a', { isActive: false });

    expect(result).toBe('blocked-current-game-participation');
    expect(getCurrentTeam().roster.find((player) => player.id === 'a')?.isActive).toBe(true);
  });
});

describe('clearRoster', () => {
  beforeEach(() => {
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    useGameStore.getState().resetGame();
  });

  it("empties the roster, drops only this team's presets, and clears basic game events", () => {
    const team: SavedTeam = {
      id: 'team-1',
      name: 'Test Team',
      roster: [{ id: 'a', name: 'Alice', isActive: true, matchingType: null, role: null }],
    };
    useTeamStore.setState({ teams: [team], currentTeamId: team.id });
    useLinePresetsStore.setState({
      presets: [
        { id: 'preset-1', name: 'O-Line', playerIds: ['a'], teamId: 'team-1' },
        { id: 'preset-2', name: 'Other', playerIds: ['z'], teamId: 'team-2' },
      ],
    });
    useGameStore.setState({
      events: [{ type: 'goal', team: 'team1', goalPlayerId: 'a', assistPlayerId: null }],
    });

    clearRoster();

    expect(getCurrentTeam().roster).toEqual([]);
    expect(useLinePresetsStore.getState().presets.map((preset) => preset.id)).toEqual(['preset-2']);
    expect(useGameStore.getState().events).toEqual([]);
  });
});
