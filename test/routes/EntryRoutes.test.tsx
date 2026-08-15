import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import NotFoundScreen from '@/app/+not-found';
import IndexRoute from '@/app/index';
import { useGameSessionStore } from '@/store/gameSessionStore';
import { useTutorialStore } from '@/store/tutorialStore';
import { resetDashboardStores } from '@/test/fixtures/resetStores';
import { resetMockRouter } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

describe('entry routes', () => {
  beforeEach(async () => {
    resetDashboardStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  it('redirects a new user to onboarding from real tutorial state', async () => {
    useTutorialStore.setState({ hasHydrated: true, hasSeenOnboarding: false });

    await renderScreen(<IndexRoute />);

    expect(router.replace).toHaveBeenCalledWith('/TutorialIntro', {
      relativeToDirectory: undefined,
      withAnchor: undefined,
    });
  });

  it('redirects an onboarded user to the real active session route', async () => {
    useTutorialStore.setState({ hasHydrated: true, hasSeenOnboarding: true });
    useGameSessionStore.getState().setActiveGameType('basic');

    await renderScreen(<IndexRoute />);

    expect(router.replace).toHaveBeenCalledWith('/Scoreboard', {
      relativeToDirectory: undefined,
      withAnchor: undefined,
    });
  });

  it('offers recovery actions on the not-found route', async () => {
    const user = userEvent.setup();
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await renderScreen(<NotFoundScreen />);

    expect(screen.getByText('Page Not Found')).toBeVisible();
    expect(screen.getByText('If you came from a share link, it may have expired.')).toBeVisible();

    await user.press(screen.getByText('Go Home'));
    await user.press(screen.getByText('Report Issue'));

    expect(router.replace).toHaveBeenCalledWith('/');
    expect(openUrl).toHaveBeenCalledWith('https://discord.gg/AjsmqhZ2GH');
    openUrl.mockRestore();
  });
});
