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

    expect(screen.getByText('Open-Source Ultimate Frisbee Stat Tracker')).toBeVisible();
    expect(screen.getByText('Detailed Stats')).toBeVisible();

    await user.press(screen.getByText('See How It Works'));

    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/TutorialAdvancedLineSelect',
      params: { origin: 'onboarding', variant: 'buttons' },
    });
  });

  it('permanently skips onboarding from the intro', async () => {
    const user = userEvent.setup();
    await renderScreen(<TutorialIntroRoute />);

    await user.press(screen.getByRole('button', { name: 'Skip' }));

    expect(useTutorialStore.getState()).toMatchObject({
      hasSeenOnboarding: true,
      hasSeenAdvancedTutorial: true,
    });
    expect(router.replace).toHaveBeenCalledWith('/Dashboard');
  });

  it('teaches line selection without modifying persistent game data', async () => {
    const user = userEvent.setup();
    setMockSearchParams({ origin: 'onboarding', variant: 'buttons' });
    await renderScreen(<TutorialAdvancedLineSelectRoute />);

    expect(screen.getByText('Load a Line')).toBeVisible();
    expect(screen.getByText('0/7')).toBeVisible();

    await user.press(await screen.findByTestId('line-select-quick-preset-tutorial-d-line'));

    expect(screen.getByText('Confirm the Line')).toBeVisible();
    await user.press(screen.getByTestId('line-select-confirm'));

    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/TutorialAdvancedTracker',
      params: { origin: 'onboarding', variant: 'buttons' },
    });
    expect(useGameStore.getState().currentTeam.roster).toEqual([]);
    expect(useLinePresetsStore.getState().presets).toEqual([]);
    expect(useGameSessionStore.getState().activeGameType).toBeNull();
    expect(useAdvancedTrackingStore.getState().currentGame).toBeNull();
  });

  it('permanently skips onboarding when exiting first-launch line selection', async () => {
    const user = userEvent.setup();
    setMockSearchParams({ origin: 'onboarding', variant: 'buttons' });
    await renderScreen(<TutorialAdvancedLineSelectRoute />);

    await user.press(screen.getByRole('button', { name: 'Exit tutorial' }));

    expect(useTutorialStore.getState()).toMatchObject({
      hasSeenOnboarding: true,
      hasSeenAdvancedTutorial: true,
    });
    expect(router.replace).toHaveBeenCalledWith('/Dashboard');
  });

  it('permanently skips onboarding when exiting first-launch practice', async () => {
    const user = userEvent.setup();
    setMockSearchParams({ origin: 'onboarding', variant: 'buttons' });
    await renderScreen(<TutorialAdvancedTrackerRoute />);

    await user.press(screen.getByRole('button', { name: 'Exit tutorial' }));

    expect(useTutorialStore.getState()).toMatchObject({
      hasSeenOnboarding: true,
      hasSeenAdvancedTutorial: true,
    });
    expect(router.replace).toHaveBeenCalledWith('/Dashboard');
  });

  it('teaches the footer buttons and finishes onboarding with the swipe tip', async () => {
    const user = userEvent.setup();
    setMockSearchParams({ origin: 'onboarding', variant: 'buttons' });
    await renderScreen(<TutorialAdvancedTrackerRoute />);

    expect(screen.getByText('STEP 1 OF 5')).toBeVisible();
    await user.press(screen.getByTestId('tracker-chip-Rachel'));

    expect(screen.getByText('STEP 2 OF 5')).toBeVisible();
    await user.press(screen.getByTestId('tracker-chip-Mark'));

    expect(screen.getByText('Tap T/A to record a throwaway by Mark.')).toBeVisible();
    await user.press(screen.getByTestId('offense-throwaway'));

    expect(screen.getByText('STEP 4 OF 5')).toBeVisible();
    await user.press(screen.getByTestId('tracker-more-button'));
    await user.press(screen.getByTestId('tutorial-pressure-action'));
    await user.press(screen.getByTestId('tracker-chip-Harper'));

    expect(screen.getByText('STEP 5 OF 5')).toBeVisible();
    await user.press(screen.getByTestId('offense-goal'));
    expect(screen.getByText('Tap who scored')).toBeVisible();
    expect(screen.queryByTestId('tutorial-offense-row')).not.toBeOnTheScreen();
    expect(screen.getByTestId('tutorial-offense-row', { includeHiddenElements: true })).toHaveProp(
      'pointerEvents',
      'none',
    );
    await user.press(screen.getByTestId('tracker-chip-Kelly'));

    expect(screen.getByText('Advanced Tutorial Complete')).toBeVisible();
    expect(screen.getByText(/Swipes work too/)).toBeVisible();
    await user.press(screen.getByText('DONE'));

    expect(useTutorialStore.getState()).toMatchObject({
      hasSeenOnboarding: true,
      hasSeenAdvancedTutorial: true,
    });
    expect(router.replace).toHaveBeenCalledWith('/Dashboard');
  });

  it('keeps the gestures tutorial free of footer buttons', async () => {
    setMockSearchParams({ origin: 'help', variant: 'gestures' });
    await renderScreen(<TutorialAdvancedTrackerRoute />);

    expect(screen.getByText('STEP 1 OF 6')).toBeVisible();
    expect(screen.queryByTestId('offense-throwaway')).toBeNull();
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

    expect(router.replace).toHaveBeenCalledWith('/TutorialStatScoreboard');
  });

  it('closes the completed stat tutorial and returns to the dashboard', async () => {
    const user = userEvent.setup();
    setMockSearchParams({ origin: 'onboarding' });
    useTutorialStore.setState({ shouldShowStatsTutorialOnNextGameStart: true });
    await renderScreen(<TutorialStatCompleteRoute />);

    expect(screen.getByText('Stats Tutorial Complete!')).toBeVisible();

    await user.press(screen.getByText('Return Home'));

    expect(useTutorialStore.getState().hasSeenStatsTutorial).toBe(true);
    expect(useTutorialStore.getState().shouldShowStatsTutorialOnNextGameStart).toBe(false);
    expect(router.replace).toHaveBeenCalledWith('/Dashboard');
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
