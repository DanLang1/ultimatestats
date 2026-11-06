import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, screen, userEvent, waitFor, within } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';

import StatsScreen from '@/app/(main)/(hub)/(analytics)/stats';
import { MAX_SHARE_GAMES } from '@/lib/constants';
import type { SharedPayload } from '@/lib/sharing/types';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useGameStore } from '@/store/basic/gameStore';
import { useTournamentStore } from '@/store/tournamentStore';
import { createDeferred } from '@/test/deferred';
import { createAdvancedGameScenario } from '@/test/fixtures/advancedGameBuilder';
import { createSavedBasicGame, testTeam } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

jest.mock('@/lib/supabase', () => jest.requireActual('@/test/mocks/supabase'));

beforeEach(async () => {
  resetAllStores();
  resetMockRouter();
  await AsyncStorage.clear();
  useSavedAdvancedGamesStore.setState({ summariesLoaded: true });
});
afterEach(() => {
  jest.restoreAllMocks();
});

async function arrangeGames(kind: 'basic' | 'advanced') {
  if (kind === 'basic') {
    useGameStore.setState({
      savedTeams: [testTeam],
      savedGames: ['first', 'second'].map((id) => ({
        ...createSavedBasicGame(),
        id,
        team2Name: id === 'first' ? 'First Rival' : 'Second Rival',
      })),
    });
  } else {
    for (const id of ['first', 'second']) {
      await useSavedAdvancedGamesStore.getState().saveGame(
        createAdvancedGameScenario({
          id,
          status: 'final',
          sides: [
            {
              id: 'focus',
              label: 'Focus',
              sourceTeamId: testTeam.id,
              trackingMode: 'full-roster',
            },
            {
              id: 'opponent',
              label: id === 'first' ? 'First Rival' : 'Second Rival',
              trackingMode: 'anonymous',
            },
          ],
        }).build(),
      );
    }
  }
}

it.each(['basic', 'advanced'] as const)(
  'shares only selected %s games after confirmation',
  async (kind) => {
    await arrangeGames(kind);
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async () => new Response(null, { status: 201 }));
    const user = userEvent.setup();
    await renderScreen(<StatsScreen />);
    expect(screen.queryByText('Proceed')).not.toBeOnTheScreen();
    await user.press(screen.getByTestId('header-action-select'));
    await user.press(screen.getByText('First Rival'));
    await user.press(screen.getByText('Second Rival'));
    await user.press(screen.getByText('Second Rival'));
    await user.press(screen.getByLabelText('Share games'));
    expect(fetchSpy).not.toHaveBeenCalled();
    await user.press(screen.getByText('Proceed'));
    expect(await screen.findByText('Share Link Ready')).toBeVisible();
    const request = fetchSpy.mock.calls[0][1]!;
    const upload = JSON.parse(request.body as string) as { id: string; payload: SharedPayload };
    expect(upload.payload.type).toBe(kind === 'basic' ? 'games' : 'advanced-games');
    if (upload.payload.type !== 'games' && upload.payload.type !== 'advanced-games')
      throw new Error('Expected bulk share');
    expect(upload.payload.data.map((game) => game.id)).toEqual(['first']);
    expect(
      screen.getByText(`https://u-stat.app/s/${upload.payload.type}/${upload.id}`),
    ).toBeVisible();
    await user.press(screen.getByText('Close'));
    expect(screen.queryByTestId('saved-games-select-bar')).not.toBeOnTheScreen();
    expect(screen.getByText('Second Rival')).toBeVisible();
  },
);

it.each(['basic', 'advanced'] as const)(
  'opens combined stats for the selected %s games and keeps the selection',
  async (kind) => {
    await arrangeGames(kind);
    const user = userEvent.setup();
    await renderScreen(<StatsScreen />);
    await user.press(screen.getByTestId('header-action-select'));
    await user.press(screen.getByText('First Rival'));
    await user.press(screen.getByText('Second Rival'));
    await user.press(screen.getByText('View stats'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/combined-stats',
      params: {
        kind,
        gameIds: expect.stringMatching(/^(first,second|second,first)$/),
        excludedScrimmageCount: '0',
      },
    });
    expect(screen.getByText(/^2 selected/)).toBeVisible();
  },
);

it.each([
  ['basic', '/saved-games/[gameId]'],
  ['advanced', '/advanced-tracking/analytics/[gameId]'],
] as const)('opens a single selected %s game in its own stats', async (kind, pathname) => {
  await arrangeGames(kind);
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  await user.press(screen.getByTestId('header-action-select'));
  await user.press(screen.getByText('First Rival'));
  await user.press(screen.getByText('View stats'));
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith({ pathname, params: { gameId: 'first' } }),
  );
  expect(screen.getByText(/^1 selected/)).toBeVisible();
});

it('leaves the Stats tab for the Dashboard on Back', async () => {
  await renderScreen(<StatsScreen />);

  await userEvent.setup().press(screen.getByTestId('screen-header-back'));

  expect(router.navigate).toHaveBeenCalledWith('/dashboard');
  expect(router.back).not.toHaveBeenCalled();
});

it('selects and deselects every listed game, respecting the search', async () => {
  await arrangeGames('basic');
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  expect(screen.queryByText('Select all')).not.toBeOnTheScreen();

  await user.press(screen.getByTestId('header-action-select'));
  await user.press(screen.getByText('Select all'));
  expect(screen.getByText(/^2 selected/)).toBeVisible();

  await user.press(screen.getByText('Deselect all'));
  expect(screen.queryByText(/selected/)).not.toBeOnTheScreen();

  await user.type(screen.getByPlaceholderText('Search'), 'First');
  await user.press(screen.getByText('Select all'));
  expect(screen.getByText(/^1 selected/)).toBeVisible();
  expect(screen.getByText('Deselect all')).toBeVisible();
});

it('offers Select all again when a selected game is deleted elsewhere', async () => {
  await arrangeGames('basic');
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  await user.press(screen.getByTestId('header-action-select'));
  await user.press(screen.getByText('First Rival'));

  await act(() =>
    useGameStore.setState((state) => ({
      savedGames: state.savedGames.filter((game) => game.id !== 'first'),
    })),
  );

  expect(screen.getByText('Select all')).toBeVisible();
});

it('blocks sharing more advanced games than the share limit', async () => {
  const rivals = Array.from({ length: MAX_SHARE_GAMES + 1 }, (_, i) => `Rival ${i + 1}`);
  for (const [i, label] of rivals.entries()) {
    await useSavedAdvancedGamesStore.getState().saveGame(
      createAdvancedGameScenario({
        id: `advanced-${i}`,
        status: 'final',
        sides: [
          {
            id: 'focus',
            label: 'Focus',
            sourceTeamId: 'advanced-team',
            trackingMode: 'full-roster',
          },
          { id: 'opponent', label: `Advanced ${label}`, trackingMode: 'anonymous' },
        ],
      }).build(),
    );
  }
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  await user.press(screen.getByTestId('header-action-select'));

  for (const label of rivals) await user.press(screen.getByText(`Advanced ${label}`));
  await user.press(screen.getByLabelText('Share games'));
  expect(screen.getByText("Can't share these games")).toBeVisible();
  expect(
    screen.getByText(`You can share up to ${MAX_SHARE_GAMES} advanced games at a time.`),
  ).toBeVisible();
  await user.press(screen.getByText('OK'));
  expect(screen.queryByText('Share Data?')).not.toBeOnTheScreen();

  await user.press(screen.getByText(`Advanced ${rivals[0]}`));
  await user.press(screen.getByLabelText('Share games'));
  expect(screen.getByText('Share Data?')).toBeVisible();
});

it.each(['basic', 'advanced'] as const)(
  'deletes selected %s games and their tournament links after confirmation',
  async (kind) => {
    await arrangeGames(kind);
    const tournamentId = await useTournamentStore
      .getState()
      .addTournament('Invite', '2026-01-01', '2026-01-02');
    await useTournamentStore
      .getState()
      .addGamesToTournament(tournamentId, kind, ['first', 'second']);
    const user = userEvent.setup();
    await renderScreen(<StatsScreen />);
    await user.press(screen.getByTestId('header-action-select'));
    await user.press(screen.getByText('First Rival'));
    await user.press(screen.getByLabelText('Delete games'));
    expect(screen.getByText('Delete Games?')).toBeVisible();
    await user.press(screen.getByText('Delete'));
    await waitFor(() => {
      expect(screen.queryByText('First Rival')).not.toBeOnTheScreen();
    });
    expect(screen.getByText('Second Rival')).toBeVisible();
    expect(useTournamentStore.getState().gameLinks.map((link) => link.gameId)).toEqual(['second']);
    if (kind === 'basic') {
      expect(
        JSON.parse(
          (await AsyncStorage.getItem('ultimatestats-game-storage'))!,
        ).state.savedGames.map((game: { id: string }) => game.id),
      ).toEqual(['second']);
    } else {
      expect(await useSavedAdvancedGamesStore.getState().loadGame('first')).toBeNull();
      expect(await useSavedAdvancedGamesStore.getState().loadGame('second')).toMatchObject({
        id: 'second',
      });
    }
  },
);

it('cancels sharing without losing selection and clears selection when search changes', async () => {
  await arrangeGames('basic');
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  await user.press(screen.getByTestId('header-action-select'));
  await user.press(screen.getByText('First Rival'));
  await user.press(screen.getByLabelText('Share games'));
  await user.press(screen.getByTestId('share-confirm-cancel'));
  expect(screen.getByTestId('saved-games-select-bar')).toHaveTextContent(/1 selected/);
  await user.type(screen.getByPlaceholderText('Search'), 'Second');
  expect(screen.queryByTestId('saved-games-select-bar')).not.toBeOnTheScreen();
  expect(screen.queryByText('First Rival')).not.toBeOnTheScreen();
});

it.each(['basic', 'advanced'] as const)(
  'opens a %s saved game once during rapid taps',
  async (kind) => {
    await arrangeGames(kind);
    const user = userEvent.setup();
    await renderScreen(<StatsScreen />);
    await user.press(screen.getByText('First Rival'));
    await user.press(screen.getByText('Second Rival'));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({
      pathname:
        kind === 'basic' ? '/saved-games/[gameId]' : '/advanced-tracking/analytics/[gameId]',
      params: { gameId: 'first' },
    });
  },
);

it('waits for upload and clipboard completion before showing share results', async () => {
  await arrangeGames('basic');
  const upload = createDeferred<Response>();
  const copying = createDeferred<boolean>();
  const fetchSpy = jest.spyOn(global, 'fetch').mockReturnValue(upload.promise);
  const clipboard = jest.spyOn(Clipboard, 'setStringAsync').mockReturnValue(copying.promise);
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  await user.press(screen.getByTestId('header-action-select'));
  await user.press(screen.getByText('First Rival'));
  await user.press(screen.getByLabelText('Share games'));
  expect(screen.getByText(/names, lines, and stats/)).toBeVisible();
  await user.press(screen.getByText('Proceed'));
  await user.press(screen.getByTestId('share-confirm-cancel'));
  expect(screen.getByText('Share Data?')).toBeVisible();
  expect(screen.queryByText('Share Link Ready')).not.toBeOnTheScreen();
  await act(async () => upload.resolve(new Response(null, { status: 201 })));
  expect(await screen.findByText('Share Link Ready')).toBeVisible();
  await user.press(screen.getByText('Copy'));
  const request = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string) as { id: string };
  expect(clipboard).toHaveBeenCalledWith(`https://u-stat.app/s/games/${request.id}`);
  expect(screen.queryByText('Copied')).not.toBeOnTheScreen();
  await act(async () => copying.resolve(true));
  expect(screen.getByText('Copied')).toBeVisible();
  await user.press(screen.getByText('Close'));
  expect(screen.queryByText('Share Link Ready')).not.toBeOnTheScreen();
  expect(screen.queryByTestId('saved-games-select-bar')).not.toBeOnTheScreen();
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});

it('keeps a failed upload open and clears the error after a successful retry', async () => {
  await arrangeGames('basic');
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest
    .spyOn(global, 'fetch')
    .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Offline' }), { status: 400 }))
    .mockResolvedValueOnce(new Response(null, { status: 201 }));
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  await user.press(screen.getByTestId('header-action-select'));
  await user.press(screen.getByText('First Rival'));
  await user.press(screen.getByLabelText('Share games'));
  await user.press(screen.getByText('Proceed'));
  expect(
    await screen.findByText('Could not upload data for sharing. Please try again.'),
  ).toBeVisible();
  await user.press(screen.getByText('Proceed'));
  expect(await screen.findByText('Share Link Ready')).toBeVisible();
  expect(
    screen.queryByText('Could not upload data for sharing. Please try again.'),
  ).not.toBeOnTheScreen();
});

function arrangeSortableGames() {
  useGameStore.setState({
    savedGames: [
      { name: 'Light', opponent: 'Dark', day: 2, score: 7 },
      { name: 'Hybrid', opponent: 'Rivals', day: 3, score: 1 },
      { name: 'Alpha', opponent: 'Beta', day: 1, score: 4 },
    ].map(({ name, opponent, day, score }) => ({
      ...createSavedBasicGame(),
      id: name,
      // One team whose snapshot name changed between games.
      team1: { ...testTeam, name },
      team2Name: opponent,
      createdAt: Date.UTC(2026, 0, day),
      team1Score: score,
      team2Score: 0,
    })),
  });
}

it('sorts saved games oldest first and clears selection', async () => {
  arrangeSortableGames();
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  await user.press(screen.getByTestId('header-action-select'));
  await user.press(screen.getByText('Rivals'));
  expect(screen.getByTestId('saved-games-select-bar')).toHaveTextContent(/1 selected/);
  await user.press(screen.getByTestId('saved-games-sort'));
  await user.press(screen.getByTestId('saved-games-sort-option-oldest'));
  expect(screen.getAllByText(/^(Beta|Rivals|Dark)$/).map((node) => node.props.children)).toEqual([
    'Beta',
    'Dark',
    'Rivals',
  ]);
  expect(screen.queryByTestId('saved-games-sort-sheet')).not.toBeOnTheScreen();
  expect(within(screen.getByTestId('saved-games-sort')).getByText('Oldest')).toBeVisible();
  expect(screen.queryByTestId('saved-games-select-bar')).not.toBeOnTheScreen();
});

it('filters to a tournament from the sort sheet, clears it with the chip, and searches by tournament name', async () => {
  arrangeSortableGames();
  const tournamentId = await useTournamentStore
    .getState()
    .addTournament('Sectionals', '2026-01-01', '2026-01-02');
  await useTournamentStore.getState().addGamesToTournament(tournamentId, 'basic', ['Light']);
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);

  await user.press(screen.getByTestId('saved-games-sort'));
  await user.press(screen.getByTestId(`saved-games-tournament-option-${tournamentId}`));
  expect(screen.getByText('Dark')).toBeVisible();
  expect(screen.queryByText('Rivals')).not.toBeOnTheScreen();
  expect(screen.getByTestId('saved-games-tournament-chip')).toHaveTextContent(/Sectionals/);

  await user.press(screen.getByTestId('saved-games-tournament-chip'));
  expect(screen.getByText('Rivals')).toBeVisible();
  expect(screen.queryByTestId('saved-games-tournament-chip')).not.toBeOnTheScreen();

  await user.type(screen.getByPlaceholderText('Search'), 'sectionals');
  expect(screen.getByText('Dark')).toBeVisible();
  expect(screen.queryByText('Rivals')).not.toBeOnTheScreen();
});

it('finds games by the weekday shown in day headings and dates rows when ungrouped', async () => {
  arrangeSortableGames();
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  expect(screen.queryByText(/\d{1,2}:\d{2}/)).not.toBeOnTheScreen();
  const hybridWeekday = new Date(Date.UTC(2026, 0, 3)).toLocaleDateString(undefined, {
    weekday: 'short',
  });
  await user.type(screen.getByPlaceholderText('Search'), hybridWeekday);
  expect(screen.getByText('Rivals')).toBeVisible();
  expect(screen.queryByText('Dark')).not.toBeOnTheScreen();
  expect(screen.queryByText('Beta')).not.toBeOnTheScreen();

  await user.clear(screen.getByPlaceholderText('Search'));
  await user.press(screen.getByTestId('saved-games-sort'));
  await user.press(screen.getByTestId('saved-games-sort-option-points-desc'));
  expect(screen.getAllByText(/^[A-Z][a-z]{2} \d{1,2}(, \d{4})? · Basic$/)).toHaveLength(3);
  await user.type(screen.getByPlaceholderText('Search'), 'missing');
  expect(screen.getByText('No games in Hybrid match "missing"')).toBeVisible();
});

it.each([
  ['one tracked team', ['Light', 'Light'], '1–1'],
  ['a single game', ['Light'], null],
] as const)('shows a day record only for %s', async (_case, teamNames, expectedRecord) => {
  useGameStore.setState({
    savedGames: teamNames.map((name, i) => ({
      ...createSavedBasicGame(),
      id: `game-${i}`,
      team1: { ...testTeam, name },
      team2Name: `Rival ${i}`,
      createdAt: Date.UTC(2026, 0, 1, 12 + i),
      team1Score: i === 0 ? 5 : 1,
      team2Score: 3,
    })),
  });
  await renderScreen(<StatsScreen />);
  if (expectedRecord) {
    expect(screen.getByTestId('saved-games-day-record')).toHaveTextContent(expectedRecord);
  } else {
    expect(screen.queryByTestId('saved-games-day-record')).not.toBeOnTheScreen();
  }
});

async function arrangeMixedKinds() {
  const tournamentId = await useTournamentStore
    .getState()
    .addTournament('Invite', '2026-01-01', '2026-01-02');
  for (const gameType of ['game', 'scrimmage'] as const) {
    await useSavedAdvancedGamesStore.getState().saveGame(
      createAdvancedGameScenario({
        id: gameType,
        gameType,
        status: 'final',
        sides: [
          {
            id: 'focus',
            label: 'Light',
            trackingMode: 'full-roster',
            sourceTeamId: testTeam.id,
          },
          { id: 'opponent', label: `Advanced ${gameType}`, trackingMode: 'full-roster' },
        ],
      }).build(),
    );
  }
  useGameStore.setState({ savedTeams: [testTeam], savedGames: [createSavedBasicGame()] });
  return tournamentId;
}

it('enters bulk selection by long press and selects games of both kinds', async () => {
  await arrangeMixedKinds();
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  expect(screen.getByText('Scrimmage')).toBeVisible();
  expect(screen.getByText('Basic')).toBeVisible();
  expect(screen.getByTestId('header-action-select')).toHaveTextContent('Select');
  await user.longPress(screen.getByText('Rivals'), { duration: 400 });
  expect(screen.getByTestId('saved-games-select-bar')).toHaveTextContent(/1 selected/);
  expect(screen.getByTestId('header-action-select')).toHaveTextContent('Cancel');
  await user.press(screen.getByText('Advanced game'));
  expect(screen.getByTestId('saved-games-select-bar')).toHaveTextContent(/2 selected/);
  expect(router.push).not.toHaveBeenCalled();
  await user.press(screen.getByText('Rivals'));
  expect(screen.getByTestId('saved-games-select-bar')).toHaveTextContent(/1 selected/);
  await user.press(screen.getByTestId('header-action-select'));
  expect(screen.queryByTestId('saved-games-select-bar')).not.toBeOnTheScreen();
  expect(screen.getByTestId('header-action-select')).toHaveTextContent('Select');
});

it('explains why a selection of both kinds cannot be shared instead of sharing it', async () => {
  await arrangeMixedKinds();
  const fetchSpy = jest.spyOn(global, 'fetch');
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  await user.press(screen.getByTestId('header-action-select'));
  await user.press(screen.getByText('Rivals'));
  await user.press(screen.getByText('Advanced game'));
  expect(screen.getByLabelText('Share games')).toHaveProp(
    'accessibilityHint',
    'Share basic games or advanced games separately.',
  );
  await user.press(screen.getByLabelText('Share games'));
  expect(screen.getByText("Can't share these games")).toBeVisible();
  expect(screen.getByText('Share basic games or advanced games separately.')).toBeVisible();
  expect(screen.queryByText('Share Data?')).not.toBeOnTheScreen();
  expect(fetchSpy).not.toHaveBeenCalled();
});

it('opens the one game left when View stats skips a selected scrimmage', async () => {
  await arrangeMixedKinds();
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  await user.press(screen.getByTestId('header-action-select'));
  await user.press(screen.getByText('Advanced game'));
  await user.press(screen.getByText('Advanced scrimmage'));
  await user.press(screen.getByText('View stats'));

  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/advanced-tracking/analytics/[gameId]',
      params: { gameId: 'game' },
    }),
  );
});

it('offers a game type filter only when the team has both kinds', async () => {
  await arrangeGames('basic');
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  await user.press(screen.getByTestId('saved-games-sort'));

  expect(screen.getByTestId('saved-games-sort-sheet')).toBeVisible();
  expect(screen.queryByTestId('saved-games-kind-option-all')).not.toBeOnTheScreen();
});

it('filters to one game type, selects and views just those games, and clears it with the chip', async () => {
  await arrangeMixedKinds();
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);

  await user.press(screen.getByTestId('saved-games-sort'));
  await user.press(screen.getByTestId('saved-games-kind-option-advanced'));
  expect(screen.getByText('Advanced game')).toBeVisible();
  expect(screen.getByText('Advanced scrimmage')).toBeVisible();
  expect(screen.queryByText('Rivals')).not.toBeOnTheScreen();
  expect(screen.getByTestId('saved-games-kind-filter-chip')).toHaveTextContent(/Advanced/);

  await user.press(screen.getByTestId('header-action-select'));
  await user.press(screen.getByText('Select all'));
  expect(screen.getByText(/^2 selected/)).toBeVisible();
  await user.press(screen.getByText('View stats'));
  expect(screen.queryByText("Basic and advanced games can't be combined.")).not.toBeOnTheScreen();
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/advanced-tracking/analytics/[gameId]',
      params: { gameId: 'game' },
    }),
  );

  await user.press(screen.getByTestId('saved-games-kind-filter-chip'));
  expect(screen.getByText('Rivals')).toBeVisible();
  expect(screen.getByText('Advanced game')).toBeVisible();
  expect(screen.queryByTestId('saved-games-kind-filter-chip')).not.toBeOnTheScreen();
  expect(screen.queryByTestId('saved-games-select-bar')).not.toBeOnTheScreen();
});

it('drops the game type filter when the team no longer has games of that type', async () => {
  await arrangeMixedKinds();
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  await user.press(screen.getByTestId('saved-games-sort'));
  await user.press(screen.getByTestId('saved-games-kind-option-basic'));
  expect(screen.getByText('Rivals')).toBeVisible();

  await act(() => useGameStore.setState({ savedGames: [] }));

  expect(screen.queryByTestId('saved-games-kind-filter-chip')).not.toBeOnTheScreen();
  expect(screen.getByText('Advanced game')).toBeVisible();
  expect(screen.getByText('Advanced scrimmage')).toBeVisible();
});

it('explains when a tournament has no games of the filtered type', async () => {
  const tournamentId = await arrangeMixedKinds();
  await useTournamentStore
    .getState()
    .addGamesToTournament(tournamentId, 'basic', [createSavedBasicGame().id]);
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);

  await user.press(screen.getByTestId('saved-games-sort'));
  await user.press(screen.getByTestId(`saved-games-tournament-option-${tournamentId}`));
  await user.press(screen.getByTestId('saved-games-sort'));
  await user.press(screen.getByTestId('saved-games-kind-option-advanced'));

  expect(screen.getByText('No advanced games in this tournament')).toBeVisible();
});

it('blames the game type filter, not the team, when it hides the team’s matches', async () => {
  await arrangeMixedKinds();
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);

  await user.press(screen.getByTestId('saved-games-sort'));
  await user.press(screen.getByTestId('saved-games-kind-option-basic'));
  await user.type(screen.getByPlaceholderText('Search'), 'Advanced');

  expect(screen.getByText('No basic games match "Advanced"')).toBeVisible();
});

it('combines the selected games without their scrimmages and counts what it skipped', async () => {
  for (const [id, gameType] of [
    ['first', 'game'],
    ['second', 'game'],
    ['scrim', 'scrimmage'],
  ] as const) {
    await useSavedAdvancedGamesStore.getState().saveGame(
      createAdvancedGameScenario({
        id,
        gameType,
        status: 'final',
        sides: [
          { id: 'focus', label: 'Focus', trackingMode: 'full-roster' },
          { id: 'opponent', label: `${id} Rival`, trackingMode: 'full-roster' },
        ],
      }).build(),
    );
  }
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  await user.press(screen.getByTestId('header-action-select'));
  await user.press(screen.getByText('Select all'));
  await user.press(screen.getByText('View stats'));

  expect(router.push).toHaveBeenCalledWith({
    pathname: '/combined-stats',
    params: {
      kind: 'advanced',
      gameIds: expect.stringMatching(/^(first,second|second,first)$/),
      excludedScrimmageCount: '1',
    },
  });
});

it('adds the selected games to a tournament and leaves selection mode', async () => {
  const tournamentId = await arrangeMixedKinds();
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  await user.press(screen.getByTestId('header-action-select'));
  await user.press(screen.getByText('Advanced game'));
  await user.press(screen.getByText('Advanced scrimmage'));
  await user.press(screen.getByLabelText('Add to tournament'));
  await user.press(screen.getByText('Invite'));
  await waitFor(() => {
    expect(screen.queryByTestId('saved-games-select-bar')).not.toBeOnTheScreen();
  });
  expect(screen.getByTestId('header-action-select')).toHaveTextContent('Select');
  expect(
    useTournamentStore
      .getState()
      .gameLinks.filter((link) => link.tournamentId === tournamentId)
      .map((link) => `${link.gameKind}:${link.gameId}`)
      .sort((a, b) => a.localeCompare(b)),
  ).toEqual(['advanced:game', 'advanced:scrimmage']);
});

it('confirms deleting a tournament inside the picker sheet', async () => {
  await arrangeMixedKinds();
  const emptyTournamentId = await useTournamentStore
    .getState()
    .addTournament('Empty Invite', '2026-02-01', '2026-02-02');
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  await user.press(screen.getByTestId('header-action-select'));
  await user.press(screen.getByText('Advanced game'));
  await user.press(screen.getByLabelText('Add to tournament'));

  // The alert modal can't present over the sheet, so the sheet confirms the delete itself.
  await user.press(screen.getByLabelText('Delete Empty Invite'));
  expect(screen.getByText('Delete Empty Invite?')).toBeVisible();
  // The header also reads Cancel while selecting; the sheet's renders after it.
  const cancelLabels = screen.getAllByText('Cancel');
  await user.press(cancelLabels[cancelLabels.length - 1]);
  expect(screen.getByText('Select Tournament')).toBeVisible();

  await user.press(screen.getByLabelText('Delete Empty Invite'));
  await user.press(screen.getByText('Delete tournament'));
  expect(useTournamentStore.getState().tournaments.some(({ id }) => id === emptyTournamentId)).toBe(
    false,
  );
  expect(screen.getByText('Select Tournament')).toBeVisible();
});

it('hands the selected games to a tournament created from the picker', async () => {
  await arrangeGames('basic');
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  await user.press(screen.getByTestId('header-action-select'));
  await user.press(screen.getByText('Select all'));
  await user.press(screen.getByLabelText('Add to tournament'));
  await user.press(screen.getByText('Create New Tournament'));

  expect(router.push).toHaveBeenCalledWith({
    pathname: '/create-tournament',
    params: { gameKind: 'basic', gameIds: expect.stringMatching(/^(first,second|second,first)$/) },
  });
});

it('deletes a selection of both kinds', async () => {
  await arrangeMixedKinds();
  const basicGameId = useGameStore.getState().savedGames[0].id;
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  await user.press(screen.getByTestId('header-action-select'));
  await user.press(screen.getByText('Rivals'));
  await user.press(screen.getByText('Advanced game'));
  await user.press(screen.getByLabelText('Delete games'));
  await user.press(screen.getByText('Delete'));
  await waitFor(() => {
    expect(screen.queryByText('Rivals')).not.toBeOnTheScreen();
  });
  expect(screen.queryByText('Advanced game')).not.toBeOnTheScreen();
  expect(screen.getByText('Advanced scrimmage')).toBeVisible();
  expect(useGameStore.getState().savedGames.map((game) => game.id)).not.toContain(basicGameId);
  expect(await useSavedAdvancedGamesStore.getState().loadGame('game')).toBeNull();
});

describe('team scope', () => {
  const owls = { id: 'team-owls', name: 'Owls', roster: [] };

  async function arrangeTwoTeams() {
    useGameStore.setState({
      savedTeams: [testTeam, owls],
      savedGames: [
        { ...createSavedBasicGame(), id: 'windchill-basic', team2Name: 'Basic Rival' },
        {
          ...createSavedBasicGame(),
          id: 'owls-basic',
          team1: owls,
          team2Name: 'Owls Rival',
          createdAt: Date.UTC(2026, 0, 5),
        },
      ],
    });
    await useSavedAdvancedGamesStore.getState().saveGame(
      createAdvancedGameScenario({
        id: 'windchill-advanced',
        status: 'final',
        sides: [
          {
            id: 'focus',
            label: 'Old Windchill',
            trackingMode: 'full-roster',
            sourceTeamId: testTeam.id,
          },
          { id: 'opponent', label: 'Advanced Rival', trackingMode: 'anonymous' },
        ],
      }).build(),
    );
  }

  it('opens on the newest game’s team and switches teams from the title', async () => {
    await arrangeTwoTeams();
    const user = userEvent.setup();
    await renderScreen(<StatsScreen />);

    expect(within(screen.getByTestId('saved-games-team-switcher')).getByText('Owls')).toBeVisible();
    expect(screen.getByText('Owls Rival')).toBeVisible();
    expect(screen.queryByText('Basic Rival')).not.toBeOnTheScreen();
    await user.type(screen.getByPlaceholderText('Search'), 'Owls');

    await user.press(screen.getByTestId('saved-games-team-switcher'));
    expect(screen.getByTestId(`saved-games-team-option-${testTeam.id}`)).toHaveTextContent(
      /2 games/,
    );
    await user.press(screen.getByTestId(`saved-games-team-option-${testTeam.id}`));

    expect(
      within(screen.getByTestId('saved-games-team-switcher')).getByText('Windchill'),
    ).toBeVisible();
    expect(screen.getByText('Basic Rival')).toBeVisible();
    expect(screen.getByText('Advanced Rival')).toBeVisible();
    expect(screen.queryByText('Owls Rival')).not.toBeOnTheScreen();
    expect(screen.getByPlaceholderText('Search')).toHaveDisplayValue('');
  });

  it('falls back to the next newest team after deleting the shown team’s last game', async () => {
    await arrangeTwoTeams();
    const user = userEvent.setup();
    await renderScreen(<StatsScreen />);

    await user.press(screen.getByTestId('header-action-select'));
    await user.press(screen.getByText('Owls Rival'));
    await user.press(screen.getByLabelText('Delete games'));
    await user.press(screen.getByText('Delete'));

    expect(await screen.findByText('Basic Rival')).toBeVisible();
    expect(screen.queryByTestId('saved-games-team-switcher')).not.toBeOnTheScreen();
  });

  it('clears the search when deleting the shown team’s last game moves to another team', async () => {
    await arrangeTwoTeams();
    const user = userEvent.setup();
    await renderScreen(<StatsScreen />);

    await user.type(screen.getByPlaceholderText('Search'), 'Owls');
    await user.press(screen.getByTestId('header-action-select'));
    await user.press(screen.getByText('Owls Rival'));
    await user.press(screen.getByLabelText('Delete games'));
    await user.press(screen.getByText('Delete'));

    expect(await screen.findByText('Basic Rival')).toBeVisible();
    expect(screen.getByPlaceholderText('Search')).toHaveDisplayValue('');
  });

  it('shows the team name without a switcher or other teams when there is one team', async () => {
    await arrangeGames('basic');
    await renderScreen(<StatsScreen />);

    expect(screen.queryByTestId('saved-games-team-switcher')).not.toBeOnTheScreen();
    expect(screen.queryByText('SAVED GAMES')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('saved-games-other-teams')).not.toBeOnTheScreen();
  });

  it('switches to another team from the end of the list', async () => {
    await arrangeTwoTeams();
    const user = userEvent.setup();
    await renderScreen(<StatsScreen />);

    expect(screen.getByLabelText('Switch to Windchill, 2 games')).toBeVisible();
    await user.press(screen.getByTestId('header-action-select'));
    expect(screen.queryByTestId('saved-games-other-teams')).not.toBeOnTheScreen();
    await user.press(screen.getByTestId('header-action-select'));
    await user.type(screen.getByPlaceholderText('Search'), 'Owls');

    await user.press(screen.getByTestId(`saved-games-other-team-${testTeam.id}`));

    expect(
      within(screen.getByTestId('saved-games-team-switcher')).getByText('Windchill'),
    ).toBeVisible();
    expect(screen.getByText('Basic Rival')).toBeVisible();
    expect(screen.queryByText('Owls Rival')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Switch to Owls, 1 game')).toBeVisible();
    expect(screen.getByPlaceholderText('Search')).toHaveDisplayValue('');
  });

  it('lists up to four other teams in full', async () => {
    const teams = ['Ants', 'Bees', 'Crows', 'Doves', 'Eagles'].map((name) => ({
      id: `team-${name}`,
      name,
      roster: [],
    }));
    useGameStore.setState({
      savedTeams: teams,
      savedGames: teams.map((team, i) => ({
        ...createSavedBasicGame(),
        id: `${team.name}-game`,
        team1: team,
        team2Name: `${team.name} Rival`,
        createdAt: Date.UTC(2026, 0, 10 - i),
      })),
    });
    await renderScreen(<StatsScreen />);

    const footer = screen.getByTestId('saved-games-other-teams');
    for (const name of ['Bees', 'Crows', 'Doves', 'Eagles']) {
      expect(within(footer).getByText(name)).toBeVisible();
    }
    expect(screen.queryByTestId('saved-games-other-teams-all')).not.toBeOnTheScreen();
  });

  it('lists the three newest of five other teams and opens the team sheet for the rest', async () => {
    const teams = ['Ants', 'Bees', 'Crows', 'Doves', 'Eagles', 'Finches'].map((name) => ({
      id: `team-${name}`,
      name,
      roster: [],
    }));
    useGameStore.setState({
      savedTeams: teams,
      savedGames: teams.map((team, i) => ({
        ...createSavedBasicGame(),
        id: `${team.name}-game`,
        team1: team,
        team2Name: `${team.name} Rival`,
        createdAt: Date.UTC(2026, 0, 10 - i),
      })),
    });
    const user = userEvent.setup();
    await renderScreen(<StatsScreen />);

    const footer = screen.getByTestId('saved-games-other-teams');
    expect(within(footer).getByText('Bees')).toBeVisible();
    expect(within(footer).getByText('Doves')).toBeVisible();
    expect(within(footer).queryByText('Eagles')).not.toBeOnTheScreen();

    await user.press(screen.getByLabelText('See all 5 teams'));

    expect(screen.getByTestId('saved-games-team-option-team-Finches')).toBeVisible();
  });

  it('blames the tournament filter, not the team, when it hides the team’s matches', async () => {
    await arrangeTwoTeams();
    useGameStore.setState((state) => ({
      savedGames: [
        ...state.savedGames,
        {
          ...createSavedBasicGame(),
          id: 'owls-unfiled',
          team1: owls,
          team2Name: 'Basic Hawks',
          createdAt: Date.UTC(2026, 0, 4),
        },
      ],
    }));
    const tournamentId = await useTournamentStore
      .getState()
      .addTournament('Regionals', '2026-01-05', '2026-01-05');
    await useTournamentStore.getState().addGamesToTournament(tournamentId, 'basic', ['owls-basic']);
    const user = userEvent.setup();
    await renderScreen(<StatsScreen />);

    await user.press(screen.getByTestId('saved-games-sort'));
    await user.press(screen.getByTestId(`saved-games-tournament-option-${tournamentId}`));
    await user.type(screen.getByPlaceholderText('Search'), 'Basic');

    expect(screen.getByText('No games in Regionals match "Basic"')).toBeVisible();
    expect(screen.queryByText('No games in Owls match "Basic"')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('saved-games-search-other-teams')).not.toBeOnTheScreen();
  });

  it('offers other teams’ search matches and keeps the search after switching', async () => {
    await arrangeTwoTeams();
    const user = userEvent.setup();
    await renderScreen(<StatsScreen />);

    await user.type(screen.getByPlaceholderText('Search'), 'Basic');

    expect(screen.getByText('No games in Owls match "Basic"')).toBeVisible();
    expect(
      within(screen.getByTestId('saved-games-search-other-teams')).getByText(
        'Found in other teams',
      ),
    ).toBeVisible();
    expect(screen.queryByTestId('saved-games-other-teams')).not.toBeOnTheScreen();

    await user.press(screen.getByLabelText('Switch to Windchill, 1 match'));

    expect(
      within(screen.getByTestId('saved-games-team-switcher')).getByText('Windchill'),
    ).toBeVisible();
    expect(screen.getByPlaceholderText('Search')).toHaveDisplayValue('Basic');
    expect(screen.getByText('Basic Rival')).toBeVisible();
    expect(screen.queryByText('Advanced Rival')).not.toBeOnTheScreen();
  });
});
