import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import AboutScreen from '@/app/(main)/(hub)/(home)/About';
import HelpScreen from '@/app/(main)/(hub)/(home)/Help';
import PartnersScreen from '@/app/(main)/(hub)/(home)/Partners';
import ShowcaseScreen from '@/app/(main)/(hub)/(home)/Showcase';
import { resetDashboardStores } from '@/test/fixtures/resetStores';
import { resetMockRouter } from '@/test/mocks/expoRouter';
import { createTestQueryClient, renderScreen } from '@/test/render';

describe('home information routes', () => {
  beforeEach(async () => {
    resetDashboardStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  it('renders the real About content and acknowledges the current version', async () => {
    await renderScreen(<AboutScreen />);

    expect(screen.getByText('ABOUT')).toBeVisible();
    expect(screen.getByText('U-Stat')).toBeVisible();
    expect(screen.getByText(/Version /)).toBeVisible();
    expect(screen.getByText("WHAT'S NEW")).toBeVisible();
    expect(await AsyncStorage.getItem('ultimatestats_last_seen_version')).not.toBeNull();
  });

  it('renders Help content and routes to the real tutorial entry points', async () => {
    const user = userEvent.setup();
    await renderScreen(<HelpScreen />);

    expect(screen.getByText('ACTION BAR LEGEND')).toBeVisible();
    expect(screen.getByText('CAP STATUS LEGEND')).toBeVisible();

    await user.press(screen.getByText('View Tutorial'));
    await user.press(screen.getByText('Advanced Guide'));
    await user.press(screen.getByText('Stats Guide'));

    expect(router.push).toHaveBeenCalledWith('/TutorialIntro');
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/TutorialAdvancedTracker',
      params: { origin: 'help' },
    });
    expect(router.replace).toHaveBeenCalledWith('/TutorialStatIntro');
  });

  it('renders partner details and opens the partner website', async () => {
    const user = userEvent.setup();
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await renderScreen(<PartnersScreen />);

    expect(screen.getByText('DH Ultimate')).toBeVisible();
    expect(screen.getByText('USA Ultimate Approved Vendor')).toBeVisible();

    await user.press(screen.getByText('Website'));

    expect(openUrl).toHaveBeenCalledTimes(1);
    openUrl.mockRestore();
  });

  it('renders a deterministic empty Showcase from seeded query data', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['showcaseGames'], []);

    await renderScreen(<ShowcaseScreen />, { queryClient });

    expect(screen.getByText('SHOWCASE')).toBeVisible();
    expect(screen.getByText('No showcase games yet.')).toBeVisible();
  });
});
