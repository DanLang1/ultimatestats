import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';

import GameInfoScreen from '@/app/(main)/(hub)/(game)/GameInfo';
import BasicScoreboard from '@/app/(main)/(hub)/(game)/Scoreboard';
import { useGameStore } from '@/store/basic/gameStore';
import { arrangeBasicGame } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter, setMockPathname } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

describe('live basic-game routes', () => {
  beforeEach(async () => {
    resetAllStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  it('renders the real live scoreboard and records a score press', async () => {
    const user = userEvent.setup();
    arrangeBasicGame();
    setMockPathname('/Scoreboard');
    await renderScreen(<BasicScoreboard />);

    expect(screen.getByText('Windchill')).toBeVisible();
    expect(screen.getByText('Rivals')).toBeVisible();

    await user.press(screen.getByRole('button', { name: 'Score for Windchill' }));

    expect(useGameStore.getState().team1Score).toBe(1);
  });

  it('shows match status and opens the real end-game confirmation', async () => {
    const user = userEvent.setup();
    arrangeBasicGame();
    await renderScreen(<GameInfoScreen />);

    expect(screen.getByText('GAME STATUS')).toBeVisible();
    expect(screen.getByText('GAME ACTIONS')).toBeVisible();

    await user.press(screen.getByText('END GAME'));

    expect(screen.getByText('End Game Early?')).toBeVisible();
  });
});
