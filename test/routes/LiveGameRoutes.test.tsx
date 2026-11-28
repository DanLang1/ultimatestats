import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import GameInfoScreen from '@/app/(main)/(hub)/(game)/game-info';
import BasicScoreboard from '@/app/(main)/(hub)/(game)/scoreboard';
import { useGameStore } from '@/store/basic/gameStore';
import { useSavedBasicGamesStore } from '@/store/basic/savedGamesStore';
import { useSettingsStore } from '@/store/settingsStore';
import { arrangeBasicGame } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter, setMockPathname } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';
import { setWindow } from '@/test/window';

describe('live basic-game routes', () => {
  beforeEach(async () => {
    resetAllStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  it('renders the real live scoreboard and records a score press', async () => {
    const user = userEvent.setup();
    arrangeBasicGame();
    setMockPathname('/scoreboard');
    await renderScreen(<BasicScoreboard />);

    expect(screen.getByText('Windchill')).toBeVisible();
    expect(screen.getByText('Rivals')).toBeVisible();

    await user.press(screen.getByRole('button', { name: 'Score for Windchill' }));

    expect(useGameStore.getState().team1Score).toBe(1);
  });

  it('returns a game the app closed on pre-game to pre-game instead of the scoreboard', async () => {
    arrangeBasicGame({ status: 'fresh' });
    setMockPathname('/scoreboard');
    await renderScreen(<BasicScoreboard />);

    expect(router.replace).toHaveBeenCalledWith('/pre-game-confirm', expect.anything());
  });

  it('shows match status and ends the game from the game actions', async () => {
    const user = userEvent.setup();
    arrangeBasicGame();
    await renderScreen(<GameInfoScreen />);

    expect(screen.getByText('GAME STATUS')).toBeVisible();
    expect(screen.getByText('GAME ACTIONS')).toBeVisible();

    await user.press(screen.getByText('END GAME'));

    expect(useGameStore.getState().currentGameStatus).toBe('finished');
    expect(router.push).toHaveBeenCalledWith('/game-complete');
  });

  it('keeps the game in progress when it cannot be saved, and finishes it on a retry', async () => {
    const user = userEvent.setup();
    arrangeBasicGame({ statTrackingEnabled: true });
    const device = jest.requireMock<typeof import('@/test/mocks/expoSqlite')>('expo-sqlite');
    const db = await device.openDatabaseAsync('ultimatestats_basic_games.db');
    const failingSave = jest
      .spyOn(db, 'withTransactionAsync')
      .mockRejectedValueOnce(new Error('disk full'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await renderScreen(<GameInfoScreen />);

    await user.press(screen.getByText('END GAME'));

    expect(await screen.findByText('Game not saved')).toBeVisible();
    expect(useGameStore.getState().currentGameStatus).not.toBe('finished');
    expect(router.push).not.toHaveBeenCalled();

    await user.press(screen.getByText('Try Again'));

    expect(router.push).toHaveBeenCalledWith('/game-complete');
    expect(useGameStore.getState().currentGameStatus).toBe('finished');
    expect(useSavedBasicGamesStore.getState().savedGames).toHaveLength(1);
    // The database outlives this test, so the spy would too.
    failingSave.mockRestore();
  });
});

describe.each(['portrait', 'landscape'] as const)('match status in %s', (orientation) => {
  beforeEach(async () => {
    resetAllStores();
    resetMockRouter();
    arrangeBasicGame();
    await setWindow(orientation);
  });

  it('explains the hard cap and soft cap states', async () => {
    useGameStore.setState({
      team1Score: 3,
      team2Score: 2,
      timerTimeLeft: 0,
      timerEndTime: null,
    });
    await renderScreen(<GameInfoScreen />);
    expect(screen.getByText('HARDCAP')).toBeVisible();
    expect(screen.getByText('wins unless Rivals scores')).toBeVisible();

    await act(async () => useGameStore.setState({ isSoftCap: true, timerTimeLeft: 120 }));
    expect(screen.getAllByText('Softcap Active')[0]).toBeVisible();
  });
});

it.each([
  ['more-women', '2nd FMP POINT', 'FMP', '1st MMP POINT'],
  ['more-men', '2nd MMP POINT', 'MMP', '1st FMP POINT'],
] as const)(
  'opens ratio information for first majority %s',
  async (firstPointRatio, current, majority, next) => {
    resetAllStores();
    arrangeBasicGame();
    useSettingsStore.setState({ genderRatioEnabled: true, firstPointRatio });
    const user = userEvent.setup();
    await renderScreen(<GameInfoScreen />);
    await user.press(screen.getByText(current));
    expect(screen.getByText('Gender Ratio Info')).toBeVisible();
    expect(screen.getByText('1ST MAJORITY')).toBeVisible();
    expect(screen.getByText(majority)).toBeVisible();
    expect(screen.getByText(next)).toBeVisible();
  },
);

it('starts halftime only after confirming the live game action', async () => {
  resetAllStores();
  resetMockRouter();
  arrangeBasicGame({ statTrackingEnabled: true });
  useGameStore.setState({
    team1Score: 1,
    team2Score: 1,
    gameHalf: 1,
    autoHalftimeEnabled: true,
    timerTimeLeft: 120,
    events: [
      {
        type: 'goal',
        team: 'team1',
        goalPlayerId: null,
        assistPlayerId: null,
        pointNumber: 2,
      },
    ],
  });
  const user = userEvent.setup();
  await renderScreen(<GameInfoScreen />);
  await user.press(screen.getByText('START 2ND HALF'));
  expect(screen.getByText('Start 2nd Half Early?')).toBeVisible();
  expect(useGameStore.getState().gameHalf).toBe(1);
  await user.press(screen.getByText('Start 2nd Half'));
  expect(useGameStore.getState().gameHalf).toBe(2);
  expect(useGameStore.getState().events.at(-1)).toMatchObject({
    triggeredHalftime: true,
  });
  expect(router.back).toHaveBeenCalledTimes(1);
});
