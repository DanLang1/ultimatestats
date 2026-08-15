import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import DashboardScreen from '@/app/(main)/(hub)/(home)/Dashboard';
import { useGameStore } from '@/store/basic/gameStore';
import { useGameSessionStore } from '@/store/gameSessionStore';
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
    expect(router.replace).toHaveBeenCalledWith('/PreGameConfirm');
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

    expect(router.navigate).toHaveBeenCalledWith('/Scoreboard');
  });

  it('routes to settings from a user press', async () => {
    const user = userEvent.setup();
    await renderScreen(<DashboardScreen />, { queryClient: arrangeDashboard() });

    await user.press(screen.getByText('App Settings'));

    expect(router.push).toHaveBeenCalledWith('/Settings');
  });
});
