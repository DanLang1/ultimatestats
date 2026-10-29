import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, screen, userEvent, waitFor, within } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';

import StatsScreen from '@/app/(main)/(hub)/(analytics)/stats';
import type { SharedPayload } from '@/lib/sharing/types';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useGameStore } from '@/store/basic/gameStore';
import { useTournamentStore } from '@/store/tournamentStore';
import { useTutorialStore } from '@/store/tutorialStore';
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
            { id: 'focus', label: 'Focus', trackingMode: 'full-roster' },
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
    await user.press(screen.getByText('Share (1)'));
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
    expect(screen.queryByText('Share (1)')).not.toBeOnTheScreen();
    expect(screen.getByText('Second Rival')).toBeVisible();
  },
);

it('caps advanced game shares at four while basic shares allow more', async () => {
  const rivals = ['Rival A', 'Rival B', 'Rival C', 'Rival D', 'Rival E'];
  useGameStore.setState({
    savedTeams: [testTeam],
    savedGames: rivals.map((team2Name, i) => ({
      ...createSavedBasicGame(),
      id: `basic-${i}`,
      team2Name: `Basic ${team2Name}`,
    })),
  });
  for (const [i, label] of rivals.entries()) {
    await useSavedAdvancedGamesStore.getState().saveGame(
      createAdvancedGameScenario({
        id: `advanced-${i}`,
        status: 'final',
        sides: [
          { id: 'focus', label: 'Focus', trackingMode: 'full-roster' },
          { id: 'opponent', label: `Advanced ${label}`, trackingMode: 'anonymous' },
        ],
      }).build(),
    );
  }
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  await user.press(screen.getByTestId('header-action-select'));

  for (const label of rivals) await user.press(screen.getByText(`Advanced ${label}`));
  await user.press(screen.getByText('Share (5)'));
  expect(screen.queryByText('Share Data?')).not.toBeOnTheScreen();
  await user.press(screen.getByText('Advanced Rival E'));
  await user.press(screen.getByText('Share (4)'));
  expect(screen.getByText('Share Data?')).toBeVisible();
  await user.press(screen.getByText('Cancel'));

  for (const label of rivals.slice(0, 4)) await user.press(screen.getByText(`Advanced ${label}`));
  for (const label of rivals) await user.press(screen.getByText(`Basic ${label}`));
  await user.press(screen.getByText('Share (5)'));
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
    await user.press(screen.getByText('Delete (1)'));
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
  await user.press(screen.getByText('Share (1)'));
  await user.press(screen.getByText('Cancel'));
  expect(screen.getByText('Share (1)')).toBeVisible();
  await user.type(screen.getByPlaceholderText('Search teams or dates...'), 'Second');
  expect(screen.queryByText('Share (1)')).not.toBeOnTheScreen();
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
  await user.press(screen.getByText('Share (1)'));
  expect(screen.getByText(/names, lines, and stats/)).toBeVisible();
  await user.press(screen.getByText('Proceed'));
  await user.press(screen.getByText('Cancel'));
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
  expect(screen.queryByText('Share (1)')).not.toBeOnTheScreen();
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
  await user.press(screen.getByText('Share (1)'));
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
      team1: { ...testTeam, id: name, name },
      team2Name: opponent,
      createdAt: Date.UTC(2026, 0, day),
      team1Score: score,
      team2Score: 0,
    })),
  });
}

it.each([
  ['team-asc', 'Team A–Z', ['Beta', 'Rivals', 'Dark']],
  ['team-desc', 'Team Z–A', ['Dark', 'Rivals', 'Beta']],
  ['points-asc', 'Low scoring', ['Rivals', 'Beta', 'Dark']],
  ['points-desc', 'High scoring', ['Dark', 'Beta', 'Rivals']],
  ['oldest', 'Oldest', ['Beta', 'Dark', 'Rivals']],
  ['newest', 'Newest', ['Rivals', 'Dark', 'Beta']],
])('sorts saved games by %s and clears selection', async (key, buttonLabel, expected) => {
  arrangeSortableGames();
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  await user.press(screen.getByTestId('header-action-select'));
  await user.press(screen.getByText('Rivals'));
  expect(screen.getByText('Share (1)')).toBeVisible();
  await user.press(screen.getByTestId('saved-games-sort'));
  await user.press(screen.getByTestId(`saved-games-sort-option-${key}`));
  expect(screen.getAllByText(/^(Beta|Rivals|Dark)$/).map((node) => node.props.children)).toEqual(
    expected,
  );
  expect(screen.queryByTestId('saved-games-sort-sheet')).not.toBeOnTheScreen();
  expect(within(screen.getByTestId('saved-games-sort')).getByText(buttonLabel)).toBeVisible();
  expect(screen.queryByText('Share (1)')).not.toBeOnTheScreen();
});

it('filters saved games by either team, trims search text, and reports an unmatched query', async () => {
  arrangeSortableGames();
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  const input = screen.getByPlaceholderText('Search teams or dates...');
  await user.type(input, ' DARK ');
  expect(screen.getByText('Dark')).toBeVisible();
  expect(screen.queryByText('Rivals')).not.toBeOnTheScreen();
  await user.clear(input);
  await user.type(input, 'hybrid');
  expect(screen.getByText('Rivals')).toBeVisible();
  expect(screen.queryByText('Dark')).not.toBeOnTheScreen();
  await user.clear(input);
  await user.type(input, 'missing');
  expect(screen.getByText('No games match "missing"')).toBeVisible();
});

it('finds games by the weekday shown in day headings and dates rows with the year when ungrouped', async () => {
  arrangeSortableGames();
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  const hybridWeekday = new Date(Date.UTC(2026, 0, 3)).toLocaleDateString(undefined, {
    weekday: 'short',
  });
  await user.type(screen.getByPlaceholderText('Search teams or dates...'), hybridWeekday);
  expect(screen.getByText('Rivals')).toBeVisible();
  expect(screen.queryByText('Dark')).not.toBeOnTheScreen();
  expect(screen.queryByText('Beta')).not.toBeOnTheScreen();

  await user.clear(screen.getByPlaceholderText('Search teams or dates...'));
  await user.press(screen.getByTestId('saved-games-sort'));
  await user.press(screen.getByTestId('saved-games-sort-option-team-asc'));
  expect(screen.getAllByText(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/)).toHaveLength(3);
  await user.type(screen.getByPlaceholderText('Search teams or dates...'), 'missing');
  expect(screen.getByText('No games match "missing"')).toBeVisible();
});

it.each([
  ['one tracked team', ['Light', 'Light'], '1–1'],
  ['mixed tracked teams', ['Light', 'Hybrid'], null],
] as const)('shows a day record only for %s', async (_case, teamNames, expectedRecord) => {
  useGameStore.setState({
    savedGames: teamNames.map((name, i) => ({
      ...createSavedBasicGame(),
      id: `game-${i}`,
      team1: { ...testTeam, id: name, name },
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

it('enters bulk selection by long press, dismisses its hint, and excludes the other tracking kind', async () => {
  for (const gameType of ['game', 'scrimmage'] as const) {
    await useSavedAdvancedGamesStore.getState().saveGame(
      createAdvancedGameScenario({
        id: gameType,
        gameType,
        status: 'final',
        sides: [
          { id: 'focus', label: 'Light', trackingMode: 'full-roster' },
          { id: 'opponent', label: 'Dark', trackingMode: 'full-roster' },
        ],
      }).build(),
    );
  }
  useGameStore.setState({ savedGames: [createSavedBasicGame()] });
  const user = userEvent.setup();
  await renderScreen(<StatsScreen />);
  expect(screen.getByText(/ · Scrimmage$/)).toBeVisible();
  expect(screen.getByText(/ · Advanced$/)).toBeVisible();
  expect(screen.getByText(/Long press a game to select/)).toBeVisible();
  await user.longPress(screen.getByText('Rivals'), { duration: 400 });
  expect(screen.getByText('Share (1)')).toBeVisible();
  expect(screen.queryByText(/Long press a game to select/)).not.toBeOnTheScreen();
  expect(useTutorialStore.getState().hasSeenLongPressSelectHint).toBe(true);
  await user.press(screen.getByText(/ · Advanced$/));
  await user.press(screen.getByText(/ · Scrimmage$/));
  expect(screen.getByText('Share (1)')).toBeVisible();
  expect(router.push).not.toHaveBeenCalled();
  await user.press(screen.getByText('Rivals'));
  expect(screen.queryByText('Share (1)')).not.toBeOnTheScreen();
});
