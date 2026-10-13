import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import AboutScreen from '@/app/(main)/(hub)/(home)/About';
import HelpScreen from '@/app/(main)/(hub)/(home)/Help';
import PartnersScreen from '@/app/(main)/(hub)/(home)/Partners';
import ShowcaseScreen from '@/app/(main)/(hub)/(home)/Showcase';
import { CHANGELOG } from '@/lib/changelog';
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

  it('shows only the current changelog entry until older versions are expanded', async () => {
    const user = userEvent.setup();
    const [current, previous] = CHANGELOG;
    await renderScreen(<AboutScreen />);

    expect(screen.getByText(`v${current.version}`)).toBeVisible();
    expect(screen.queryByText(`v${previous.version}`)).toBeNull();

    await user.press(screen.getByText(`Show older versions (${CHANGELOG.length - 1})`));
    expect(screen.getByText(`v${previous.version}`)).toBeVisible();

    await user.press(screen.getByText('Hide older versions'));
    expect(screen.queryByText(`v${previous.version}`)).toBeNull();
  });

  it('links to the public GitHub repository from About', async () => {
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await renderScreen(<AboutScreen />);

    await userEvent.setup().press(screen.getByText('View on GitHub'));

    expect(openUrl).toHaveBeenCalledWith('https://github.com/DanLang1/ultimatestats');
    openUrl.mockRestore();
  });

  it('renders Help content and routes to the real tutorial entry points', async () => {
    const user = userEvent.setup();
    await renderScreen(<HelpScreen />);

    expect(screen.queryByText('ACTION BAR LEGEND')).toBeNull();
    expect(screen.queryByText('CAP STATUS LEGEND')).toBeNull();
    expect(screen.getByText('Advanced Tracker Guide')).toBeVisible();

    await user.press(screen.getByText('Advanced Tracker Guide'));
    expect(screen.getByText('What happened?')).toBeVisible();
    expect(screen.queryByTestId('tracker-help-return')).toBeNull();

    await user.press(screen.getByTestId('tracker-help-close'));

    await user.press(screen.getByText('Advanced Tutorial: Buttons'));
    await user.press(screen.getByText('Advanced Tutorial: Gestures'));
    await user.press(screen.getByText('Basic Scoreboard Guide'));
    await user.press(screen.getByText('Basic Stats Guide'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/TutorialAdvancedLineSelect',
      params: { origin: 'help', variant: 'buttons' },
    });
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/TutorialAdvancedLineSelect',
      params: { origin: 'help', variant: 'gestures' },
    });
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/TutorialScoreboard',
      params: { origin: 'help' },
    });
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/TutorialStatIntro',
      params: { origin: 'help' },
    });
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
