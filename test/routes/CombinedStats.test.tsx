import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';

import CombinedStatsScreen from '@/app/(main)/(hub)/(analytics)/combined-stats';
import type { SharedPayload } from '@/lib/sharing/types';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useGameStore } from '@/store/basic/gameStore';
import { createFinalAdvancedGame, createSavedBasicGame, testTeam } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetAdvancedTrackingStorage } from '@/test/mocks/advancedTrackingStorage';
import { resetMockRouter, setMockSearchParams } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';
import { setWindow } from '@/test/window';

jest.mock('@/lib/supabase', () => jest.requireActual('@/test/mocks/supabase'));
jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  File: class {
    uri: string;
    exists = true;
    constructor(directory: string, filename: string) {
      this.uri = `${directory}/${filename}`;
    }
    write(_content: string) {}
    delete() {
      this.exists = false;
    }
  },
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

beforeEach(async () => {
  resetAllStores();
  resetMockRouter();
  await AsyncStorage.clear();
  await setWindow('landscape');
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
  jest.mocked(Sharing.shareAsync).mockResolvedValue(undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
});

async function arrangeGames(kind: 'basic' | 'advanced') {
  if (kind === 'basic') {
    const game = createSavedBasicGame();
    useGameStore.setState({
      savedTeams: [testTeam],
      savedGames: [
        { ...game, id: 'first', team2Name: 'Falcons', createdAt: 1000 },
        { ...game, id: 'second', team2Name: 'Eagles', createdAt: 2000 },
      ],
    });
  } else {
    for (const [id, opponentName] of [
      ['first', 'Falcons'],
      ['second', 'Eagles'],
    ] as const) {
      await useSavedAdvancedGamesStore.getState().saveGame(
        createFinalAdvancedGame({
          id,
          opponentName,
          focusLabel: testTeam.name,
          sourceTeamId: testTeam.id,
        }),
      );
    }
  }
  setMockSearchParams({ kind, gameIds: 'first,second' });
}

it('combines basic games into one box score', async () => {
  await arrangeGames('basic');
  await renderScreen(<CombinedStatsScreen />);
  expect(screen.getByText('COMBINED STATS')).toBeVisible();
  expect(screen.getByText('Windchill')).toBeVisible();
  expect(screen.getByText('2 Games Combined')).toBeVisible();
});

it('shows the advanced record and per-game margins, and opens a player across the combined games', async () => {
  await arrangeGames('advanced');
  await renderScreen(<CombinedStatsScreen />);

  expect(await screen.findByTestId('advanced-stats-combined-record')).toHaveTextContent('2–0');
  expect(screen.getByTestId('game-margins-section')).toBeVisible();

  await userEvent.setup().press(screen.getByTestId('advanced-stats-row-blair'));
  expect(router.push).toHaveBeenLastCalledWith(
    expect.objectContaining({
      params: expect.objectContaining({
        gameId: 'aggregate',
        aggregateGameIds: 'first,second',
      }),
    }),
  );
});

it.each([
  ['basic', 'Windchill_2_games'],
  ['advanced', 'Windchill_2_games_advanced'],
] as const)('exports the combined %s games as CSV', async (kind, filename) => {
  await arrangeGames(kind);
  await renderScreen(<CombinedStatsScreen />);
  const write = jest.spyOn(File.prototype, 'write');
  await userEvent.setup().press(await screen.findByTestId('header-action-csv'));
  await waitFor(() =>
    expect(Sharing.shareAsync).toHaveBeenCalledWith(`file:///cache/${filename}.csv`),
  );
  expect(write.mock.calls[0][0]).toContain('Windchill');
  expect(screen.queryByText('Export failed')).not.toBeOnTheScreen();
});

it.each(['basic', 'advanced'] as const)(
  'uploads the combined %s games only after share confirmation',
  async (kind) => {
    await arrangeGames(kind);
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async () => new Response(null, { status: 201 }));
    const user = userEvent.setup();
    await renderScreen(<CombinedStatsScreen />);
    await user.press(screen.getByTestId('header-action-share'));
    expect(fetchSpy).not.toHaveBeenCalled();
    await user.press(screen.getByText('Proceed'));
    expect(await screen.findByText('Share Link Ready')).toBeVisible();
    const upload = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string) as {
      id: string;
      payload: SharedPayload;
    };
    expect(upload.payload.type).toBe(kind === 'basic' ? 'games' : 'advanced-games');
    if (upload.payload.type !== 'games' && upload.payload.type !== 'advanced-games')
      throw new Error('Expected bulk share');
    expect(upload.payload.data.map((game) => game.id).sort()).toEqual(['first', 'second']);
  },
);

it('refuses to show combined math when an advanced game has no full record', async () => {
  await arrangeGames('advanced');
  resetAdvancedTrackingStorage();
  useSavedAdvancedGamesStore.setState({ gamesById: {} });
  await renderScreen(<CombinedStatsScreen />);
  expect(await screen.findByText('Combined stats unavailable')).toBeVisible();
  expect(screen.getByText('Some selected advanced games could not be loaded.')).toBeVisible();
  await userEvent.setup().press(screen.getByText('Back to Games'));
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('refuses to combine basic games when one of them no longer exists', async () => {
  await arrangeGames('basic');
  setMockSearchParams({ kind: 'basic', gameIds: 'first,missing' });
  await renderScreen(<CombinedStatsScreen />);
  expect(screen.getByText('Combined stats unavailable')).toBeVisible();
  expect(screen.getByText('The selected games could not be found.')).toBeVisible();
});

it('offers a way back to Saved Games when the link names no games', async () => {
  setMockSearchParams({ kind: 'basic' });
  await renderScreen(<CombinedStatsScreen />);
  expect(screen.getByText('Missing games link.')).toBeVisible();
  await userEvent.setup().press(screen.getByText('Go to Saved Games'));
  expect(router.dismissTo).toHaveBeenCalledWith('/stats');
});
