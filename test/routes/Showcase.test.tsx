import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import ShowcaseScreen from '@/app/(main)/(hub)/(home)/Showcase';
import { serializeAdvancedGame, serializeGame } from '@/lib/sharing/serialize';
import type { ShowcaseGameMeta } from '@/lib/sharing/showcaseTypes';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useGameStore } from '@/store/basic/gameStore';
import { jsonResponse, requestUrl } from '@/test/fetch';
import {
  createAdvancedGameScenario,
  participantRef,
  UNTRACKED_PLAYER,
} from '@/test/fixtures/advancedGameBuilder';
import { createSavedBasicGame } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter } from '@/test/mocks/expoRouter';
import { createTestQueryClient, renderScreen } from '@/test/render';

jest.mock('@/lib/supabase', () => jest.requireActual('@/test/mocks/supabase'));

const advancedGame = () =>
  createAdvancedGameScenario()
    .hold({
      puller: UNTRACKED_PLAYER,
      receiver: participantRef('alex'),
      scorer: participantRef('blair'),
    })
    .build();
function meta(id: string, game_type: ShowcaseGameMeta['game_type']): ShowcaseGameMeta {
  return {
    id: 'showcase-1',
    game_id: id,
    game_type,
    title: 'Final',
    description: 'Championship',
    tags: ['Finals'],
    created_at: '2026-01-02',
    import_count: 1,
  };
}
beforeEach(async () => {
  resetAllStores();
  resetMockRouter();
  await AsyncStorage.clear();
});
afterEach(() => {
  jest.restoreAllMocks();
});

it.each(['game', 'advanced-game'] as const)(
  'imports a Showcase %s and navigates to its persisted record',
  async (type) => {
    const payload =
      type === 'game'
        ? serializeGame(createSavedBasicGame())
        : serializeAdvancedGame(advancedGame());
    if (payload.type !== 'game' && payload.type !== 'advanced-game')
      throw new Error('Expected a single game');
    const client = createTestQueryClient();
    client.setQueryData(['showcaseGames'], [meta(payload.data.id, type)]);
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async (input) =>
        requestUrl(input).includes('/rpc/') ? jsonResponse(null) : jsonResponse({ payload }),
      );
    const user = userEvent.setup();
    await renderScreen(<ShowcaseScreen />, { queryClient: client });
    expect(screen.getByText('1 game available')).toBeVisible();
    await user.press(screen.getByText('Import'));
    await waitFor(() => {
      expect(screen.getByText('View Game')).toBeVisible();
    });
    if (type === 'game') {
      expect(useGameStore.getState().savedGames).toEqual([
        expect.objectContaining({ id: payload.data.id, importedAt: expect.any(Number) }),
      ]);
      expect(
        JSON.parse((await AsyncStorage.getItem('ultimatestats-game-storage'))!).state.savedGames,
      ).toEqual([expect.objectContaining({ id: payload.data.id, importedAt: expect.any(Number) })]);
    } else {
      const saved = await useSavedAdvancedGamesStore.getState().loadGame(payload.data.id);
      expect(saved).toMatchObject({ id: payload.data.id, importedAt: expect.any(Number) });
    }
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([input]) =>
          requestUrl(input).includes('increment_showcase_import_count'),
        ),
      ).toBe(true);
    });
    await user.press(screen.getByText('View Game'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: type === 'game' ? '/saved-games/[gameId]' : '/advancedTracking/analytics/[gameId]',
      params: { gameId: payload.data.id },
    });
  },
);

it('keeps a failed import retryable without recording or counting it', async () => {
  const game = createSavedBasicGame();
  const client = createTestQueryClient();
  client.setQueryData(['showcaseGames'], [meta(game.id, 'game')]);
  const fetchMock = jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(jsonResponse({ message: 'Unavailable' }, 403));
  const user = userEvent.setup();
  await renderScreen(<ShowcaseScreen />, { queryClient: client });
  await user.press(screen.getByText('Import'));
  await waitFor(() => {
    expect(screen.getByText('Failed to import. Please try again.')).toBeVisible();
  });
  expect(useGameStore.getState().savedGames).toEqual([]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fetchMock.mockImplementation(async (input) =>
    requestUrl(input).includes('/rpc/')
      ? jsonResponse(null)
      : jsonResponse({ payload: serializeGame(game) }),
  );
  await user.press(screen.getByText('Import'));
  await waitFor(() => {
    expect(screen.getByText('View Game')).toBeVisible();
  });
});

it('reports a failed Showcase list request', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ message: 'Unavailable' }, 403));
  await renderScreen(<ShowcaseScreen />, { queryClient: createTestQueryClient() });
  await waitFor(() => {
    expect(screen.getByText('Could not load showcase games.')).toBeVisible();
  });
});
