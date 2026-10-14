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
    expect(screen.getByText('Open a fresh scoreboard and start tracking')).toBeVisible();
    expect(screen.getByText('Manage Team')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Saved Games' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Aggregate Stats' })).toBeDisabled();
    expect(screen.queryByText('Resume Game')).not.toBeOnTheScreen();
  });

  it('opens the real new-game sheet and starts a basic game through real actions', async () => {
    const user = userEvent.setup();
    await renderScreen(<DashboardScreen />, { queryClient: arrangeDashboard() });

    await user.press(screen.getByText('New Game'));

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

    await user.press(screen.getByText('New Game'));
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

    expect(screen.getByText('IN PROGRESS')).toBeVisible();
    expect(screen.getByText('Return to the live scoreboard')).toBeVisible();
    expect(screen.getByText('Game Timeline')).toBeVisible();
    expect(screen.getByText('View Stats')).toBeVisible();

    await user.press(screen.getByText('Resume Game'));

    expect(router.navigate).toHaveBeenCalledWith('/scoreboard');
  });

  it('routes to settings from a user press', async () => {
    const user = userEvent.setup();
    await renderScreen(<DashboardScreen />, { queryClient: arrangeDashboard() });

    await user.press(screen.getByText('App Settings'));

    expect(router.push).toHaveBeenCalledWith('/settings');
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('opens data, roster, and help destinations when saved games and a roster exist', async () => {
  const queryClient = arrangeDashboard();
  useGameStore.setState({ currentTeam: testTeam, savedGames: [createSavedBasicGame()] });
  const user = userEvent.setup();
  await renderScreen(<DashboardScreen />, { queryClient });
  const destinations = [
    ['Saved Games', '/saved-game-stats'],
    ['Aggregate Stats', '/aggregate-stats'],
    ['Team Line Presets', '/line-preset-editor'],
    ['Showcase (Beta)', '/showcase'],
    ['Partners', '/partners'],
    ['Help', '/help'],
    ['About', '/about'],
  ] as const;
  for (const [label, route] of destinations) {
    await user.press(screen.getByRole('button', { name: label }));
    expect(router.push).toHaveBeenLastCalledWith(route);
  }
  await user.press(screen.getByRole('button', { name: 'Manage Team' }));
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
  expect(screen.queryByText('Game Timeline')).not.toBeOnTheScreen();
  await user.press(screen.getByText('Resume Game'));
  expect(router.navigate).toHaveBeenCalledWith('/advanced-tracking/tracker-line-select');
  await user.press(screen.getByText('New Game'));
  expect(screen.getByText('This will clear the current in-progress game')).toBeVisible();
  await user.press(screen.getByText('Scrimmage'));
  expect(useAdvancedTrackingStore.getState().currentGame).toBeNull();
  expect(router.replace).toHaveBeenCalledWith({
    pathname: '/advanced-tracking/pre-game-confirm',
    params: { gameType: 'scrimmage' },
  });
});

it('offers review actions for a completed game after its active session is cleared', async () => {
  const queryClient = arrangeDashboard();
  useGameStore.setState({ currentGameStatus: 'finished', team1Score: 15, team2Score: 12 });
  const user = userEvent.setup();
  await renderScreen(<DashboardScreen />, { queryClient });
  expect(screen.getByText('LAST COMPLETED GAME')).toBeVisible();
  expect(screen.queryByText('Resume Game')).not.toBeOnTheScreen();
  await user.press(screen.getByText('View Stats'));
  expect(router.push).toHaveBeenLastCalledWith('/view-stats');
  await user.press(screen.getByText('Game Timeline'));
  expect(router.push).toHaveBeenLastCalledWith('/game-timeline');
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
