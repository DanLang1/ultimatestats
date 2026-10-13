import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';

import ImportScreen from '@/app/(main)/Import';
import ImportTeamScreen from '@/app/(main)/ImportTeam';
import {
  serializeAdvancedGame,
  serializeAdvancedGames,
  serializeGame,
  serializeGames,
  serializeTeam,
} from '@/lib/sharing/serialize';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useGameStore } from '@/store/basic/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { createDeferred, holdAsyncStorageWrites } from '@/test/deferred';
import { jsonResponse, requestUrl } from '@/test/fetch';
import {
  createAdvancedGameScenario,
  participantRef,
  UNTRACKED_PLAYER,
} from '@/test/fixtures/advancedGameBuilder';
import { createSavedBasicGame, testTeam } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter, setMockSearchParams } from '@/test/mocks/expoRouter';
import { createTestQueryClient, renderScreen } from '@/test/render';

jest.mock('@/lib/supabase', () => jest.requireActual('@/test/mocks/supabase'));
jest.mock('expo-clipboard', () => ({ getStringAsync: jest.fn() }));

beforeEach(async () => {
  resetAllStores();
  resetMockRouter();
  await AsyncStorage.clear();
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('import routes', () => {
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

describe('shared-link import', () => {
  beforeEach(() => {
    setMockSearchParams({ shareId: 'share-1' });
  });
  const advanced = (id: string) =>
    createAdvancedGameScenario({ id, status: 'final' })
      .hold({
        puller: UNTRACKED_PLAYER,
        receiver: participantRef('alex'),
        scorer: participantRef('blair'),
      })
      .build();

  it.each(['game', 'advanced-game', 'games', 'advanced-games'] as const)(
    'previews and confirms a %s import with an existing saved copy',
    async (kind) => {
      const basicGames = [
        { ...createSavedBasicGame(), id: 'first', team2Name: 'New Rivals' },
        { ...createSavedBasicGame(), id: 'second', team2Name: 'Other Rivals' },
      ];
      const advancedGames = [advanced('first'), advanced('second')];
      let payload;
      if (kind === 'game') payload = serializeGame(basicGames[0]);
      else if (kind === 'games') payload = serializeGames(basicGames);
      else if (kind === 'advanced-game') payload = serializeAdvancedGame(advancedGames[0]);
      else payload = serializeAdvancedGames(advancedGames);
      if (kind === 'game' || kind === 'games')
        useGameStore.setState({ savedGames: [{ ...basicGames[0], team2Name: 'Old Rivals' }] });
      else await useSavedAdvancedGamesStore.getState().saveGame(advancedGames[0]);
      const client = createTestQueryClient();
      client.setQueryData(['sharePayload', 'share-1'], payload);
      const user = userEvent.setup();
      await renderScreen(<ImportScreen />, { queryClient: client });
      if (kind === 'game' || kind === 'advanced-game')
        expect(
          screen.getByText('You already have this game. Importing will replace your saved copy.'),
        ).toBeVisible();
      else expect(screen.getByText('1 new · 1 re-imported')).toBeVisible();
      await user.press(screen.getByText('Import'));
      await waitFor(() => {
        expect(
          screen.getByText(
            kind === 'game' || kind === 'advanced-game' ? 'Game imported!' : '2 games imported!',
          ),
        ).toBeVisible();
      });
      const ids = kind === 'game' || kind === 'advanced-game' ? ['first'] : ['first', 'second'];
      if (kind === 'game' || kind === 'games') {
        expect(useGameStore.getState().savedGames.map(({ id }) => id)).toEqual(ids);
        expect(useGameStore.getState().savedGames[0]).toMatchObject({
          team2Name: 'New Rivals',
          importedAt: expect.any(Number),
        });
      } else {
        for (const id of ids)
          expect(await useSavedAdvancedGamesStore.getState().loadGame(id)).toMatchObject({
            importedAt: expect.any(Number),
          });
      }
      await user.press(
        screen.getByText(kind === 'game' || kind === 'advanced-game' ? 'View Game' : 'View Games'),
      );
      expect(router.dismissTo).toHaveBeenCalledWith('/');
      if (kind === 'game')
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/saved-games/[gameId]',
          params: { gameId: 'first' },
        });
      else if (kind === 'advanced-game')
        expect(router.push).toHaveBeenCalledWith({
          pathname: '/advancedTracking/analytics/[gameId]',
          params: { gameId: 'first' },
        });
      else expect(router.push).toHaveBeenCalledWith('/SavedGameStats');
    },
  );

  it.each([false, true])(
    'imports a roster with presets while a game is active=%s',
    async (active) => {
      const incoming = { ...testTeam, id: 'incoming', name: 'Imported Team' };
      const previous = useGameStore.getState().currentTeam;
      if (active) useGameStore.setState({ team1Score: 1 });
      const preset = {
        id: 'preset',
        name: 'Starting Line',
        teamId: incoming.id,
        playerIds: ['player-alex'],
      };
      const client = createTestQueryClient();
      client.setQueryData(['sharePayload', 'share-1'], serializeTeam(incoming, [preset]));
      await renderScreen(<ImportScreen />, { queryClient: client });
      const user = userEvent.setup();
      await user.press(screen.getByText('Import'));
      expect(await screen.findByText('Team imported!')).toBeVisible();
      expect(useGameStore.getState().savedTeams).toContainEqual(incoming);
      expect(useLinePresetsStore.getState().presets).toContainEqual(preset);
      expect(useGameStore.getState().currentTeam.id).toBe(active ? previous.id : incoming.id);
      await user.press(screen.getByText('View Team'));
      expect(router.push).toHaveBeenCalledWith('/EditRoster');
    },
  );

  it('keeps an existing roster when the recipient declines the update', async () => {
    useGameStore.setState({ savedTeams: [testTeam] });
    const client = createTestQueryClient();
    client.setQueryData(
      ['sharePayload', 'share-1'],
      serializeTeam({ ...testTeam, roster: [] }, []),
    );
    await renderScreen(<ImportScreen />, { queryClient: client });
    expect(screen.getByText('You already have Windchill')).toBeVisible();
    await userEvent.setup().press(screen.getByText('Keep Mine'));
    expect(useGameStore.getState().savedTeams).toEqual([testTeam]);
    expect(router.dismissTo).toHaveBeenCalledWith('/');
  });

  it('loads the requested public record and counts a view after receiving a valid payload', async () => {
    const pendingResponse = createDeferred<Response>();
    jest.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = requestUrl(input);
      return url.includes('/rpc/') ? Promise.resolve(jsonResponse(null)) : pendingResponse.promise;
    });
    const client = createTestQueryClient();
    await renderScreen(<ImportScreen />, { queryClient: client });
    expect(screen.getByText('Loading shared data...')).toBeVisible();
    await act(() => {
      pendingResponse.resolve(jsonResponse({ payload: serializeGame(createSavedBasicGame()) }));
    });
    expect(await screen.findByText('Import game?')).toBeVisible();
    expect(
      screen.queryByText('You already have this game. Importing will replace your saved copy.'),
    ).not.toBeOnTheScreen();
    await userEvent.setup().press(screen.getByText('Cancel'));
    expect(useGameStore.getState().savedGames).toEqual([]);
    expect(router.dismissTo).toHaveBeenCalledWith('/');
  });

  it('offers recovery when the public record cannot be downloaded', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse({ message: 'Expired' }, 403));
    const client = createTestQueryClient();
    await renderScreen(<ImportScreen />, { queryClient: client });
    expect(
      await screen.findByText('Could not load shared data. Please try again later.'),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await userEvent.setup().press(screen.getByText('OK'));
    expect(router.dismissTo).toHaveBeenCalledWith('/');
  });

  it.each([
    [
      'a missing record',
      jsonResponse({ code: 'PGRST116', message: 'No rows' }, 406),
      'This share link was not found. It may have been removed or mistyped.',
    ],
    [
      'a payload from a newer app',
      jsonResponse({ payload: { ...serializeGame(createSavedBasicGame()), schemaVersion: 999 } }),
      'This was shared from a newer version of U-Stat. Update the app to import it.',
    ],
    [
      'a payload over the import limits',
      jsonResponse({
        payload: serializeGames(
          Array.from({ length: 11 }, (_, i) => ({ ...createSavedBasicGame(), id: `game-${i}` })),
        ),
      }),
      'This shared data is larger than the app can import.',
    ],
    [
      'a corrupt payload',
      jsonResponse({ payload: { ...serializeGame(createSavedBasicGame()), data: null } }),
      'This shared data is invalid or incomplete and cannot be imported.',
    ],
  ])('explains %s', async (_case, response, message) => {
    jest.spyOn(global, 'fetch').mockResolvedValue(response);
    await renderScreen(<ImportScreen />, { queryClient: createTestQueryClient() });
    expect(await screen.findByText(message)).toBeVisible();
  });

  it.each(['game', 'games', 'team'] as const)(
    'keeps %s import pending until persistence completes',
    async (kind) => {
      const game = createSavedBasicGame();
      let payload = serializeGame(game);
      let doneMessage = 'Game imported!';
      if (kind === 'team') {
        payload = serializeTeam(testTeam, [
          { id: 'preset', name: 'Starting Line', teamId: testTeam.id, playerIds: ['player-alex'] },
        ]);
        doneMessage = 'Team imported!';
      } else if (kind === 'games') {
        payload = serializeGames([game]);
        doneMessage = '1 game imported!';
      }
      const client = createTestQueryClient();
      client.setQueryData(['sharePayload', 'share-1'], payload);
      const save = holdAsyncStorageWrites(
        (key) => kind !== 'team' || key === 'ultimatestats-line-presets',
      );
      await renderScreen(<ImportScreen />, { queryClient: client });
      await userEvent.setup().press(screen.getByText('Import'));
      expect(await screen.findByText('Importing...')).toBeVisible();
      expect(screen.queryByText(/imported!/)).not.toBeOnTheScreen();
      expect(screen.queryByText(/^View (Game|Games|Team)$/)).not.toBeOnTheScreen();
      expect(router.push).not.toHaveBeenCalled();
      await save.held;
      await save.release();
      expect(await screen.findByText(doneMessage)).toBeVisible();
    },
  );

  it('shows a save failure instead of offering an unsaved imported game', async () => {
    const client = createTestQueryClient();
    client.setQueryData(['sharePayload', 'share-1'], serializeGame(createSavedBasicGame()));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    await renderScreen(<ImportScreen />, { queryClient: client });
    await userEvent.setup().press(screen.getByText('Import'));
    expect(
      await screen.findByText(
        'Could not save imported data. Please reopen the link and try again.',
      ),
    ).toBeVisible();
    expect(screen.queryByText('Game imported!')).not.toBeOnTheScreen();
    expect(screen.queryByText('View Game')).not.toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('USAU team import', () => {
  const teamLink = 'https://play.usaultimate.org/teams/events/team/?TeamId=123';
  beforeEach(() => {
    useGameStore.setState({ currentTeam: testTeam, savedTeams: [testTeam] });
  });

  it.each([false, true])(
    'waits for roster persistence and preserves the active team when gameActive=%s',
    async (gameActive) => {
      useGameStore.setState({ team1Score: gameActive ? 1 : 0 });
      jest.mocked(Clipboard.getStringAsync).mockResolvedValue(`  ${teamLink}  `);
      const rosterResponse = createDeferred<Response>();
      const fetchSpy = jest.spyOn(global, 'fetch').mockReturnValue(rosterResponse.promise);
      const user = userEvent.setup();
      await renderScreen(<ImportTeamScreen />);
      await user.press(screen.getByText('Paste'));
      await user.press(screen.getByText('Full'));
      await user.press(screen.getByText('Fetch Roster'));
      expect(screen.getByText('Importing Roster')).toBeVisible();
      expect(screen.getByText('Fetching...')).toBeDisabled();
      expect(new URL(fetchSpy.mock.calls[0][0] as string).searchParams.get('format')).toBe('full');
      const save = holdAsyncStorageWrites((key) => key === 'ultimatestats-game-storage');
      await act(async () => {
        rosterResponse.resolve(
          new Response(
            JSON.stringify({
              team: { teamname: 'Imported Club' },
              players: [{ name: 'Robin', position: 'Handler' }],
            }),
            { status: 200 },
          ),
        );
      });
      expect(router.replace).not.toHaveBeenCalled();
      expect(screen.queryByText('Team Imported')).not.toBeOnTheScreen();
      await save.release();
      const persisted = JSON.parse(
        (await AsyncStorage.getItem('ultimatestats-game-storage'))!,
      ).state;
      expect(
        persisted.savedTeams.find((team: { name: string }) => team.name === 'Imported Club').roster,
      ).toEqual([expect.objectContaining({ name: 'Robin', role: 'handler', isActive: true })]);
      if (gameActive) {
        expect(screen.getByText('Team Imported')).toBeVisible();
        expect(useGameStore.getState().currentTeam.id).toBe(testTeam.id);
        await user.press(screen.getByText('OK'));
        expect(router.back).toHaveBeenCalled();
      } else {
        expect(useGameStore.getState().currentTeam.name).toBe('Imported Club');
        expect(router.replace).toHaveBeenCalledWith({
          pathname: '/EditRoster',
          params: { teamName: 'Imported Club' },
        });
      }
    },
  );

  it('clears a rejected-domain error after pasting a valid team URL', async () => {
    const user = userEvent.setup();
    await renderScreen(<ImportTeamScreen />);
    await user.type(screen.getByPlaceholderText('USAU Team URL'), 'https://example.com/team');
    await user.press(screen.getByText('Fetch Roster'));
    expect(screen.getByText('Must be a USA Ultimate link')).toBeVisible();
    jest.mocked(Clipboard.getStringAsync).mockResolvedValue(teamLink);
    await user.press(screen.getByText('Paste'));
    expect(screen.getByDisplayValue(teamLink)).toBeVisible();
    expect(screen.queryByText('Must be a USA Ultimate link')).not.toBeOnTheScreen();
  });

  it.each([
    [
      'a 503 response',
      () =>
        jest
          .spyOn(global, 'fetch')
          .mockResolvedValue(
            new Response(JSON.stringify({ message: 'Roster is private' }), { status: 503 }),
          ),
      'Import Request Failed',
    ],
    [
      'a malformed roster',
      () =>
        jest
          .spyOn(global, 'fetch')
          .mockResolvedValue(new Response(JSON.stringify({ players: [{ name: 42 }] }))),
      'Unexpected Response',
    ],
    [
      'an empty roster',
      () =>
        jest
          .spyOn(global, 'fetch')
          .mockResolvedValue(new Response(JSON.stringify({ players: [] }))),
      'No Players Found',
    ],
    [
      'a network failure',
      () => {
        jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Offline'));
        jest.spyOn(console, 'error').mockImplementation(() => {});
      },
      'Network Error',
    ],
  ])(
    'reports an unusable roster response (%s) without altering teams',
    async (_name, arrange, title) => {
      arrange();
      const user = userEvent.setup();
      await renderScreen(<ImportTeamScreen />);
      await user.type(screen.getByPlaceholderText('USAU Team URL'), teamLink);
      await user.press(screen.getByText('Fetch Roster'));
      expect(await screen.findByText(title)).toBeVisible();
      expect(useGameStore.getState().savedTeams).toEqual([testTeam]);
      expect(router.replace).not.toHaveBeenCalled();
      await user.press(screen.getByText('OK'));
      expect(screen.getByText('Fetch Roster')).toBeEnabled();
    },
  );

  it.each(['empty', 'unavailable'] as const)(
    'reports an %s clipboard and leaves typed input intact',
    async (condition) => {
      jest.mocked(Clipboard.getStringAsync).mockReset();
      if (condition === 'empty') jest.mocked(Clipboard.getStringAsync).mockResolvedValue('  ');
      else
        jest.mocked(Clipboard.getStringAsync).mockRejectedValue(new Error('Clipboard unavailable'));
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();
      await renderScreen(<ImportTeamScreen />);
      await user.type(screen.getByPlaceholderText('USAU Team URL'), teamLink);
      await user.press(screen.getByText('Paste'));
      expect(
        await screen.findByText(condition === 'empty' ? 'Clipboard Empty' : 'Paste Failed'),
      ).toBeVisible();
      await user.press(screen.getByText('OK'));
      expect(screen.getByDisplayValue(teamLink)).toBeVisible();
    },
  );
});
