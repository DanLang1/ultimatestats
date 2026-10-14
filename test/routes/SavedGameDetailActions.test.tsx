import AsyncStorage from '@react-native-async-storage/async-storage';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import AdvancedGameScreen from '@/app/(main)/(hub)/(analytics)/advanced-tracking/analytics/[gameId]';
import BasicGameScreen from '@/app/(main)/(hub)/(analytics)/saved-games/[gameId]';
import type { SharedPayload } from '@/lib/sharing/types';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useGameStore } from '@/store/basic/gameStore';
import { useTournamentStore } from '@/store/tournamentStore';
import {
  createAdvancedGameScenario,
  participantRef,
  ADVANCED_TEST_PARTICIPANTS,
  UNTRACKED_PLAYER,
} from '@/test/fixtures/advancedGameBuilder';
import { createSavedBasicGame, testTeam } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter, setMockSearchParams } from '@/test/mocks/expoRouter';
import { createTestQueryClient, renderScreen } from '@/test/render';
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
  useSavedAdvancedGamesStore.setState({ summariesLoaded: true });
  await setWindow('landscape');
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
  jest.mocked(Sharing.shareAsync).mockResolvedValue(undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
});

async function arrangeDetail(kind: 'basic' | 'advanced', from?: 'gameComplete') {
  const id = `${kind}-detail`;
  if (kind === 'basic') {
    useGameStore.setState({
      savedTeams: [testTeam],
      savedGames: [{ ...createSavedBasicGame(), id, team2Name: 'Detail Rival' }],
    });
  } else {
    await useSavedAdvancedGamesStore.getState().saveGame(
      createAdvancedGameScenario({
        id,
        status: 'final',
        sides: [
          { id: 'focus', label: 'Focus', trackingMode: 'full-roster' },
          { id: 'opponent', label: 'Detail Rival', trackingMode: 'anonymous' },
        ],
      })
        .hold({
          puller: UNTRACKED_PLAYER,
          receiver: participantRef('alex'),
          scorer: participantRef('blair'),
        })
        .build(),
    );
  }
  setMockSearchParams({ gameId: id, from });
  const queryClient = createTestQueryClient();
  await renderScreen(kind === 'basic' ? <BasicGameScreen /> : <AdvancedGameScreen />, {
    queryClient,
  });
  expect(await screen.findByTestId('header-action-share')).toBeVisible();
  return id;
}

it.each(['basic', 'advanced'] as const)(
  'uploads the selected %s record only after share confirmation',
  async (kind) => {
    const id = await arrangeDetail(kind);
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async () => new Response(null, { status: 201 }));
    const user = userEvent.setup();
    await user.press(screen.getByTestId('header-action-share'));
    expect(fetchSpy).not.toHaveBeenCalled();
    await user.press(screen.getByText('Proceed'));
    expect(await screen.findByText('Share Link Ready')).toBeVisible();
    const upload = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string) as {
      id: string;
      payload: SharedPayload;
    };
    expect(upload.payload.type).toBe(kind === 'basic' ? 'game' : 'advanced-game');
    if (upload.payload.type !== 'game' && upload.payload.type !== 'advanced-game')
      throw new Error('Expected one game');
    expect(upload.payload.data.id).toBe(id);
    expect(
      screen.getByText(`https://u-stat.app/s/${upload.payload.type}/${upload.id}`),
    ).toBeVisible();
    await user.press(screen.getByText('Close'));
    expect(screen.queryByText('Share Link Ready')).not.toBeOnTheScreen();
  },
);

it.each(['basic', 'advanced'] as const)(
  'exports CSV for the displayed %s record to the native share sheet',
  async (kind) => {
    await arrangeDetail(kind);
    const write = jest.spyOn(File.prototype, 'write');
    const user = userEvent.setup();
    await user.press(screen.getByTestId('header-action-csv'));
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalledTimes(1));
    expect(Sharing.shareAsync).toHaveBeenCalledWith(expect.stringMatching(/Detail_Rival.*\.csv$/));
    expect(write.mock.calls[0][0]).toContain('Detail Rival');
    expect(screen.queryByText('Export failed')).not.toBeOnTheScreen();
  },
);

it('reports a CSV export failure on the detail screen', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await arrangeDetail('basic');
  jest.spyOn(File.prototype, 'write').mockImplementationOnce(() => {
    throw new Error('Cache full');
  });
  await userEvent.setup().press(screen.getByTestId('header-action-csv'));
  expect(await screen.findByText('Export failed')).toBeVisible();
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
});

it.each(['basic', 'advanced'] as const)(
  'keeps a %s game when deletion is cancelled, then deletes its record and tournament link',
  async (kind) => {
    const id = await arrangeDetail(kind);
    const tournament = await useTournamentStore
      .getState()
      .addTournament('Invite', '2026-01-01', '2026-01-02');
    await useTournamentStore.getState().addGamesToTournament(tournament, kind, [id]);
    const user = userEvent.setup();
    await user.press(screen.getByTestId('header-action-delete'));
    await user.press(screen.getByText('Cancel'));
    expect(router.replace).not.toHaveBeenCalled();
    expect(useTournamentStore.getState().gameLinks).toHaveLength(1);
    await user.press(screen.getByTestId('header-action-delete'));
    await user.press(screen.getByText('Delete'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/saved-game-stats'));
    expect(useTournamentStore.getState().gameLinks).toHaveLength(0);
    if (kind === 'basic') expect(useGameStore.getState().savedGames).toHaveLength(0);
    else expect(await useSavedAdvancedGamesStore.getState().loadGame(id)).toBeNull();
  },
);

it.each(['basic', 'advanced'] as const)('opens the timeline for the %s record', async (kind) => {
  const id = await arrangeDetail(kind);
  await userEvent.setup().press(screen.getByTestId('header-action-timeline'));
  expect(router.push).toHaveBeenCalledWith({
    pathname:
      kind === 'basic' ? '/game-timeline' : '/advanced-tracking/analytics/timeline/[gameId]',
    params: { gameId: id },
  });
});

it.each([undefined, 'gameComplete'] as const)(
  'returns from advanced detail according to its entry point (%s)',
  async (from) => {
    await arrangeDetail('advanced', from);
    await userEvent.setup().press(screen.getByTestId('screen-header-back'));
    if (from) expect(router.replace).toHaveBeenCalledWith('/dashboard');
    else expect(router.back).toHaveBeenCalledTimes(1);
  },
);

it.each(['basic', 'advanced'] as const)(
  'recovers to saved games when a %s record no longer exists',
  async (kind) => {
    setMockSearchParams({ gameId: 'deleted-game' });
    const queryClient = createTestQueryClient();
    await renderScreen(kind === 'basic' ? <BasicGameScreen /> : <AdvancedGameScreen />, {
      queryClient,
    });
    await userEvent.setup().press(await screen.findByText('Go to Saved Games'));
    expect(router.replace).toHaveBeenCalledWith('/saved-game-stats');
  },
);

it('exports the selected side rather than the focus side in a dual-tracked game', async () => {
  const game = createAdvancedGameScenario({
    id: 'dual-export',
    status: 'final',
    sides: [
      { id: 'focus', label: 'Focus', trackingMode: 'full-roster' },
      { id: 'opponent', label: 'Visitors', trackingMode: 'full-roster' },
    ],
    participants: [
      ...ADVANCED_TEST_PARTICIPANTS,
      ...Array.from({ length: 7 }, (_, index) => ({
        id: `visitor-${index}`,
        name: `Visitor ${index}`,
      })),
    ],
    defaultLines: [
      { sideId: 'focus', participantIds: ['alex', 'blair', 'casey', 'dana', 'eli', 'finn', 'gia'] },
      {
        sideId: 'opponent',
        participantIds: Array.from({ length: 7 }, (_, index) => `visitor-${index}`),
      },
    ],
  })
    .hold({
      puller: participantRef('visitor-0'),
      receiver: participantRef('alex'),
      scorer: participantRef('blair'),
    })
    .build();
  await useSavedAdvancedGamesStore.getState().saveGame(game);
  setMockSearchParams({ gameId: game.id });
  const queryClient = createTestQueryClient();
  await renderScreen(<AdvancedGameScreen />, { queryClient });
  const write = jest.spyOn(File.prototype, 'write');
  const user = userEvent.setup();
  await user.press(screen.getByTestId('advanced-stats-side-opponent'));
  await user.press(screen.getByTestId('header-action-csv'));
  await waitFor(() =>
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/Visitors_vs_Focus_advanced.csv'),
  );
  expect(write.mock.calls[0][0]).toContain('# Game: Visitors vs Focus');
});

// Drive the native picker boundary; retain the route's real persistence action.
it.each(['basic', 'advanced'] as const)(
  'persists an Android played-at correction for a %s game and rejects a future time',
  async (kind) => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const open = jest.spyOn(DateTimePickerAndroid, 'open').mockImplementation(() => {});
    const id = await arrangeDetail(kind);
    const user = userEvent.setup();
    const past = new Date('2026-01-02T12:30:00.000Z');
    const event = { nativeEvent: { timestamp: past.getTime(), utcOffset: 0 } };
    await user.press(screen.getByText('PLAYED AT'));
    expect(open.mock.calls[0][0].mode).toBe('date');
    await act(async () => open.mock.calls[0][0].onValueChange!(event, past));
    expect(open.mock.calls[1][0].mode).toBe('time');
    await act(async () => open.mock.calls[1][0].onValueChange!(event, past));
    const readPlayedAt = async () =>
      kind === 'basic'
        ? useGameStore.getState().savedGames.find((game) => game.id === id)?.playedAt
        : new Date(
            (await useSavedAdvancedGamesStore.getState().loadGame(id))!.metadata!.date!,
          ).getTime();
    expect(await readPlayedAt()).toBe(past.getTime());
    await user.press(screen.getByText('PLAYED AT'));
    await act(async () => open.mock.calls[2][0].onValueChange!(event, past));
    const future = new Date(Date.now() + 86_400_000);
    await act(async () =>
      open.mock.calls[3][0].onValueChange!(
        { nativeEvent: { timestamp: future.getTime(), utcOffset: 0 } },
        future,
      ),
    );
    expect(await readPlayedAt()).toBe(past.getTime());
  },
);
