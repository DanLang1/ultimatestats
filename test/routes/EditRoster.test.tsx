import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen } from '@testing-library/react-native';

import EditRosterScreen from '@/app/(main)/(hub)/(team)/EditRoster';
import { useGameStore } from '@/store/basic/gameStore';
import { testTeam } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

describe('<EditRosterScreen />', () => {
  beforeEach(async () => {
    resetAllStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  it('renders the roster route from the real current team', async () => {
    useGameStore.setState({ currentTeam: testTeam });

    await renderScreen(<EditRosterScreen />);

    expect(screen.getByText('WINDCHILL')).toBeVisible();
    expect(screen.getByPlaceholderText('Add player...')).toBeVisible();
    expect(screen.getByText('Alex')).toBeVisible();
    expect(screen.getByText('Blair')).toBeVisible();
  });
});
