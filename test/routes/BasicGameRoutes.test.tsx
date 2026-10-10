import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import GameCompleteScreen from '@/app/(main)/GameComplete';
import GameFormatScreen from '@/app/(main)/GameFormat';
import LineEditorScreen from '@/app/(main)/LineEditor';
import LinePresetEditor from '@/app/(main)/LinePresetEditor';
import PreGameConfirm from '@/app/(main)/PreGameConfirm';
import SettingsScreen from '@/app/(main)/Settings';
import NumberPickerModal from '@/app/(modals)/NumberPickerModal';
import { useGameStore } from '@/store/basic/gameStore';
import { useGameSessionStore } from '@/store/gameSessionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTutorialStore } from '@/store/tutorialStore';
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

  it('keeps app preferences in Settings and team management out', async () => {
    await renderScreen(<SettingsScreen />);
    expect(screen.getByText('SETTINGS')).toBeVisible();
    expect(screen.getByText('STAT PREFERENCES')).toBeVisible();
    expect(screen.queryByText('Import from USA Ultimate')).not.toBeOnTheScreen();
    expect(screen.queryByText('My Team')).not.toBeOnTheScreen();
  });

  it('allows a starting ratio with stat tracking off', async () => {
    const user = userEvent.setup();
    arrangeBasicGame({ status: 'fresh' });
    useGameStore.setState({ statTrackingEnabled: false });
    useSettingsStore.setState({ genderRatioEnabled: true, firstPointRatio: null });
    await renderScreen(<PreGameConfirm />);

    expect(screen.getByText('Start Game')).toBeDisabled();
    await user.press(screen.getByText('FMP Majority'));
    expect(screen.getByText('Start Game')).toBeEnabled();
    await user.press(screen.getByText('Start Game'));

    expect(useSettingsStore.getState().firstPointRatio).toBe('more-women');
    expect(router.dismissTo).toHaveBeenCalledWith('/Scoreboard');
  });

  it('commits the opponent when starting a scoreboard-only game with the input focused', async () => {
    const user = userEvent.setup();
    arrangeBasicGame({ status: 'fresh' });
    useGameStore.setState({ statTrackingEnabled: false, team2Name: '' });
    await renderScreen(<PreGameConfirm />);
    expect(screen.queryByText('WHO IS RECEIVING?')).not.toBeOnTheScreen();
    await user.press(screen.getByTestId('basic-opponent-name-edit'));
    await user.type(screen.getByTestId('basic-opponent-name-input'), '  New Rivals  ', {
      skipBlur: true,
    });
    await user.press(screen.getByText('Start Game'));
    expect(useGameStore.getState().team2Name).toBe('New Rivals');
    expect(router.dismissTo).toHaveBeenCalledWith('/Scoreboard');
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

describe('pre-game settings', () => {
  beforeEach(async () => {
    resetAllStores();
    resetMockRouter();
    await AsyncStorage.clear();
    arrangeBasicGame({ status: 'fresh', statTrackingEnabled: true });
  });

  it.each([
    ['Game To', '11', { gameTo: 11 }, {}],
    ['Hard Cap', '90', { timerTimeLeft: 5400 }, { hardCapMins: 90, softCapMins: 15 }],
    ['Soft Cap', '80', {}, { softCapMins: 30 }],
  ] as const)(
    'saves %s through its real number-picker route',
    async (label, value, gameState, settingsState) => {
      useSettingsStore.setState({ hardCapMins: 110, softCapMins: 15 });
      const user = userEvent.setup();
      const view = await renderScreen(<PreGameConfirm />);
      await user.press(screen.getByText(label));
      expect(router.push).toHaveBeenCalledWith('/NumberPickerModal');
      await view.rerender(<NumberPickerModal />);
      await user.press(screen.getByText('C'));
      for (const digit of value) await user.press(screen.getAllByText(digit).at(-1)!);
      await user.press(screen.getByText('Save'));
      if (Object.keys(gameState).length) expect(useGameStore.getState()).toMatchObject(gameState);
      if (Object.keys(settingsState).length)
        expect(useSettingsStore.getState()).toMatchObject(settingsState);
      expect(router.back).toHaveBeenCalled();
    },
  );

  it('clamps the soft-cap offset when reducing the hard cap below it', async () => {
    useSettingsStore.setState({ hardCapMins: 110, softCapMins: 100 });
    const user = userEvent.setup();
    const view = await renderScreen(<PreGameConfirm />);
    await user.press(screen.getByText('Hard Cap'));
    await view.rerender(<NumberPickerModal />);
    await user.press(screen.getByText('90'));
    await user.press(screen.getByText('Save'));
    expect(useSettingsStore.getState()).toMatchObject({ hardCapMins: 90, softCapMins: 90 });
    expect(useGameStore.getState().timerTimeLeft).toBe(5400);
  });

  it('turns off dependent features when stat tracking and halftime are disabled', async () => {
    useGameStore.setState({
      pointTimerEnabled: true,
      autoHalftimeEnabled: true,
      floaterEnabled: true,
    });
    useSettingsStore.setState({ lineCallingEnabled: true });
    const user = userEvent.setup();
    await renderScreen(<PreGameConfirm />);
    await user.press(screen.getByText('Halftime'));
    expect(useGameStore.getState()).toMatchObject({
      autoHalftimeEnabled: false,
      floaterEnabled: false,
    });
    await user.press(screen.getByText('Stat Tracking'));
    expect(screen.queryByText('Line Calling')).not.toBeOnTheScreen();
    expect(screen.queryByText('Point Timer')).not.toBeOnTheScreen();
    expect(useSettingsStore.getState().lineCallingEnabled).toBe(false);
    expect(useGameStore.getState().pointTimerEnabled).toBe(false);
  });

  it('queues the stats tutorial for a first-time user who enables stat tracking', async () => {
    useGameStore.setState({ statTrackingEnabled: false, possession: null });
    const user = userEvent.setup();
    await renderScreen(<PreGameConfirm />);
    await user.press(screen.getByText('Stat Tracking'));
    expect(screen.getByText('Start Game')).toBeDisabled();
    await user.press(screen.getByText('Rivals'));
    await user.press(screen.getByText('Start Game'));
    expect(useGameStore.getState().possession).toBe('team2');
    expect(useTutorialStore.getState().shouldShowStatsTutorialOnNextGameStart).toBe(true);
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/TutorialStatIntro',
      params: { origin: 'onboarding' },
    });
  });

  it('routes a ready lineup to line calling when the user enables it', async () => {
    useTutorialStore.setState({ hasSeenStatsTutorial: true });
    const user = userEvent.setup();
    await renderScreen(<PreGameConfirm />);
    await user.press(screen.getByText('Point Timer'));
    await user.press(screen.getByText('Line Calling'));
    expect(useGameStore.getState().pointTimerEnabled).toBe(true);
    await user.press(screen.getByText('Set Line'));
    expect(useSettingsStore.getState().lineCallingEnabled).toBe(true);
    expect(router.replace).toHaveBeenCalledWith('/LineEditor');
  });
});
