import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import TutorialAdvancedLineSelectRoute from '@/app/(main)/TutorialAdvancedLineSelect';
import TutorialAdvancedTrackerRoute from '@/app/(main)/TutorialAdvancedTracker';
import TutorialCompleteRoute from '@/app/(main)/TutorialComplete';
import TutorialIntroRoute from '@/app/(main)/TutorialIntro';
import TutorialScoreboardRoute from '@/app/(main)/TutorialScoreboard';
import TutorialStatCompleteRoute from '@/app/(main)/TutorialStatComplete';
import TutorialStatIntroRoute from '@/app/(main)/TutorialStatIntro';
import TutorialStatScoreboardRoute from '@/app/(main)/TutorialStatScoreboard';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';
import { useGameSessionStore } from '@/store/gameSessionStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { useTutorialStore } from '@/store/tutorialStore';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter, setMockSearchParams } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

describe('tutorial routes', () => {
  beforeEach(async () => {
    resetAllStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  it('introduces the app and continues to advanced line selection', async () => {
    const user = userEvent.setup();
    await renderScreen(<TutorialIntroRoute />);

    expect(screen.getByText('Ultimate Frisbee Scoreboard / Stat Tracker')).toBeVisible();
    expect(screen.getByText('Detailed Stats')).toBeVisible();

    await user.press(screen.getByText('Continue'));

    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/TutorialAdvancedLineSelect',
      params: { origin: 'onboarding' },
    });
  });

  it('teaches line selection without modifying persistent game data', async () => {
    const user = userEvent.setup();
    setMockSearchParams({ origin: 'onboarding' });
    await renderScreen(<TutorialAdvancedLineSelectRoute />);

    expect(screen.getByText('Load a Line')).toBeVisible();
    expect(screen.getByText('0/7')).toBeVisible();

    await user.press(screen.getByTestId('line-select-load-line'));
    await user.press(screen.getByText('D-Line'));

    expect(screen.getByText('Confirm the Line')).toBeVisible();
    await user.press(screen.getByTestId('line-select-confirm'));

    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/TutorialAdvancedTracker',
      params: { origin: 'onboarding' },
    });
    expect(useGameStore.getState().currentTeam.roster).toEqual([]);
    expect(useLinePresetsStore.getState().presets).toEqual([]);
    expect(useGameSessionStore.getState().activeGameType).toBeNull();
    expect(useAdvancedTrackingStore.getState().currentGame).toBeNull();
  });

  it('exits first-launch line selection without completing onboarding', async () => {
    const user = userEvent.setup();
    setMockSearchParams({ origin: 'onboarding' });
    await renderScreen(<TutorialAdvancedLineSelectRoute />);

    await user.press(screen.getByRole('button', { name: 'Exit tutorial' }));

    expect(useTutorialStore.getState()).toMatchObject({
      hasSeenOnboarding: false,
      hasSeenAdvancedTutorial: false,
    });
    expect(router.replace).toHaveBeenCalledWith('/Dashboard');
  });

  it('runs the real basic tutorial state and can exit to Dashboard', async () => {
    const user = userEvent.setup();
    setMockSearchParams({ origin: 'onboarding' });
    await renderScreen(<TutorialScoreboardRoute />);

    expect(screen.getByText('Tap either side to score')).toBeVisible();
    expect(screen.getByText('USA')).toBeVisible();
    expect(screen.getByText('Canada')).toBeVisible();

    await user.press(screen.getByRole('button', { name: 'Exit tutorial' }));

    expect(useTutorialStore.getState().hasSeenOnboarding).toBe(true);
    expect(router.replace).toHaveBeenCalledWith('/Dashboard');
  });

  it('completes onboarding and returns home without replacing the current game', async () => {
    const user = userEvent.setup();
    setMockSearchParams({ origin: 'onboarding' });
    useGameStore.setState({ team1Score: 3, currentGameStatus: 'inProgress' });
    await renderScreen(<TutorialCompleteRoute />);

    expect(screen.getByText('Basics Complete!')).toBeVisible();

    await user.press(screen.getByText('Return Home'));

    expect(useTutorialStore.getState().hasSeenOnboarding).toBe(true);
    expect(useGameStore.getState().team1Score).toBe(3);
    expect(router.replace).toHaveBeenCalledWith('/Dashboard');
  });

  it('starts a new game from tutorial completion without confirming an existing game reset', async () => {
    const user = userEvent.setup();
    setMockSearchParams({ origin: 'onboarding' });
    useGameStore.setState({ team1Score: 3, currentGameStatus: 'inProgress' });
    await renderScreen(<TutorialCompleteRoute />);

    await user.press(screen.getByText('Start New Game'));

    expect(screen.queryByText('Start New Game?')).not.toBeOnTheScreen();
    expect(useGameStore.getState().team1Score).toBe(0);
    expect(useGameSessionStore.getState().activeGameType).toBe('basic');
    expect(router.replace).toHaveBeenCalledWith('/PreGameConfirm');
  });

  it('returns a help-launched basic guide without changing onboarding completion', async () => {
    const user = userEvent.setup();
    setMockSearchParams({ origin: 'help' });
    await renderScreen(<TutorialScoreboardRoute />);

    await user.press(screen.getByRole('button', { name: 'Exit tutorial' }));

    expect(useTutorialStore.getState().hasSeenOnboarding).toBe(false);
    expect(router.replace).toHaveBeenCalledWith('/Dashboard');
  });

  it('runs the real stat tutorial state and closes it from the exit control', async () => {
    const user = userEvent.setup();
    setMockSearchParams({ origin: 'onboarding' });
    await renderScreen(<TutorialStatScoreboardRoute />);

    expect(screen.getByText('Tap START POINT to begin the point timer.')).toBeVisible();

    await user.press(screen.getByRole('button', { name: 'Exit tutorial' }));

    expect(useTutorialStore.getState().hasSeenStatsTutorial).toBe(true);
    expect(router.replace).toHaveBeenCalledWith('/Dashboard');
  });

  it('introduces the basic stats tutorial before the simulated game', async () => {
    const user = userEvent.setup();
    setMockSearchParams({ origin: 'onboarding' });
    await renderScreen(<TutorialStatIntroRoute />);

    expect(screen.getByText('Basic Tracking')).toBeVisible();
    expect(screen.getByText('Goals & Assists')).toBeVisible();

    await user.press(screen.getByText('Start Tutorial'));

    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/TutorialStatScoreboard',
      params: { origin: 'onboarding' },
    });
  });

  it('closes the completed stat tutorial and continues to game setup', async () => {
    const user = userEvent.setup();
    setMockSearchParams({ origin: 'onboarding' });
    useTutorialStore.setState({ shouldShowStatsTutorialOnNextGameStart: true });
    await renderScreen(<TutorialStatCompleteRoute />);

    expect(screen.getByText('Stats Tutorial Complete!')).toBeVisible();

    await user.press(screen.getByText('Start a Game'));

    expect(useTutorialStore.getState().hasSeenStatsTutorial).toBe(true);
    expect(useTutorialStore.getState().shouldShowStatsTutorialOnNextGameStart).toBe(false);
    expect(router.replace).toHaveBeenCalledWith('/PreGameConfirm');
  });

  it('exits the advanced tutorial to its source without completing it', async () => {
    const user = userEvent.setup();
    setMockSearchParams({ origin: 'help' });
    await renderScreen(<TutorialAdvancedTrackerRoute />);

    expect(screen.getByText('Record a Pass')).toBeVisible();
    expect(
      screen.getByText('Kelly has the disc. Tap Mark to record a completed pass.'),
    ).toBeVisible();

    await user.press(screen.getByRole('button', { name: 'Exit tutorial' }));

    expect(useTutorialStore.getState().hasSeenAdvancedTutorial).toBe(false);
    expect(router.replace).toHaveBeenCalledWith('/Dashboard');
  });

  it('marks both first-launch tutorial flags in one onboarding transition', async () => {
    useTutorialStore.getState().completeAdvancedOnboarding();

    expect(useTutorialStore.getState()).toMatchObject({
      hasSeenOnboarding: true,
      hasSeenAdvancedTutorial: true,
    });
  });
});
