import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking, Platform } from 'react-native';

import DashboardScreen from '@/app/(main)/(hub)/(home)/dashboard';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/constants';
import { LAST_DISMISSED_REMOTE_VERSION_KEY } from '@/lib/remoteVersionUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';
import { useGameSessionStore } from '@/store/gameSessionStore';
import { useTutorialStore } from '@/store/tutorialStore';
import { arrangeAdvancedGame, createSavedBasicGame, testTeam } from '@/test/fixtures/domain';
import { resetDashboardStores } from '@/test/fixtures/resetStores';
import { resetMockRouter } from '@/test/mocks/expoRouter';
import { createTestQueryClient, renderScreen } from '@/test/render';

function arrangeDashboard() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(['remoteVersion'], {
    hasUpdate: false,
    latestVersion: null,
  });
  useGameStore.setState({
    currentTeam: { id: 'team-1', name: 'Windchill', roster: [] },
    team2Name: 'Opponent',
    statTrackingEnabled: true,
  });
  return queryClient;
}

describe('<DashboardScreen />', () => {
  beforeEach(async () => {
    resetDashboardStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  it('derives the idle dashboard from the real stores and query hooks', async () => {
    await renderScreen(<DashboardScreen />, { queryClient: arrangeDashboard() });

    expect(screen.getByText('DASHBOARD')).toBeVisible();
    expect(screen.getByText('Windchill')).toBeVisible();
    expect(screen.getByText('Start game')).toBeVisible();
    expect(screen.getByText('Roster')).toBeVisible();
    expect(screen.queryByText('Resume game')).not.toBeOnTheScreen();
  });

  it('opens the real new-game sheet and starts a basic game through real actions', async () => {
    const user = userEvent.setup();
    await renderScreen(<DashboardScreen />, { queryClient: arrangeDashboard() });

    await user.press(screen.getByText('Start game'));

    expect(screen.getByText('Basic Scoreboard')).toBeVisible();
    expect(screen.getByText('Advanced Tracker')).toBeVisible();

    await user.press(screen.getByText('Basic Scoreboard'));

    expect(useGameSessionStore.getState().activeGameType).toBe('basic');
    expect(useGameStore.getState().currentGameStatus).toBe('fresh');
    expect(router.replace).toHaveBeenCalledWith('/pre-game-confirm');
  });

  it('starts advanced setup directly for an existing user with no advanced tutorial flag', async () => {
    const user = userEvent.setup();
    useTutorialStore.setState({ hasSeenOnboarding: true, hasSeenAdvancedTutorial: false });
    await renderScreen(<DashboardScreen />, { queryClient: arrangeDashboard() });

    await user.press(screen.getByText('Start game'));
    await user.press(screen.getByText('Advanced Tracker'));

    expect(useGameSessionStore.getState().activeGameType).toBe('advanced');
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/advanced-tracking/pre-game-confirm',
      params: {},
    });
  });

  it('derives and resumes an active basic session', async () => {
    const user = userEvent.setup();
    useGameSessionStore.getState().setActiveGameType('basic');
    useGameStore.setState({
      currentGameStatus: 'inProgress',
      currentGameId: 'game-1',
    });
    await renderScreen(<DashboardScreen />, { queryClient: arrangeDashboard() });

    expect(screen.getByTestId('dashboard-live-game')).toBeVisible();
    expect(screen.getByText('Point 1')).toBeVisible();
    expect(screen.queryByText('Start game')).not.toBeOnTheScreen();

    await user.press(screen.getByText('Live game stats'));
    expect(router.push).toHaveBeenCalledWith('/live-stats');

    await user.press(screen.getByText('Resume game'));

    expect(router.navigate).toHaveBeenCalledWith('/scoreboard');
  });

  it.each(['header-action-settings', 'dashboard-settings-button'])(
    'routes to settings from %s',
    async (testID) => {
      const user = userEvent.setup();
      await renderScreen(<DashboardScreen />, { queryClient: arrangeDashboard() });

      await user.press(screen.getByTestId(testID));

      expect(router.push).toHaveBeenCalledWith('/settings');
    },
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('opens roster and help destinations when a roster exists', async () => {
  const queryClient = arrangeDashboard();
  useGameStore.setState({ currentTeam: testTeam });
  const user = userEvent.setup();
  await renderScreen(<DashboardScreen />, { queryClient });
  const destinations = [
    ['Lines', '/line-preset-editor'],
    ['Showcase', '/showcase'],
    ['Partners', '/partners'],
    ['Help', '/help'],
    ['About', '/about'],
  ] as const;
  for (const [label, route] of destinations) {
    await user.press(screen.getByRole('button', { name: label }));
    expect(router.push).toHaveBeenLastCalledWith(route);
  }
  await user.press(screen.getByRole('button', { name: 'Roster' }));
  expect(router.push).toHaveBeenLastCalledWith({
    pathname: '/edit-roster',
    params: { teamName: testTeam.name },
  });
});

it('resumes advanced line setup and starts a scrimmage after warning about the active game', async () => {
  const queryClient = arrangeDashboard();
  arrangeAdvancedGame();
  const user = userEvent.setup();
  await renderScreen(<DashboardScreen />, { queryClient });
  expect(screen.queryByText('Live game stats')).not.toBeOnTheScreen();
  await user.press(screen.getByText('Resume game'));
  expect(router.dismissTo).toHaveBeenCalledWith('/advanced-tracking/tracker-line-select');
  await user.press(screen.getByText('Start a new game'));
  expect(screen.getByText('This will clear the current in-progress game')).toBeVisible();
  await user.press(screen.getByText('Scrimmage'));
  expect(useAdvancedTrackingStore.getState().currentGame).toBeNull();
  expect(router.replace).toHaveBeenCalledWith({
    pathname: '/advanced-tracking/pre-game-confirm',
    params: { gameType: 'scrimmage' },
  });
});

it('opens saved games in the Stats tab', async () => {
  const user = userEvent.setup();
  await renderScreen(<DashboardScreen />, { queryClient: arrangeDashboard() });
  await user.press(screen.getByRole('button', { name: 'Saved games' }));
  expect(router.navigate).toHaveBeenLastCalledWith('/stats');
});

it('opens the last saved game from the dashboard', async () => {
  const queryClient = arrangeDashboard();
  useGameStore.setState({
    savedTeams: [testTeam],
    savedGames: [
      { ...createSavedBasicGame(), id: 'older', team2Name: 'Falcons', createdAt: 1000 },
      { ...createSavedBasicGame(), id: 'newest', team2Name: 'Eagles', createdAt: 2000 },
    ],
  });
  await renderScreen(<DashboardScreen />, { queryClient });
  expect(screen.queryByText('Falcons')).not.toBeOnTheScreen();
  await userEvent.setup().press(screen.getByText('Eagles'));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/saved-games/[gameId]',
    params: { gameId: 'newest', from: 'dashboard' },
  });
});

it('hides the last game while a game is live', async () => {
  const queryClient = arrangeDashboard();
  useGameStore.setState({ savedTeams: [testTeam], savedGames: [createSavedBasicGame()] });
  arrangeAdvancedGame();
  await renderScreen(<DashboardScreen />, { queryClient });
  expect(screen.queryByText('Last game')).not.toBeOnTheScreen();
});

it.each(['ios', 'android'] as const)(
  'opens the %s app store and acknowledges the remote update',
  async (platform) => {
    jest.replaceProperty(Platform, 'OS', platform);
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const queryClient = arrangeDashboard();
    queryClient.setQueryData(['remoteVersion'], { hasUpdate: true, latestVersion: '2.0.0' });
    const user = userEvent.setup();
    await renderScreen(<DashboardScreen />, { queryClient });
    await user.press(screen.getByText('New Version Available'));
    expect(openUrl).toHaveBeenCalledWith(platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL);
    expect(await AsyncStorage.getItem(LAST_DISMISSED_REMOTE_VERSION_KEY)).toBe('2.0.0');
    expect(screen.queryByText('New Version Available')).not.toBeOnTheScreen();
  },
);
