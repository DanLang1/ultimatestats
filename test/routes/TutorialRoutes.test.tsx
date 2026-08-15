import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import TutorialAdvancedTrackerRoute from '@/app/(main)/TutorialAdvancedTracker';
import TutorialCompleteRoute from '@/app/(main)/TutorialComplete';
import TutorialIntroRoute from '@/app/(main)/TutorialIntro';
import TutorialScoreboardRoute from '@/app/(main)/TutorialScoreboard';
import TutorialStatCompleteRoute from '@/app/(main)/TutorialStatComplete';
import TutorialStatIntroRoute from '@/app/(main)/TutorialStatIntro';
import TutorialStatScoreboardRoute from '@/app/(main)/TutorialStatScoreboard';
import { useGameStore } from '@/store/basic/gameStore';
import { useGameSessionStore } from '@/store/gameSessionStore';
import { useTutorialStore } from '@/store/tutorialStore';
import { resetDashboardStores } from '@/test/fixtures/resetStores';
import { resetMockRouter, setMockSearchParams } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

describe('tutorial routes', () => {
  beforeEach(async () => {
    resetDashboardStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  it('introduces the app and continues to the basic scoreboard tutorial', async () => {
    const user = userEvent.setup();
    await renderScreen(<TutorialIntroRoute />);

    expect(screen.getByText('Ultimate Frisbee Scoreboard / Stat Tracker')).toBeVisible();
    expect(screen.getByText('Detailed Player Stats')).toBeVisible();

    await user.press(screen.getByText('Continue'));

    expect(router.replace).toHaveBeenCalledWith('/TutorialScoreboard');
  });

  it('runs the real basic tutorial state and can exit to Dashboard', async () => {
    const user = userEvent.setup();
    await renderScreen(<TutorialScoreboardRoute />);

    expect(screen.getByText('Tap either side to score')).toBeVisible();
    expect(screen.getByText('USA')).toBeVisible();
    expect(screen.getByText('Canada')).toBeVisible();

    await user.press(screen.getByRole('button', { name: 'Exit tutorial' }));

    expect(useTutorialStore.getState().hasSeenOnboarding).toBe(true);
    expect(router.dismissTo).toHaveBeenCalledWith('/Dashboard');
  });

  it('completes onboarding and returns home without replacing the current game', async () => {
    const user = userEvent.setup();
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
    useGameStore.setState({ team1Score: 3, currentGameStatus: 'inProgress' });
    await renderScreen(<TutorialCompleteRoute />);

    await user.press(screen.getByText('Start New Game'));

    expect(screen.queryByText('Start New Game?')).not.toBeOnTheScreen();
    expect(useGameStore.getState().team1Score).toBe(0);
    expect(useGameSessionStore.getState().activeGameType).toBe('basic');
    expect(router.replace).toHaveBeenCalledWith('/PreGameConfirm');
  });

  it('introduces stat tracking and starts its scoreboard tutorial', async () => {
    const user = userEvent.setup();
    await renderScreen(<TutorialStatIntroRoute />);

    expect(screen.getByText('Stat Tracking')).toBeVisible();
    expect(screen.getByText('Goals & Assists')).toBeVisible();

    await user.press(screen.getByText('Start Tutorial'));

    expect(router.replace).toHaveBeenCalledWith('/TutorialStatScoreboard');
  });

  it('runs the real stat tutorial state and closes it from the exit control', async () => {
    const user = userEvent.setup();
    await renderScreen(<TutorialStatScoreboardRoute />);

    expect(screen.getByText('Tap START POINT to begin the point timer.')).toBeVisible();

    await user.press(screen.getByRole('button', { name: 'Exit tutorial' }));

    expect(useTutorialStore.getState().hasSeenStatsTutorial).toBe(true);
    expect(router.dismissTo).toHaveBeenCalledWith('/Dashboard');
  });

  it('closes the completed stat tutorial and continues to game setup', async () => {
    const user = userEvent.setup();
    useTutorialStore.setState({ shouldShowStatsTutorialOnNextGameStart: true });
    await renderScreen(<TutorialStatCompleteRoute />);

    expect(screen.getByText('Stats Tutorial Complete!')).toBeVisible();

    await user.press(screen.getByText('Start a Game'));

    expect(useTutorialStore.getState().hasSeenStatsTutorial).toBe(true);
    expect(useTutorialStore.getState().shouldShowStatsTutorialOnNextGameStart).toBe(false);
    expect(router.replace).toHaveBeenCalledWith('/PreGameConfirm');
  });

  it('renders the real advanced tutorial state and skips back to Help origin', async () => {
    const user = userEvent.setup();
    setMockSearchParams({ origin: 'help' });
    await renderScreen(<TutorialAdvancedTrackerRoute />);

    expect(screen.getByText('Start the Point')).toBeVisible();
    expect(
      screen.getByText('Alex has the disc. Tap Blair to record a completed pass.'),
    ).toBeVisible();

    await user.press(screen.getByText('SKIP'));

    expect(useTutorialStore.getState().hasSeenAdvancedTutorial).toBe(true);
    expect(router.replace).toHaveBeenCalledWith('/Dashboard');
  });
});
