import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import GameCompleteScreen from '@/app/(main)/GameComplete';
import GameFormatScreen from '@/app/(main)/GameFormat';
import LineEditorScreen from '@/app/(main)/LineEditor';
import LinePresetEditor from '@/app/(main)/LinePresetEditor';
import PreGameConfirm from '@/app/(main)/PreGameConfirm';
import SettingsScreen from '@/app/(main)/Settings';
import { useGameStore } from '@/store/basic/gameStore';
import { useGameSessionStore } from '@/store/gameSessionStore';
import { arrangeBasicGame, testTeam } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

describe('basic game routes', () => {
  beforeEach(async () => {
    resetAllStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  it('redirects before rendering protected game-format content without an active session', async () => {
    await renderScreen(<GameFormatScreen />);

    expect(router.replace).toHaveBeenCalledWith('/Dashboard', {
      relativeToDirectory: undefined,
      withAnchor: undefined,
    });
    expect(screen.queryByText('GAME FORMAT')).not.toBeOnTheScreen();
  });

  it('summarizes the real active basic game format', async () => {
    arrangeBasicGame();

    await renderScreen(<GameFormatScreen />);

    expect(screen.getByText('GAME FORMAT')).toBeVisible();
    expect(screen.getByText('Basic Scoreboard')).toBeVisible();
    expect(screen.getByText('Windchill')).toBeVisible();
    expect(screen.getByText('Rivals')).toBeVisible();
    expect(screen.getByText('Active game setup')).toBeVisible();
  });

  it('starts a fresh basic game from the real pre-game settings', async () => {
    const user = userEvent.setup();
    arrangeBasicGame({ status: 'fresh' });
    await renderScreen(<PreGameConfirm />);

    expect(screen.getByText('Settings lock once the game starts')).toBeVisible();

    await user.press(screen.getByText('Start Game'));

    expect(router.dismissTo).toHaveBeenCalledWith('/Scoreboard');
  });

  it('finishes a completed game and clears the active session', async () => {
    const user = userEvent.setup();
    arrangeBasicGame({ status: 'finished' });
    useGameStore.setState({ team1Score: 15, team2Score: 12, gameTo: 15 });
    await renderScreen(<GameCompleteScreen />);

    expect(screen.getByText('GAME COMPLETE')).toBeVisible();
    expect(screen.getAllByText('Windchill')).toHaveLength(2);
    expect(screen.getByText('wins the game')).toBeVisible();

    await user.press(screen.getByText('Done'));

    expect(useGameSessionStore.getState().activeGameType).toBeNull();
    expect(router.replace).toHaveBeenCalledWith('/Dashboard');
  });

  it('renders Settings from real stores and routes to team import', async () => {
    const user = userEvent.setup();
    useGameStore.setState({ currentTeam: testTeam, team2Name: 'Rivals' });
    await renderScreen(<SettingsScreen />);

    expect(screen.getByText('SETTINGS')).toBeVisible();
    expect(screen.getByDisplayValue('Windchill')).toBeVisible();

    await user.press(screen.getByText('Import from USA Ultimate'));

    expect(router.push).toHaveBeenCalledWith('/ImportTeam');
  });

  it('handles the empty-line route without replacing its real store hooks', async () => {
    const user = userEvent.setup();
    arrangeBasicGame();
    useGameStore.setState({ currentTeam: { ...testTeam, roster: [] } });
    await renderScreen(<LineEditorScreen />);

    expect(screen.getByText('No Active Players')).toBeVisible();

    await user.press(screen.getByText('Skip for Now'));

    expect(router.dismissTo).toHaveBeenCalledWith('/Scoreboard');
  });

  it('renders the empty line-preset route from the real preset store', async () => {
    useGameStore.setState({ currentTeam: testTeam });

    await renderScreen(<LinePresetEditor />);

    expect(screen.getByText('Line Presets')).toBeVisible();
    expect(screen.getByText('No presets yet')).toBeVisible();
  });
});
