import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import ImportScreen from '@/app/(main)/Import';
import ImportTeamScreen from '@/app/(main)/ImportTeam';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

describe('import routes', () => {
  beforeEach(async () => {
    resetAllStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  it('shows a deterministic recovery state for an incomplete import link', async () => {
    const user = userEvent.setup();
    await renderScreen(<ImportScreen />);

    expect(
      screen.getByText(
        'This import link is missing its share ID. Please open the original link and try again.',
      ),
    ).toBeVisible();

    await user.press(screen.getByText('OK'));

    expect(router.dismissTo).toHaveBeenCalledWith('/');
  });

  it('validates the USA Ultimate team-import form before any network boundary', async () => {
    const user = userEvent.setup();
    await renderScreen(<ImportTeamScreen />);

    expect(screen.getByText('IMPORT TEAM')).toBeVisible();
    expect(screen.getByPlaceholderText('USAU Team URL')).toBeVisible();

    await user.press(screen.getByText('Fetch Roster'));

    expect(screen.getByText('Paste a team link to continue.')).toBeVisible();
  });
});
