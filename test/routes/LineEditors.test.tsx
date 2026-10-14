import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import LineEditorScreen from '@/app/(main)/line-editor';
import LinePresetEditor from '@/app/(main)/line-preset-editor';
import type { GameEvent } from '@/lib/storage/types';
import { useGameStore } from '@/store/basic/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { arrangeBasicGame, testTeam } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter, setMockSearchParams } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';
import { setWindow } from '@/test/window';

beforeEach(async () => {
  resetAllStores();
  resetMockRouter();
  await AsyncStorage.clear();
  arrangeBasicGame({ statTrackingEnabled: true });
});

it('summarizes the last completed point with its outcome, turnovers, and duration', async () => {
  const events: GameEvent[] = [
    {
      type: 'turnover',
      team: 'team1',
      subtype: 'throwaway',
      playerId: 'player-alex',
      pointNumber: 1,
    },
    { type: 'turnover', team: 'team2', subtype: 'throwaway', playerId: null, pointNumber: 1 },
    {
      type: 'goal',
      team: 'team1',
      goalPlayerId: null,
      assistPlayerId: null,
      pointNumber: 1,
      elapsedMs: 70000,
    },
  ];
  useGameStore.setState({ events, startingPossession: 'team1', currentPoint: 2 });
  await renderScreen(<LineEditorScreen />);
  expect(screen.getByText('Point 1')).toBeVisible();
  expect(screen.getByText(/DIRTY HOLD/)).toBeVisible();
  expect(screen.getByText(/1m 10s/)).toBeVisible();
});

it.each([false, true])(
  'updates ratio warnings and enforces the selection cap in landscape=%s',
  async (landscape) => {
    await setWindow(landscape ? 'landscape' : 'portrait');
    useSettingsStore.setState({
      numPlayers: 1,
      genderRatioEnabled: true,
      firstPointRatio: 'more-men',
    });
    const user = userEvent.setup();
    await renderScreen(<LineEditorScreen />);
    expect(screen.getByText('Ratio · M2')).toBeVisible();
    await user.press(screen.getByTestId('player-chip-Alex'));
    expect(screen.getByText('Expecting M majority')).toBeVisible();
    await user.press(screen.getByTestId('player-chip-Blair'));
    expect(screen.getByTestId('player-chip-Blair')).not.toBeSelected();
    await user.press(screen.getByTestId('player-chip-Alex'));
    await user.press(screen.getByTestId('player-chip-Blair'));
    expect(screen.getByTestId('player-chip-Blair')).toBeSelected();
    expect(screen.queryByText('Expecting M majority')).not.toBeOnTheScreen();
  },
);

it('switches from a preset to a recent line and opens preset management from the picker', async () => {
  useGameStore.setState({
    currentPoint: 2,
    pointLines: [{ pointNumber: 1, playerIds: ['player-alex'], timestamp: 1 }],
  });
  useLinePresetsStore.setState({
    presets: [
      { id: 'preset', name: 'Blair Only', teamId: testTeam.id, playerIds: ['player-blair'] },
    ],
  });
  const user = userEvent.setup();
  await renderScreen(<LineEditorScreen />);
  await user.press(screen.getByTestId('line-select-load-line'));
  await user.press(screen.getByTestId('line-select-preset-preset'));
  expect(screen.getByLabelText('Choose line, Blair Only')).toBeVisible();
  await user.press(screen.getByTestId('line-select-load-line'));
  await user.press(screen.getByTestId('line-select-recent-1'));
  expect(screen.getByLabelText('Choose line, Pt 1')).toBeVisible();
  expect(screen.getByTestId('player-chip-Alex')).toBeSelected();
  expect(screen.queryByTestId('player-chip-Blair')).not.toBeOnTheScreen();
  await user.press(screen.getByTestId('line-select-show-all-players'));
  expect(screen.getByTestId('player-chip-Blair')).not.toBeSelected();
  await user.press(screen.getByTestId('line-select-load-line'));
  await user.press(screen.getByText('Edit Presets'));
  expect(router.push).toHaveBeenCalledWith('/line-preset-editor');
  expect(screen.queryByText('Load Line')).not.toBeOnTheScreen();
});

it('explains point-credit differences when editing an existing live line', async () => {
  setMockSearchParams({ mode: 'edit-line' });
  useGameStore.setState({
    pointLines: [{ pointNumber: 1, playerIds: ['player-alex'], timestamp: 1 }],
  });
  const user = userEvent.setup();
  await renderScreen(<LineEditorScreen />);
  expect(screen.getByText('Edit Line · Point 1')).toBeVisible();
  await user.press(screen.getByText('?'));
  expect(screen.getByText('Both old and new players get point credit')).toBeVisible();
  await user.press(screen.getByText('Replace Line'));
  expect(screen.getByText('Only the new lineup gets point credit')).toBeVisible();
  await user.press(screen.getByText('Injury Sub'));
  expect(screen.getByText('Both old and new players get point credit')).toBeVisible();
  await user.press(screen.getByText('?'));
  expect(screen.queryByText('Both old and new players get point credit')).not.toBeOnTheScreen();
});

it('saves a preset edit while preserving its identity and excluding inactive players', async () => {
  const preset = { id: 'preset', name: 'O Line', teamId: testTeam.id, playerIds: ['player-alex'] };
  useLinePresetsStore.setState({ presets: [preset] });
  useGameStore.setState({
    currentTeam: {
      ...testTeam,
      roster: [
        ...testTeam.roster,
        { id: 'inactive', name: 'Inactive', isActive: false, matchingType: null, role: null },
      ],
    },
  });
  setMockSearchParams({ presetId: preset.id });
  const user = userEvent.setup();
  await renderScreen(<LinePresetEditor />);
  expect(screen.queryByTestId('player-chip-Inactive')).not.toBeOnTheScreen();
  await user.clear(screen.getByPlaceholderText('Preset Name'));
  await user.type(screen.getByPlaceholderText('Preset Name'), ' D Line ');
  await user.press(screen.getByTestId('player-chip-Alex'));
  await user.press(screen.getByTestId('player-chip-Blair'));
  await user.press(screen.getByText('1'));
  expect(useLinePresetsStore.getState().presets).toEqual([
    { ...preset, name: 'D Line', playerIds: ['player-blair'] },
  ]);
  expect(screen.getByText('Line Presets')).toBeVisible();
  expect(
    JSON.parse((await AsyncStorage.getItem('ultimatestats-line-presets'))!).state.presets,
  ).toEqual(useLinePresetsStore.getState().presets);
});

it('rejects a case-insensitive duplicate preset name without losing the draft', async () => {
  useLinePresetsStore.setState({
    presets: [
      { id: 'preset', name: 'O Line', teamId: testTeam.id, playerIds: ['player-alex'] },
      { id: 'other', name: 'D Line', teamId: testTeam.id, playerIds: ['player-blair'] },
    ],
  });
  setMockSearchParams({ presetId: 'preset' });
  const user = userEvent.setup();
  await renderScreen(<LinePresetEditor />);
  await user.clear(screen.getByPlaceholderText('Preset Name'));
  await user.type(screen.getByPlaceholderText('Preset Name'), 'd line');
  await user.press(screen.getByText('1'));
  expect(screen.getByText('Name Already Exists')).toBeVisible();
  expect(useLinePresetsStore.getState().presets[0].name).toBe('O Line');
  await user.press(screen.getByText('OK'));
  expect(screen.getByDisplayValue('d line')).toBeVisible();
});
