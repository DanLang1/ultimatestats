import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import EditRosterScreen from '@/app/(main)/(hub)/(team)/EditRoster';
import * as layout from '@/hooks/useLayout';
import { useGameStore } from '@/store/basic/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { testTeam } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

describe('<EditRosterScreen />', () => {
  beforeEach(async () => {
    resetAllStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('waits for native actions dismissal before opening the team switcher', async () => {
    jest.spyOn(layout, 'useLayout').mockReturnValue({
      width: 390,
      height: 844,
      isLandscape: false,
      sizeClass: 'small',
    });
    const user = userEvent.setup();
    useGameStore.setState({
      currentTeam: testTeam,
      savedTeams: [testTeam, { id: 'other-team', name: 'Other Team', roster: [] }],
    });
    await renderScreen(<EditRosterScreen />);
    await user.press(screen.getByTestId('roster-actions-button'));
    const actionsModal = screen.getByTestId('team-actions-modal');

    await user.press(screen.getByTestId('team-actions-switch'));
    expect(router.push).not.toHaveBeenCalled();

    await act(() => actionsModal.props.onDismiss());
    expect(router.push).toHaveBeenCalledWith('/TeamManagementModal');
    await act(() => actionsModal.props.onDismiss());
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('renders the roster route from the real current team', async () => {
    useGameStore.setState({ currentTeam: testTeam });

    await renderScreen(<EditRosterScreen />);

    expect(screen.getByText('WINDCHILL')).toBeVisible();
    expect(screen.getByPlaceholderText('Add player...')).toBeVisible();
    expect(screen.getByText('Alex')).toBeVisible();
    expect(screen.getByText('Blair')).toBeVisible();
  });

  it('offers USAU import from the empty roster state', async () => {
    const user = userEvent.setup();
    useGameStore.setState({ currentTeam: { ...testTeam, roster: [] } });

    await renderScreen(<EditRosterScreen />);

    expect(screen.getByTestId('empty-roster-import-usau')).toBeVisible();
    await user.press(screen.getByTestId('empty-roster-import-usau'));

    expect(router.push).toHaveBeenCalledWith('/ImportTeam');
  });

  it('loads a sample team from the empty roster state', async () => {
    const user = userEvent.setup();
    useGameStore.setState({ currentTeam: { ...testTeam, roster: [] } });
    useLinePresetsStore.setState({
      presets: [
        {
          id: 'current-team-preset',
          name: 'Current team line',
          playerIds: ['old-player'],
          teamId: testTeam.id,
        },
        {
          id: 'other-team-preset',
          name: 'Other team line',
          playerIds: ['other-player'],
          teamId: 'other-team',
        },
      ],
    });

    await renderScreen(<EditRosterScreen />);
    await user.press(screen.getByTestId('empty-roster-load-test-team'));

    expect(useGameStore.getState().currentTeam.name).toBe('Windchill');
    expect(useLinePresetsStore.getState().presets).toEqual([
      {
        id: 'other-team-preset',
        name: 'Other team line',
        playerIds: ['other-player'],
        teamId: 'other-team',
      },
    ]);
    expect(useGameStore.getState().currentTeam.roster).toHaveLength(14);
    expect(useGameStore.getState().currentTeam.roster.map((player) => player.name)).toEqual([
      'Kelly',
      'Rachel',
      'Jules',
      'Harper',
      'Erin',
      'Taylor',
      'Morgan',
      'Mark',
      'Jerry',
      'Frank',
      'Joe',
      'Bryan',
      'Alex',
      'Sam',
    ]);
    expect(
      useGameStore.getState().currentTeam.roster.filter((player) => player.matchingType === 'fmp'),
    ).toHaveLength(7);
    expect(
      useGameStore.getState().currentTeam.roster.filter((player) => player.matchingType === 'mmp'),
    ).toHaveLength(7);
  });
});
