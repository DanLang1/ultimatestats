import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import EditDurationModal from '@/app/(modals)/EditDurationModal';
import type { GameEvent } from '@/lib/storage/types';
import { useGameStore } from '@/store/basic/gameStore';
import { arrangeBasicGame, createSavedBasicGame } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter, setMockSearchParams } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';
import { setWindow } from '@/test/window';

const events: GameEvent[] = [
  {
    type: 'turnover',
    subtype: 'throwaway',
    team: 'team1',
    playerId: 'player-alex',
    pointNumber: 1,
    elapsedMs: 10_000,
  },
  { type: 'timeout', team: 'team2', index: 0, isFloater: false, pointNumber: 1, elapsedMs: 30_000 },
  {
    type: 'goal',
    team: 'team1',
    goalPlayerId: 'player-alex',
    assistPlayerId: 'player-blair',
    pointNumber: 1,
    elapsedMs: 60_000,
  },
];

beforeEach(async () => {
  resetAllStores();
  resetMockRouter();
  await AsyncStorage.clear();
});
afterEach(async () => {
  jest.restoreAllMocks();
});

async function arrangeEditor(
  saved: boolean,
  editorType: 'point' | 'event',
  currentDurationMs: number,
) {
  arrangeBasicGame({ statTrackingEnabled: true });
  if (saved) useGameStore.setState({ savedGames: [{ ...createSavedBasicGame(), events }] });
  else useGameStore.setState({ events });
  setMockSearchParams({
    gameId: saved ? 'saved-basic-game-1' : 'current',
    eventIndex: editorType === 'point' ? '2' : '1',
    editorType,
    currentDurationMs: String(currentDurationMs),
  });
  await renderScreen(<EditDurationModal />);
}

it.each([false, true])(
  'saves a corrected timeout time to the chosen record (saved: %s)',
  async (saved) => {
    await arrangeEditor(saved, 'event', 30_000);
    expect(screen.getByText('Edit Event Time')).toBeVisible();
    const user = userEvent.setup();
    await user.press(screen.getByText('C'));
    await user.press(screen.getByText('2'));
    await user.press(screen.getByText('5'));
    await user.press(screen.getByText('Save'));
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    const updatedEvents = saved
      ? useGameStore.getState().savedGames[0].events
      : useGameStore.getState().events;
    expect(updatedEvents[1].elapsedMs).toBe(25_000);
    expect(updatedEvents[0].elapsedMs).toBe(10_000);
    expect(updatedEvents[2].elapsedMs).toBe(60_000);
  },
);

it('removes a point duration rather than storing a zero timestamp', async () => {
  await arrangeEditor(false, 'point', 60_000);
  const user = userEvent.setup();
  await user.press(screen.getByText('Clear'));
  await user.press(screen.getByText('Save'));
  await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
  const updatedEvents = useGameStore.getState().events;
  expect(updatedEvents[2]).not.toHaveProperty('elapsedMs');
  expect(updatedEvents[1].elapsedMs).toBe(30_000);
});

it('keeps a point duration that would end before its last timed event from being saved', async () => {
  await arrangeEditor(false, 'point', 60_000);
  const user = userEvent.setup();
  await user.press(screen.getByText('Clear'));
  await user.press(screen.getByText('sec'));
  await user.press(screen.getByText('2'));
  await user.press(screen.getByText('5'));
  expect(screen.getByText("Duration can't be earlier than the last event (0:30).")).toBeVisible();
  await user.press(screen.getByText('Save'));
  expect(router.back).not.toHaveBeenCalled();
  expect(useGameStore.getState().events[2].elapsedMs).toBe(60_000);
});

it('enforces numeric field bounds with the landscape keypad, then saves minutes and seconds', async () => {
  await setWindow('landscape');
  await arrangeEditor(false, 'point', 60_000);
  const user = userEvent.setup();
  await user.press(screen.getByText('C'));
  await user.press(screen.getByText('2'));
  await user.press(screen.getByText('5'));
  await user.press(screen.getByText('6'));
  expect(screen.getByText('25')).toBeVisible();
  await user.press(screen.getByText('sec'));
  await user.press(screen.getByText('4'));
  await user.press(screen.getByText('5'));
  await user.press(screen.getByText('9'));
  expect(screen.getByText('45')).toBeVisible();
  await user.press(screen.getByText('min'));
  await user.press(screen.getByText('C'));
  await user.press(screen.getByText('2'));
  await user.press(screen.getByText('Save'));
  expect(useGameStore.getState().events[2].elapsedMs).toBe(165_000);
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('dismisses a duration edit without changing the event', async () => {
  await arrangeEditor(false, 'event', 30_000);
  const user = userEvent.setup();
  await user.press(screen.getByText('Clear'));
  await user.press(screen.getByText('Cancel'));
  expect(useGameStore.getState().events[1].elapsedMs).toBe(30_000);
  expect(router.back).toHaveBeenCalledTimes(1);
});

it.each([false, true])(
  'deletes the last digit from the active duration field (landscape: %s)',
  async (landscape) => {
    await setWindow(landscape ? 'landscape' : 'portrait');
    await arrangeEditor(false, 'point', 125_000);
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Delete last digit' }));
    await user.press(screen.getByText('4'));
    await user.press(screen.getByText('sec'));
    await user.press(screen.getByRole('button', { name: 'Delete last digit' }));
    await user.press(screen.getByText('3'));
    await user.press(screen.getByText('6'));
    await user.press(screen.getByRole('button', { name: 'Delete last digit' }));
    await user.press(screen.getByText('Save'));
    expect(useGameStore.getState().events[2].elapsedMs).toBe(243_000);
    expect(router.back).toHaveBeenCalledTimes(1);
  },
);
