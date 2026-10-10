import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';

import BasicScoreboard from '@/app/(main)/(hub)/(game)/Scoreboard';
import { UNKNOWN_PLAYER_ID } from '@/lib/playerUtils';
import { useGameStore } from '@/store/basic/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { arrangeBasicGame } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter, setMockPathname } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';
import { setWindow } from '@/test/window';

beforeEach(async () => {
  resetAllStores();
  resetMockRouter();
  await AsyncStorage.clear();
  arrangeBasicGame({ statTrackingEnabled: true });
  setMockPathname('/Scoreboard');
});

it.each(['goal_first', 'assist_first'] as const)(
  'lets the user revise the first %s selection before recording the goal',
  async (entryOrder) => {
    useSettingsStore.setState({ statEntryOrder: entryOrder });
    const user = userEvent.setup();
    await renderScreen(<BasicScoreboard />);
    await user.press(screen.getByLabelText('Score for Windchill'));
    await user.press(screen.getByTestId('player-chip-Alex'));
    await user.press(screen.getByText('Back'));
    await user.press(screen.getByTestId('player-chip-Blair'));
    await user.press(screen.getByText('Unknown'));
    expect(useGameStore.getState().events.at(-1)).toMatchObject({
      type: 'goal',
      goalPlayerId: entryOrder === 'goal_first' ? 'player-blair' : UNKNOWN_PLAYER_ID,
      assistPlayerId: entryOrder === 'goal_first' ? UNKNOWN_PLAYER_ID : 'player-blair',
    });
    expect(screen.queryByTestId('stat-entry-overlay')).not.toBeOnTheScreen();
  },
);

it('adds and attributes a new scorer, then recognizes an existing assister in landscape', async () => {
  await setWindow('landscape');
  useSettingsStore.setState({ statEntryOrder: 'goal_first' });
  const user = userEvent.setup();
  await renderScreen(<BasicScoreboard />);
  await user.press(screen.getByLabelText('Score for Windchill'));
  await user.type(screen.getByPlaceholderText('Add player...'), '  Robin  ');
  await user.press(screen.getByText('Add'));
  expect(screen.getByText('Who threw the assist?')).toBeVisible();
  await user.type(screen.getByPlaceholderText('Add player...'), 'bLaIr');
  await user.press(screen.getByText('Add'));
  const state = useGameStore.getState();
  const robin = state.currentTeam.roster.find((player) => player.name === 'Robin');
  expect(robin).toMatchObject({ isActive: true });
  expect(
    state.currentTeam.roster.filter((player) => player.name.toLowerCase() === 'blair'),
  ).toHaveLength(1);
  expect(state.events.at(-1)).toMatchObject({
    type: 'goal',
    goalPlayerId: robin!.id,
    assistPlayerId: 'player-blair',
  });
});

it('cancels partially attributed scoring without leaving the provisional score or event', async () => {
  const user = userEvent.setup();
  await renderScreen(<BasicScoreboard />);
  await user.press(screen.getByLabelText('Score for Windchill'));
  expect(screen.getByTestId('stat-entry-overlay')).toBeVisible();
  expect(screen.getByText('Who scored?')).toBeVisible();
  expect(screen.getByText('Rivals')).toBeVisible();
  await user.press(screen.getByTestId('player-chip-Alex'));
  await user.press(screen.getByText('Cancel'));
  expect(useGameStore.getState()).toMatchObject({
    team1Score: 0,
    currentPoint: 1,
    events: [],
    pendingStatEntry: null,
  });
  expect(screen.queryByTestId('stat-entry-overlay')).not.toBeOnTheScreen();
});

it('keeps the scoreboard visible when cancelling a drop and allows attribution on retry', async () => {
  const user = userEvent.setup();
  await renderScreen(<BasicScoreboard />);
  await user.press(screen.getByText('DROP'));

  expect(screen.getByTestId('turnover-entry-overlay')).toBeVisible();
  expect(screen.getByText('Who dropped it?')).toBeVisible();
  expect(screen.getByText('Rivals')).toBeVisible();
  await user.press(screen.getByText('Cancel'));

  expect(screen.queryByTestId('turnover-entry-overlay')).not.toBeOnTheScreen();
  expect(useGameStore.getState()).toMatchObject({
    pendingTurnoverEntry: null,
    events: [],
    possession: 'team1',
  });

  await user.press(screen.getByText('DROP'));
  await user.press(screen.getByTestId('player-chip-Alex'));

  expect(screen.queryByTestId('turnover-entry-overlay')).not.toBeOnTheScreen();
  expect(useGameStore.getState()).toMatchObject({
    pendingTurnoverEntry: null,
    possession: 'team2',
    events: [{ type: 'turnover', team: 'team1', subtype: 'drop', playerId: 'player-alex' }],
  });
});

it('attributes a Callahan to the blocker through the live block and goal controls', async () => {
  useGameStore.setState({ possession: 'team2' });
  const user = userEvent.setup();
  await renderScreen(<BasicScoreboard />);
  await user.press(screen.getByText('BLOCK'));
  await user.press(screen.getByTestId('player-chip-Alex'));
  await user.press(screen.getByLabelText('Score for Windchill'));
  await user.press(screen.getByText('Callahan'));
  expect(useGameStore.getState().events).toMatchObject([
    { type: 'turnover', subtype: 'block', team: 'team1', playerId: 'player-alex' },
    { type: 'goal', team: 'team1', goalPlayerId: 'player-alex', assistPlayerId: 'OTHER_TEAM' },
  ]);
  expect(screen.queryByTestId('stat-entry-overlay')).not.toBeOnTheScreen();
});

it('attributes a 50/50 to an added thrower and an existing receiver in landscape', async () => {
  await setWindow('landscape');
  const user = userEvent.setup();
  await renderScreen(<BasicScoreboard />);
  await user.press(screen.getByText('50/50'));
  await user.type(screen.getByPlaceholderText('Add player...'), 'Robin');
  await user.press(screen.getByText('Add'));
  expect(screen.getByText('Who dropped it?')).toBeVisible();
  await user.type(screen.getByPlaceholderText('Add player...'), 'bLaIr');
  await user.press(screen.getByText('Add'));
  const state = useGameStore.getState();
  expect(state.events.at(-1)).toMatchObject({
    type: 'turnover',
    subtype: 'fiftyfifty',
    team: 'team1',
    playerId: state.currentTeam.roster.find((player) => player.name === 'Robin')!.id,
    player2Id: 'player-blair',
  });
  expect(state.possession).toBe('team2');
  expect(screen.queryByTestId('turnover-entry-overlay')).not.toBeOnTheScreen();
});

it('restricts turnover attribution to the current line while allowing unknown players', async () => {
  useGameStore.setState({ currentLine: ['player-alex'] });
  useSettingsStore.setState({ lineCallingEnabled: true });
  const user = userEvent.setup();
  await renderScreen(<BasicScoreboard />);
  await user.press(screen.getByText('50/50'));
  expect(screen.queryByTestId('player-chip-Blair')).not.toBeOnTheScreen();
  expect(screen.queryByPlaceholderText('Add player...')).not.toBeOnTheScreen();
  await user.press(screen.getByText('Unknown'));
  await user.press(screen.getByTestId('player-chip-Alex'));
  expect(useGameStore.getState().events.at(-1)).toMatchObject({
    type: 'turnover',
    subtype: 'fiftyfifty',
    playerId: UNKNOWN_PLAYER_ID,
    player2Id: 'player-alex',
  });
});

it('records a newly added player for a single-player turnover', async () => {
  const user = userEvent.setup();
  await renderScreen(<BasicScoreboard />);
  await user.press(screen.getByText('T/A'));
  await user.type(screen.getByPlaceholderText('Add player...'), 'Robin');
  await user.press(screen.getByText('Add'));
  expect(useGameStore.getState().events.at(-1)).toMatchObject({
    type: 'turnover',
    subtype: 'throwaway',
    playerId: useGameStore.getState().currentTeam.roster.find((player) => player.name === 'Robin')!
      .id,
  });
});
