import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AdvancedPreGameConfirm from '@/app/(main)/advancedTracking/PreGameConfirm';
import PullTrackingScreen from '@/app/(main)/advancedTracking/PullTracking';
import TrackerScreen from '@/app/(main)/advancedTracking/Tracker';
import TrackerEditLineScreen from '@/app/(main)/advancedTracking/TrackerEditLine';
import TrackerGameCompleteScreen from '@/app/(main)/advancedTracking/TrackerGameComplete';
import TrackerInjurySubScreen from '@/app/(main)/advancedTracking/TrackerInjurySub';
import TrackerLineSelectScreen from '@/app/(main)/advancedTracking/TrackerLineSelect';
import { getEffectiveLineParticipantIds } from '@/lib/advancedTracking/trackingUtils';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { createAdvancedGameScenario, participantRef } from '@/test/fixtures/advancedGameBuilder';
import { arrangeAdvancedGame, recordOpeningPull, testTeam } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter, setMockSearchParams } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

function arrangeDualTrackedPoint() {
  const participants = Array.from({ length: 16 }, (_, index) => ({
    id: `scrim-player-${index + 1}`,
    name: `Scrim Player ${index + 1}`,
  }));
  const lightIds = participants.slice(0, 7).map((participant) => participant.id);
  const darkIds = participants.slice(7, 14).map((participant) => participant.id);
  const game = createAdvancedGameScenario({
    id: 'dual-tracked-point',
    createdAt: 0,
    updatedAt: 0,
    gameType: 'scrimmage',
    focusSideId: 'light',
    initialReceivingSideId: 'light',
    sides: [
      { id: 'light', label: 'Light', trackingMode: 'full-roster' },
      { id: 'dark', label: 'Dark', trackingMode: 'full-roster' },
    ],
    participants,
    defaultLines: [
      { sideId: 'light', participantIds: lightIds },
      { sideId: 'dark', participantIds: darkIds },
    ],
  })
    .startPoint({
      id: 'point-1',
      possessionId: 'possession-1',
      pullId: 'pull-1',
      puller: participantRef(darkIds[0]),
      receiver: participantRef(lightIds[0]),
    })
    .build();
  useAdvancedTrackingStore.setState({
    currentGameId: game.id,
    currentGame: game,
  });

  return { participants };
}

function arrangeDualTrackedPointWithPreviouslyDarkBenchPlayer() {
  const { participants } = arrangeDualTrackedPoint();
  useAdvancedTrackingStore.setState((state) => {
    const game = state.currentGame!;
    const currentPoint = game.points[0];
    game.points.unshift({
      id: 'previous-point',
      lines: [
        {
          sideId: 'light',
          participantIds: participants.slice(0, 7).map((participant) => participant.id),
        },
        {
          sideId: 'dark',
          participantIds: participants.slice(7, 14).map((participant) => participant.id),
        },
      ],
      possessions: [],
    });
    currentPoint.lines.find((line) => line.sideId === 'dark')!.participantIds = [
      ...participants.slice(8, 14).map((participant) => participant.id),
      participants[14].id,
    ];
  });

  return { participants };
}

function arrangeDualTrackedOpponentWinningGame() {
  const { participants } = arrangeDualTrackedPoint();
  useAdvancedTrackingStore.setState((state) => {
    state.currentGame!.settings.format = {
      ...state.currentGame!.settings.format!,
      gameTo: 1,
    };
  });

  const pickup = useAdvancedTrackingStore.getState().recordCaptureIntent({
    kind: 'pickup',
    player: { refType: 'participant', participantId: participants[0].id },
  });
  if (!pickup.ok) throw new Error(`Unable to arrange tracked pickup: ${pickup.reason}`);

  const turnover = useAdvancedTrackingStore.getState().recordCaptureIntent({ kind: 'throwaway' });
  if (!turnover.ok) throw new Error(`Unable to arrange tracked turnover: ${turnover.reason}`);

  const opponentPickup = useAdvancedTrackingStore.getState().recordCaptureIntent({
    kind: 'pickup',
    player: { refType: 'participant', participantId: participants[7].id },
  });
  if (!opponentPickup.ok) {
    throw new Error(`Unable to arrange opponent pickup: ${opponentPickup.reason}`);
  }

  const result = useAdvancedTrackingStore.getState().recordCaptureIntent({
    kind: 'goal',
    scorer: { refType: 'participant', participantId: participants[8].id },
  });
  if (!result.ok) {
    throw new Error(`Unable to arrange tracked opponent goal: ${result.reason}`);
  }

  return { participants };
}

function arrangeSingleSideTrackedPoint() {
  const participants = Array.from({ length: 9 }, (_, index) => ({
    id: `single-player-${index + 1}`,
    name: `Single Player ${index + 1}`,
  }));
  const lineIds = participants.slice(0, 7).map((participant) => participant.id);
  const game = createAdvancedGameScenario({
    id: 'single-side-point',
    createdAt: 0,
    updatedAt: 0,
    focusSideId: 'windchill',
    initialReceivingSideId: 'windchill',
    sides: [
      { id: 'windchill', label: 'Windchill', trackingMode: 'full-roster' },
      { id: 'rivals', label: 'Rivals', trackingMode: 'anonymous' },
    ],
    participants,
    defaultLines: [{ sideId: 'windchill', participantIds: lineIds }],
  })
    .startPoint({
      id: 'point-1',
      possessionId: 'possession-1',
      pullId: 'pull-1',
      puller: { refType: 'untracked' },
      receiver: participantRef(lineIds[0]),
    })
    .build();
  useAdvancedTrackingStore.setState({
    currentGameId: game.id,
    currentGame: game,
  });

  return { participants, lineIds };
}

function arrangeCompletedPointForNextLineSelection() {
  const participants = Array.from({ length: 8 }, (_, index) => ({
    id: `next-line-player-${index + 1}`,
    name: `Next Line Player ${index + 1}`,
  }));
  const lineIds = participants.slice(0, 7).map((participant) => participant.id);
  useAdvancedTrackingStore.getState().createGame({
    id: 'next-line-game',
    focusSideId: 'home',
    initialReceivingSideId: 'home',
    sides: [
      { id: 'home', label: 'Home', trackingMode: 'full-roster' },
      { id: 'away', label: 'Away', trackingMode: 'anonymous' },
    ],
    participants,
    format: { gameTo: 15 },
  });
  useAdvancedTrackingStore.getState().recordPull({
    lines: [{ sideId: 'home', participantIds: lineIds }],
    puller: { refType: 'untracked' },
    receiver: { refType: 'participant', participantId: participants[0].id },
    result: 'inbound',
  });
  useAdvancedTrackingStore.getState().recordCaptureIntent({
    kind: 'pickup',
    player: { refType: 'participant', participantId: participants[0].id },
  });
  useAdvancedTrackingStore.getState().recordCaptureIntent({
    kind: 'goal',
    scorer: { refType: 'participant', participantId: participants[1].id },
  });

  return participants;
}

function arrangeWinningAdvancedGame() {
  arrangeAdvancedGame();
  useAdvancedTrackingStore.setState((state) => {
    state.currentGame!.settings.format = {
      ...state.currentGame!.settings.format!,
      gameTo: 1,
    };
  });
  recordOpeningPull();
  useAdvancedTrackingStore.getState().recordCaptureIntent({
    kind: 'pickup',
    player: { refType: 'participant', participantId: testTeam.roster[0].id },
  });
  const result = useAdvancedTrackingStore.getState().recordCaptureIntent({
    kind: 'goal',
    scorer: { refType: 'participant', participantId: testTeam.roster[1].id },
  });
  if (!result.ok) {
    throw new Error(`Unable to arrange winning goal: ${result.reason}`);
  }
}

function arrangeNaturalHalftimeAfterGoal() {
  arrangeAdvancedGame();
  useAdvancedTrackingStore.setState((state) => {
    state.currentGame!.settings.format = {
      ...state.currentGame!.settings.format!,
      halftimeAt: 1,
    };
  });
  recordOpeningPull();
  useAdvancedTrackingStore.getState().recordCaptureIntent({
    kind: 'pickup',
    player: { refType: 'participant', participantId: testTeam.roster[0].id },
  });
  const result = useAdvancedTrackingStore.getState().recordCaptureIntent({
    kind: 'goal',
    scorer: { refType: 'participant', participantId: testTeam.roster[1].id },
  });
  if (!result.ok) {
    throw new Error(`Unable to arrange natural halftime goal: ${result.reason}`);
  }
}

function arrangeOpponentWinningAdvancedGame() {
  arrangeAdvancedGame();
  useAdvancedTrackingStore.setState((state) => {
    state.currentGame!.settings.format = {
      ...state.currentGame!.settings.format!,
      gameTo: 1,
    };
  });
  recordOpeningPull();
  useAdvancedTrackingStore.getState().recordCaptureIntent({
    kind: 'pickup',
    player: { refType: 'participant', participantId: testTeam.roster[0].id },
  });
  const turnover = useAdvancedTrackingStore.getState().recordCaptureIntent({ kind: 'throwaway' });
  if (!turnover.ok) {
    throw new Error(`Unable to arrange turnover before opponent goal: ${turnover.reason}`);
  }
  const result = useAdvancedTrackingStore
    .getState()
    .recordCaptureIntent({ kind: 'anonymous-opponent-goal' });
  if (!result.ok) {
    throw new Error(`Unable to arrange opponent winning goal: ${result.reason}`);
  }
}

describe('advanced tracking routes', () => {
  beforeEach(async () => {
    resetAllStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  it('redirects before rendering protected tracker content without a current game', async () => {
    await renderScreen(<TrackerScreen />);

    expect(router.replace).toHaveBeenCalledWith('/Dashboard', {
      relativeToDirectory: undefined,
      withAnchor: undefined,
    });
    expect(screen.queryByText('Windchill')).not.toBeOnTheScreen();
  });

  it('classifies a throwaway inline and undo removes the classified turnover', async () => {
    const user = userEvent.setup();
    arrangeAdvancedGame();
    recordOpeningPull();
    const pickupResult = useAdvancedTrackingStore.getState().recordCaptureIntent({
      kind: 'pickup',
      player: { refType: 'participant', participantId: testTeam.roster[0].id },
    });
    expect(pickupResult.ok).toBe(true);
    const result = useAdvancedTrackingStore.getState().recordCaptureIntent({ kind: 'throwaway' });
    expect(result.ok).toBe(true);

    await renderScreen(<TrackerScreen />);

    await user.press(screen.getByTestId('throw-type-huck'));
    expect(
      useAdvancedTrackingStore.getState().currentGame?.points[0].possessions[0].actions.at(-1),
    ).toMatchObject({ details: { type: 'huck' } });

    await user.press(screen.getByTestId('throw-type-backfield-reset'));
    expect(
      useAdvancedTrackingStore.getState().currentGame?.points[0].possessions[0].actions.at(-1),
    ).toMatchObject({ details: { type: 'backfield_reset' } });

    await user.press(screen.getByTestId('tracker-undo-button'));
    expect(
      useAdvancedTrackingStore.getState().currentGame?.points[0].possessions[0].actions,
    ).toHaveLength(2);
    expect(
      useAdvancedTrackingStore.getState().currentGame?.points[0].possessions[0].actions.at(-1),
    ).toMatchObject({ kind: 'disc_pickup' });
    expect(screen.queryByTestId('throw-type-huck')).not.toBeOnTheScreen();
  });

  it('keeps the last-action card available to classify and undo a goal', async () => {
    const user = userEvent.setup();
    arrangeAdvancedGame();
    recordOpeningPull();
    useAdvancedTrackingStore.getState().recordCaptureIntent({
      kind: 'pickup',
      player: { refType: 'participant', participantId: testTeam.roster[0].id },
    });
    const result = useAdvancedTrackingStore.getState().recordCaptureIntent({
      kind: 'goal',
      scorer: { refType: 'participant', participantId: testTeam.roster[1].id },
    });
    expect(result.ok).toBe(true);

    await renderScreen(<TrackerScreen />);

    expect(screen.getByTestId('throw-type-huck')).toBeOnTheScreen();
    expect(screen.getByTestId('tracker-undo-button')).toBeOnTheScreen();
    expect(screen.queryByTestId('tracker-more-button')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('between-point-undo')).not.toBeOnTheScreen();
    expect(screen.getByTestId('between-point-start-next')).toBeOnTheScreen();
    await user.press(screen.getByTestId('throw-type-huck'));

    expect(
      useAdvancedTrackingStore.getState().currentGame?.points[0].possessions[0].actions.at(-1),
    ).toMatchObject({ kind: 'throw', result: 'goal', details: { type: 'huck' } });

    await user.press(screen.getByTestId('tracker-undo-button'));
    expect(
      useAdvancedTrackingStore.getState().currentGame?.points[0].possessions[0].actions.at(-1),
    ).toMatchObject({ kind: 'disc_pickup' });
    expect(screen.queryByTestId('throw-type-huck')).not.toBeOnTheScreen();
  });

  it('adds a private game note from the tracker menu', async () => {
    const user = userEvent.setup();
    arrangeAdvancedGame();
    recordOpeningPull();
    await renderScreen(<TrackerScreen />);

    await user.press(screen.getByTestId('tracker-menu-button'));
    await user.press(screen.getByTestId('tracker-menu-game-note'));
    await user.type(
      screen.getByTestId('advanced-game-note-input'),
      'Wind picked up after halftime.',
    );
    await user.press(screen.getByTestId('advanced-game-note-save'));

    expect(useAdvancedTrackingStore.getState().currentGame?.metadata?.notes).toBe(
      'Wind picked up after halftime.',
    );
    expect(screen.queryByTestId('advanced-game-note-editor')).not.toBeOnTheScreen();
  });

  it('adds a private note from the completed-point surface', async () => {
    const user = userEvent.setup();
    arrangeAdvancedGame();
    recordOpeningPull();
    useAdvancedTrackingStore.getState().recordCaptureIntent({
      kind: 'pickup',
      player: { refType: 'participant', participantId: testTeam.roster[0].id },
    });
    useAdvancedTrackingStore.getState().recordCaptureIntent({
      kind: 'goal',
      scorer: { refType: 'participant', participantId: testTeam.roster[1].id },
    });
    await renderScreen(<TrackerScreen />);

    await user.press(screen.getByTestId('between-point-note'));

    expect(screen.getByText('Point Note')).toBeVisible();
    await user.type(
      screen.getByTestId('advanced-point-note-input'),
      'Attack the open side sooner.',
    );
    await user.press(screen.getByTestId('advanced-point-note-save'));

    await waitFor(() => {
      expect(useAdvancedTrackingStore.getState().currentGame?.points[0].note).toBe(
        'Attack the open side sooner.',
      );
    });
    expect(screen.queryByTestId('advanced-point-note-editor')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Edit point note')).toBeVisible();
  });

  it('creates an advanced game through the real pre-game route', async () => {
    const user = userEvent.setup();
    useGameStore.setState({ currentTeam: testTeam, team2Name: 'Rivals' });
    await renderScreen(<AdvancedPreGameConfirm />);

    expect(screen.getByText('ADVANCED TRACKER')).toBeVisible();

    await user.press(screen.getByText('Windchill'));
    await user.press(screen.getByText('Set Line'));

    expect(useAdvancedTrackingStore.getState().currentGame?.sides[0].label).toBe('Windchill');
    expect(useAdvancedTrackingStore.getState().currentGame?.flip).toBeUndefined();
    expect(router.push).toHaveBeenCalledWith('/advancedTracking/TrackerLineSelect');
  });

  it('records an optional flip result and choice through the pre-game route', async () => {
    const user = userEvent.setup();
    useGameStore.setState({ currentTeam: testTeam, team2Name: 'Rivals' });
    await renderScreen(<AdvancedPreGameConfirm />);

    await user.press(screen.getByText('Windchill'));
    await user.press(screen.getByText('Won'));
    await user.press(screen.getByText('Side'));
    await user.press(screen.getByText('Set Line'));

    expect(useAdvancedTrackingStore.getState().currentGame?.flip).toEqual({
      result: 'won',
      choice: 'side',
    });
  });

  it('does not collect a flip result for a scrimmage', async () => {
    setMockSearchParams({ gameType: 'scrimmage' });
    useGameStore.setState({ currentTeam: testTeam, team2Name: 'Rivals' });

    await renderScreen(<AdvancedPreGameConfirm />);

    expect(screen.getByText('SCRIMMAGE')).toBeVisible();
    expect(screen.queryByText('FLIP RESULT')).not.toBeOnTheScreen();
    expect(screen.getByText('WHO IS RECEIVING?')).toBeVisible();
  });

  it('keeps the opening receiver consistent with an offense flip choice', async () => {
    const user = userEvent.setup();
    useGameStore.setState({ currentTeam: testTeam, team2Name: 'Rivals' });
    await renderScreen(<AdvancedPreGameConfirm />);

    await user.press(screen.getByText('Won'));
    await user.press(screen.getByText('Offense'));
    await user.press(screen.getByText('Set Line'));

    const game = useAdvancedTrackingStore.getState().currentGame;
    expect(game?.initialReceivingSideId).toBe('focus-side');
    expect(game?.flip).toEqual({ result: 'won', choice: 'offense' });
  });

  it('preserves a flip win but clears a choice contradicted by the opening receiver', async () => {
    const user = userEvent.setup();
    useGameStore.setState({ currentTeam: testTeam, team2Name: 'Rivals' });
    await renderScreen(<AdvancedPreGameConfirm />);

    await user.press(screen.getByText('Won'));
    await user.press(screen.getByText('Offense'));
    await user.press(screen.getByText('Rivals'));
    await user.press(screen.getByText('Set Line'));

    const game = useAdvancedTrackingStore.getState().currentGame;
    expect(game?.initialReceivingSideId).toBe('opp-side');
    expect(game?.flip).toEqual({ result: 'won' });
  });

  it('renders line selection from the real current advanced game', async () => {
    arrangeAdvancedGame();

    await renderScreen(<TrackerLineSelectScreen />);

    expect(screen.getByText('O-Point · 0-0')).toBeVisible();
    expect(screen.getByText('Alex')).toBeVisible();
    expect(screen.getByText('Blair')).toBeVisible();
  });

  it('restores a partial next-line selection after backing out', async () => {
    const user = userEvent.setup();
    const participants = arrangeCompletedPointForNextLineSelection();
    const view = await renderScreen(<TrackerLineSelectScreen />);

    await user.press(screen.getByText(participants[0].name));
    await user.press(screen.getByText(participants[1].name));

    expect(screen.getByText('2/7')).toBeVisible();
    expect(
      useAdvancedTrackingStore.getState().pendingNextPointLineSelection?.participantIdsBySide.home,
    ).toEqual([participants[0].id, participants[1].id]);

    await user.press(screen.getByTestId('line-select-back'));
    expect(router.dismissTo).toHaveBeenCalledWith('/advancedTracking/Tracker');
    await view.unmount();

    await renderScreen(<TrackerLineSelectScreen />);

    expect(screen.getByText('2/7')).toBeVisible();
  });

  it('saves a complete line during halftime without starting the second half', async () => {
    const user = userEvent.setup();
    const participants = arrangeCompletedPointForNextLineSelection();
    expect(useAdvancedTrackingStore.getState().triggerHalftimeEarly()).toBe(true);
    useAdvancedTrackingStore.getState().startHalftimeTimer();
    const halftimeTimerStartedAt = useAdvancedTrackingStore.getState().halftimeTimerStartedAt;
    setMockSearchParams({ mode: 'prepare' });

    await renderScreen(<TrackerLineSelectScreen />);

    for (const participant of participants.slice(0, 7)) {
      await user.press(screen.getByText(participant.name));
    }
    expect(screen.getByText('SAVE LINE')).toBeVisible();
    await user.press(screen.getByTestId('line-select-confirm'));

    expect(router.dismissTo).toHaveBeenCalledWith('/advancedTracking/Tracker');
    expect(router.push).not.toHaveBeenCalled();
    expect(useAdvancedTrackingStore.getState().isHalftimeBreakActive).toBe(true);
    expect(useAdvancedTrackingStore.getState().halftimeTimerStartedAt).toBe(halftimeTimerStartedAt);
    expect(useAdvancedTrackingStore.getState().currentGame?.points).toHaveLength(1);
    expect(
      useAdvancedTrackingStore.getState().pendingNextPointLineSelection?.participantIdsBySide.home,
    ).toEqual(participants.slice(0, 7).map((participant) => participant.id));
  });

  it('loads a prepared halftime line into the normal second-half setup', async () => {
    const user = userEvent.setup();
    const participants = arrangeCompletedPointForNextLineSelection();
    expect(useAdvancedTrackingStore.getState().triggerHalftimeEarly()).toBe(true);
    const preparedLineIds = participants.slice(0, 7).map((participant) => participant.id);
    useAdvancedTrackingStore.getState().savePendingNextPointLineSelection('home', preparedLineIds);

    await renderScreen(<TrackerLineSelectScreen />);

    expect(screen.getByTestId('line-select-confirm')).toBeEnabled();
    for (const participant of participants.slice(0, 7)) {
      expect(screen.getByTestId(`player-chip-${participant.name}`)).toHaveProp(
        'accessibilityState',
        expect.objectContaining({ selected: true }),
      );
    }
    await user.press(screen.getByTestId('line-select-confirm'));

    expect(router.push).toHaveBeenCalledWith('/advancedTracking/PullTracking');
    expect(useAdvancedTrackingStore.getState().isHalftimeBreakActive).toBe(true);
  });

  it('restores each line while switching sides in a game with two tracked sides', async () => {
    const user = userEvent.setup();
    const participants = Array.from({ length: 14 }, (_, index) => ({
      id: `dual-player-${index + 1}`,
      name: `Dual Player ${index + 1}`,
    }));
    const game: AdvancedTrackedGame = {
      id: 'dual-tracked-game',
      schemaVersion: 2,
      createdAt: 0,
      updatedAt: 0,
      gameType: 'game',
      status: 'in_progress',
      focusSideId: 'home',
      initialReceivingSideId: 'home',
      settings: { locationMode: 'none' },
      sides: [
        { id: 'home', label: 'Home', trackingMode: 'full-roster' },
        { id: 'away', label: 'Away', trackingMode: 'full-roster' },
      ],
      participants,
      points: [],
    };
    useAdvancedTrackingStore.setState({
      currentGameId: game.id,
      currentGame: game,
    });

    await renderScreen(<TrackerLineSelectScreen />);

    expect(screen.getByText('Home Line · 0-0')).toBeVisible();
    for (const participant of participants.slice(0, 7)) {
      await user.press(screen.getByText(participant.name));
    }
    await user.press(screen.getByTestId('line-select-confirm'));

    expect(screen.getByText('Away Line · 0-0')).toBeVisible();
    await user.press(screen.getByText(participants[7].name));
    await user.press(screen.getByText(participants[8].name));
    expect(screen.getByText('2/7')).toBeVisible();

    await user.press(screen.getByTestId('line-select-back'));

    expect(screen.getByText('Home Line · 0-0')).toBeVisible();
    expect(screen.getByTestId('line-select-confirm')).toBeEnabled();
    await user.press(screen.getByTestId('line-select-confirm'));

    expect(screen.getByText('Away Line · 0-0')).toBeVisible();
    expect(screen.getByText('2/7')).toBeVisible();
  });

  it('defaults scrimmage line selection to the side group plus unassigned players', async () => {
    const user = userEvent.setup();
    const { participants } = arrangeDualTrackedPoint();

    await renderScreen(<TrackerLineSelectScreen />);

    expect(screen.getByText('Light Line · 0-0')).toBeVisible();
    expect(screen.getByText(participants[0].name)).toBeVisible();
    expect(screen.getByText(participants[14].name)).toBeVisible();
    expect(screen.queryByText(participants[7].name)).not.toBeOnTheScreen();

    await user.press(screen.getByTestId('line-select-show-all-players'));

    expect(screen.getByText(participants[7].name)).toBeVisible();
    expect(screen.getAllByText(/^Dark ·/).length).toBeGreaterThan(0);
  });

  it('records an opponent pull through the real pull-tracking flow', async () => {
    const user = userEvent.setup();
    const participants = Array.from({ length: 7 }, (_, index) => ({
      id: `opponent-pull-player-${index + 1}`,
      name: `Opponent Pull Player ${index + 1}`,
    }));
    useAdvancedTrackingStore.getState().createGame({
      id: 'opponent-pull-game',
      focusSideId: 'windchill',
      initialReceivingSideId: 'windchill',
      sides: [
        { id: 'windchill', label: 'Windchill', trackingMode: 'full-roster' },
        { id: 'rivals', label: 'Rivals', trackingMode: 'anonymous' },
      ],
      participants,
      format: { gameTo: 15 },
    });
    useAdvancedTrackingStore.getState().savePendingNextPointLineSelection(
      'windchill',
      participants.map((participant) => participant.id),
    );
    useSettingsStore.setState({ genderRatioEnabled: true, firstPointRatio: 'more-women' });
    await renderScreen(<PullTrackingScreen />);

    expect(screen.getByText('THEY ARE PULLING')).toBeVisible();

    await user.press(screen.getByText('Skip timing'));

    const state = useAdvancedTrackingStore.getState();
    expect(state.currentGame?.points).toHaveLength(1);
    expect(state.currentGame?.points[0].lines).toEqual([
      { sideId: 'windchill', participantIds: participants.map((participant) => participant.id) },
      { sideId: 'rivals', participantIds: [] },
    ]);
    expect(state.currentGame?.points[0].genderRatio).toBe('more-women');
    expect(state.pendingNextPointLineSelection).toBeNull();
    expect(router.dismissTo).toHaveBeenCalledWith('/advancedTracking/Tracker');
  });

  it('redirects pull tracking to line selection when the pending line is incomplete', async () => {
    arrangeAdvancedGame();
    useAdvancedTrackingStore
      .getState()
      .savePendingNextPointLineSelection('windchill', ['player-alex']);

    await renderScreen(<PullTrackingScreen />);

    expect(router.replace).toHaveBeenCalledWith('/advancedTracking/TrackerLineSelect', {
      relativeToDirectory: undefined,
      withAnchor: undefined,
    });
    expect(screen.queryByTestId('pull-skip-timing')).not.toBeOnTheScreen();
  });

  it('records canonical lines for both tracked sides without route params', async () => {
    const user = userEvent.setup();
    const participants = Array.from({ length: 14 }, (_, index) => ({
      id: `dual-pull-player-${index + 1}`,
      name: `Dual Pull Player ${index + 1}`,
    }));
    const lightIds = participants.slice(0, 7).map((participant) => participant.id);
    const darkIds = participants.slice(7).map((participant) => participant.id);
    useAdvancedTrackingStore.getState().createGame({
      id: 'dual-pull-game',
      gameType: 'scrimmage',
      focusSideId: 'light',
      initialReceivingSideId: 'light',
      sides: [
        { id: 'light', label: 'Light', trackingMode: 'full-roster' },
        { id: 'dark', label: 'Dark', trackingMode: 'full-roster' },
      ],
      participants,
      format: { gameTo: 15 },
    });
    useAdvancedTrackingStore.getState().savePendingNextPointLineSelection('light', lightIds);
    useAdvancedTrackingStore.getState().savePendingNextPointLineSelection('dark', darkIds);

    await renderScreen(<PullTrackingScreen />);

    expect(screen.getByText('DARK IS PULLING')).toBeVisible();
    expect(screen.getByText(participants[7].name)).toBeVisible();
    await user.press(screen.getByTestId('pull-skip-timing'));
    await user.press(screen.getByTestId('pull-result-inbound'));

    const state = useAdvancedTrackingStore.getState();
    expect(state.currentGame?.points[0].lines).toEqual([
      { sideId: 'light', participantIds: lightIds },
      { sideId: 'dark', participantIds: darkIds },
    ]);
    expect(state.pendingNextPointLineSelection).toBeNull();
  });

  it('renders the live Tracker with its real tracking hooks and game state', async () => {
    arrangeAdvancedGame();
    recordOpeningPull();

    await renderScreen(<TrackerScreen />);

    expect(screen.getAllByText('Windchill')[0]).toBeVisible();
    expect(screen.getAllByText('Rivals')[0]).toBeVisible();
  });

  it('offers separate prepare-line and start-second-half actions during halftime', async () => {
    const user = userEvent.setup();
    arrangeCompletedPointForNextLineSelection();
    expect(useAdvancedTrackingStore.getState().triggerHalftimeEarly()).toBe(true);

    await renderScreen(<TrackerScreen />);

    expect(screen.getByTestId('throw-type-huck')).toBeOnTheScreen();
    expect(screen.queryByTestId('tracker-undo-button')).not.toBeOnTheScreen();
    expect(screen.getByTestId('halftime-between-point-undo')).toBeOnTheScreen();
    expect(screen.getAllByText('Home')).toHaveLength(2);
    expect(screen.getAllByText('Away')).toHaveLength(2);
    expect(screen.getByText('SET LINE')).toBeVisible();
    expect(screen.getByText('START 2ND HALF')).toBeVisible();

    await user.press(screen.getByTestId('throw-type-huck'));
    expect(
      useAdvancedTrackingStore.getState().currentGame?.points[0].possessions[0].actions.at(-1),
    ).toMatchObject({ kind: 'throw', result: 'goal', details: { type: 'huck' } });

    await user.press(screen.getByTestId('halftime-between-point-set-line'));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/advancedTracking/TrackerLineSelect',
      params: { mode: 'prepare' },
    });
    expect(useAdvancedTrackingStore.getState().isHalftimeBreakActive).toBe(true);

    await user.press(screen.getByTestId('halftime-between-point-start-next'));
    expect(router.push).toHaveBeenLastCalledWith('/advancedTracking/TrackerLineSelect');
    expect(useAdvancedTrackingStore.getState().isHalftimeBreakActive).toBe(true);
  });

  it('shows a partial prepared line on the halftime surface', async () => {
    const participants = arrangeCompletedPointForNextLineSelection();
    expect(useAdvancedTrackingStore.getState().triggerHalftimeEarly()).toBe(true);
    useAdvancedTrackingStore.getState().savePendingNextPointLineSelection(
      'home',
      participants.slice(0, 2).map((participant) => participant.id),
    );

    await renderScreen(<TrackerScreen />);

    expect(screen.getByText('(2/7)')).toBeVisible();
    expect(screen.getByText('EDIT LINE')).toBeVisible();
    for (const participant of participants.slice(0, 2)) {
      expect(screen.getByTestId(`player-chip-${participant.name}`)).toBeVisible();
    }
  });

  it('does not duplicate undo after a goal naturally triggers halftime', async () => {
    arrangeNaturalHalftimeAfterGoal();

    await renderScreen(<TrackerScreen />);

    expect(screen.getByTestId('tracker-undo-button')).toBeOnTheScreen();
    expect(screen.queryByTestId('halftime-between-point-undo')).not.toBeOnTheScreen();
  });

  it('shows the dropper after a dual-tracked turnover', async () => {
    const game: AdvancedTrackedGame = {
      id: 'scrimmage-drop',
      schemaVersion: 2,
      createdAt: 0,
      updatedAt: 0,
      gameType: 'scrimmage',
      status: 'in_progress',
      focusSideId: 'light',
      initialReceivingSideId: 'light',
      settings: {
        locationMode: 'none',
        format: {
          formatType: 'standard',
          gameTo: 15,
          halftimeAt: 8,
          softCapEnabled: true,
          hardCapEnabled: true,
          timeoutsPerHalf: 2,
          floaterEnabled: true,
        },
      },
      sides: [
        { id: 'light', label: 'Light', trackingMode: 'full-roster' },
        { id: 'dark', label: 'Dark', trackingMode: 'full-roster' },
      ],
      participants: [
        { id: 'connor', name: 'Connor' },
        { id: 'charlotte', name: 'Charlotte' },
        { id: 'nora', name: 'Nora' },
      ],
      points: [
        {
          id: 'point-1',
          startedAt: 0,
          lines: [
            { sideId: 'light', participantIds: ['connor', 'charlotte'] },
            { sideId: 'dark', participantIds: ['nora'] },
          ],
          possessions: [
            {
              id: 'possession-1',
              sideId: 'light',
              actions: [
                {
                  id: 'pickup-1',
                  kind: 'disc_pickup',
                  sideId: 'light',
                  player: { refType: 'participant', participantId: 'connor' },
                },
                {
                  id: 'drop-1',
                  kind: 'throw',
                  sideId: 'light',
                  thrower: { refType: 'participant', participantId: 'connor' },
                  toPlayer: { refType: 'participant', participantId: 'charlotte' },
                  result: 'drop',
                },
              ],
            },
          ],
        },
      ],
    };
    useAdvancedTrackingStore.setState({
      currentGameId: game.id,
      currentGame: game,
    });

    await renderScreen(<TrackerScreen />);

    expect(screen.getByText('Charlotte')).toBeVisible();
    expect(screen.getByText('DROP')).toBeVisible();
    expect(screen.queryByText('OPP TURN')).not.toBeOnTheScreen();
  });

  it('renders the line-correction route for the current real point', async () => {
    arrangeAdvancedGame();
    recordOpeningPull();

    await renderScreen(<TrackerEditLineScreen />);

    expect(screen.getByText('Correct Current Lineup')).toBeVisible();
    expect(screen.getByText('Alex')).toBeVisible();
  });

  it('corrects the current active line through the single-side route', async () => {
    const user = userEvent.setup();
    const { participants, lineIds } = arrangeSingleSideTrackedPoint();

    await renderScreen(<TrackerEditLineScreen />);

    expect(screen.getByText('Correct Current Lineup')).toBeVisible();
    expect(screen.queryByText('Correct Current · Rivals')).not.toBeOnTheScreen();

    await user.press(screen.getByText(participants[1].name));
    await user.press(screen.getByText(participants[7].name));
    await user.press(screen.getByTestId('line-select-confirm'));

    const point = useAdvancedTrackingStore.getState().currentGame?.points[0];
    expect(point?.lines).toEqual([
      {
        sideId: 'windchill',
        participantIds: [lineIds[0], ...lineIds.slice(2), participants[7].id],
      },
    ]);
    expect(router.back).toHaveBeenCalled();
  });

  it('locks a player with a recorded action and explains the lock when tapped', async () => {
    const user = userEvent.setup();
    const { participants, lineIds } = arrangeSingleSideTrackedPoint();

    await renderScreen(<TrackerEditLineScreen />);

    expect(screen.getByTestId(`player-chip-lock-${participants[0].name}`)).toBeVisible();
    await user.press(screen.getByTestId(`player-chip-${participants[0].name}`));

    expect(screen.getByText('Player locked')).toBeVisible();
    expect(
      screen.getByText(
        `${participants[0].name} recorded an action this point and cannot be removed or moved.`,
      ),
    ).toBeVisible();
    expect(
      useAdvancedTrackingStore.getState().currentGame?.points[0].lines[0].participantIds,
    ).toContain(lineIds[0]);
  });

  it('locks the players whose status is preserved by an injury substitution', async () => {
    const user = userEvent.setup();
    const { participants, lineIds } = arrangeSingleSideTrackedPoint();
    const stoppageId = useAdvancedTrackingStore.getState().recordInjurySubs({
      sideId: 'windchill',
      changes: [
        {
          sideId: 'windchill',
          inIds: [participants[7].id],
          outIds: [lineIds[1]],
        },
      ],
    });
    useAdvancedTrackingStore.getState().resumeStoppage(stoppageId);

    await renderScreen(<TrackerEditLineScreen />);

    expect(screen.getByTestId(`player-chip-lock-${participants[1].name}`)).toBeVisible();
    expect(screen.getByTestId(`player-chip-lock-${participants[7].name}`)).toBeVisible();
    expect(screen.getByTestId(`player-chip-${participants[7].name}`)).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );

    await user.press(screen.getByText(participants[7].name));
    expect(
      screen.getByText(
        `${participants[7].name}'s status is preserved by a recorded injury substitution.`,
      ),
    ).toBeVisible();
    expect(useAdvancedTrackingStore.getState().currentGame?.points[0].subs).toHaveLength(1);
  });

  it('preserves the focus side injury subs when correcting the single-side line', async () => {
    const user = userEvent.setup();
    const { participants, lineIds } = arrangeSingleSideTrackedPoint();
    const stoppageId = useAdvancedTrackingStore.getState().recordInjurySubs({
      sideId: 'windchill',
      changes: [
        {
          sideId: 'windchill',
          inIds: [participants[7].id],
          outIds: [lineIds[0]],
        },
      ],
    });
    useAdvancedTrackingStore.getState().resumeStoppage(stoppageId);

    await renderScreen(<TrackerEditLineScreen />);
    await user.press(screen.getByText(participants[1].name));
    await user.press(screen.getByText(participants[8].name));
    await user.press(screen.getByTestId('line-select-confirm'));

    const point = useAdvancedTrackingStore.getState().currentGame?.points[0];
    expect(point?.subs).toHaveLength(1);
    expect(point?.lines[0].participantIds).toContain(participants[8].id);
    expect(point?.lines[0].participantIds).not.toContain(participants[1].id);
    expect(router.back).toHaveBeenCalled();
  });

  it('starts a scrimmage line correction on the active side', async () => {
    const { participants } = arrangeDualTrackedPoint();

    await renderScreen(<TrackerEditLineScreen />);

    expect(screen.getByText('Correct Current · Light')).toBeVisible();
    expect(screen.getByText(participants[0].name)).toBeVisible();
    expect(screen.queryByText(participants[7].name)).not.toBeOnTheScreen();
    expect(screen.queryByText('Correct Starting Lineup')).not.toBeOnTheScreen();
  });

  it('progresses through both active lines in a regular game with two tracked rosters', async () => {
    const user = userEvent.setup();
    arrangeDualTrackedPoint();
    useAdvancedTrackingStore.setState((state) => {
      state.currentGame!.gameType = 'game';
    });

    await renderScreen(<TrackerEditLineScreen />);

    expect(screen.getByText('Correct Current · Light')).toBeVisible();
    await user.press(screen.getByTestId('line-select-confirm'));
    expect(screen.getByText('Correct Current · Dark')).toBeVisible();
  });

  it('can show actionless active opposite-side players for an atomic scrimmage correction', async () => {
    const user = userEvent.setup();
    const { participants } = arrangeDualTrackedPointWithPreviouslyDarkBenchPlayer();

    await renderScreen(<TrackerEditLineScreen />);

    expect(screen.queryByText(participants[7].name)).not.toBeOnTheScreen();
    await user.press(screen.getByTestId('line-select-show-all-players'));

    expect(screen.getByText(participants[7].name)).toBeVisible();
    expect(screen.getByText(participants[8].name)).toBeVisible();
  });

  it('starts a line correction on the next active side after a turnover', async () => {
    const { participants } = arrangeDualTrackedPoint();
    useAdvancedTrackingStore.setState((state) => {
      state.currentGame!.points[0].possessions[0].actions.push({
        id: 'correction-turnover-1',
        kind: 'throw',
        sideId: 'light',
        thrower: { refType: 'participant', participantId: participants[0].id },
        toPlayer: { refType: 'participant', participantId: participants[1].id },
        result: 'drop',
      });
    });

    await renderScreen(<TrackerEditLineScreen />);

    expect(screen.getByText('Correct Current · Dark')).toBeVisible();
    expect(screen.getByText(participants[7].name)).toBeVisible();
    expect(screen.queryByText(participants[0].name)).not.toBeOnTheScreen();
  });

  it('continues to the other correction line when the active line is unchanged', async () => {
    const user = userEvent.setup();
    arrangeDualTrackedPoint();

    await renderScreen(<TrackerEditLineScreen />);
    await user.press(screen.getByTestId('line-select-confirm'));

    expect(screen.getByText('Correct Current · Dark')).toBeVisible();
  });

  it('finishes after correcting only the active scrimmage line', async () => {
    const user = userEvent.setup();
    const { participants } = arrangeDualTrackedPoint();

    await renderScreen(<TrackerEditLineScreen />);
    await user.press(screen.getByText(participants[1].name));
    await user.press(screen.getByText(participants[14].name));
    await user.press(screen.getByTestId('line-select-confirm'));

    expect(screen.getByText('Light lineup updated')).toBeVisible();
    await user.press(screen.getByTestId('line-correction-finish'));

    const point = useAdvancedTrackingStore.getState().currentGame?.points[0];
    expect(point?.lines.find((line) => line.sideId === 'light')?.participantIds).toEqual([
      participants[0].id,
      ...participants.slice(2, 7).map((participant) => participant.id),
      participants[14].id,
    ]);
    expect(point?.lines.find((line) => line.sideId === 'dark')?.participantIds).toEqual(
      participants.slice(7, 14).map((participant) => participant.id),
    );
    expect(router.back).toHaveBeenCalled();
  });

  it('edits the other scrimmage line before saving both corrections', async () => {
    const user = userEvent.setup();
    const { participants } = arrangeDualTrackedPoint();

    await renderScreen(<TrackerEditLineScreen />);
    await user.press(screen.getByText(participants[1].name));
    await user.press(screen.getByText(participants[14].name));
    await user.press(screen.getByTestId('line-select-confirm'));
    await user.press(screen.getByTestId('line-correction-edit-other'));

    expect(screen.getByText('Correct Current · Dark')).toBeVisible();
    await user.press(screen.getByText(participants[8].name));
    await user.press(screen.getByText(participants[15].name));
    await user.press(screen.getByTestId('line-select-confirm'));

    const lines = useAdvancedTrackingStore.getState().currentGame?.points[0].lines;
    expect(lines?.find((line) => line.sideId === 'light')?.participantIds).toContain(
      participants[14].id,
    );
    expect(lines?.find((line) => line.sideId === 'dark')?.participantIds).toContain(
      participants[15].id,
    );
    expect(router.back).toHaveBeenCalled();
  });

  it('returns from the other correction line with the active-side draft preserved', async () => {
    const user = userEvent.setup();
    const { participants } = arrangeDualTrackedPoint();

    await renderScreen(<TrackerEditLineScreen />);
    await user.press(screen.getByText(participants[1].name));
    await user.press(screen.getByText(participants[14].name));
    await user.press(screen.getByTestId('line-select-confirm'));
    await user.press(screen.getByTestId('line-correction-edit-other'));
    await user.press(screen.getByTestId('line-select-back'));

    expect(screen.getByText('Correct Current · Light')).toBeVisible();
    await user.press(screen.getByTestId('line-select-confirm'));
    expect(screen.getByText('Light lineup updated')).toBeVisible();
  });

  it('preserves injury history when backing out without changes', async () => {
    const user = userEvent.setup();
    const { participants } = arrangeDualTrackedPoint();
    useAdvancedTrackingStore.setState((state) => {
      state.currentGame!.points[0].subs = [
        {
          id: 'existing-light-sub',
          sideId: 'light',
          type: 'injury',
          inIds: [participants[14].id],
          outIds: [participants[0].id],
          stoppageActionId: 'earlier-injury',
        },
      ];
    });

    await renderScreen(<TrackerEditLineScreen />);
    await user.press(screen.getByTestId('line-select-confirm'));
    await user.press(screen.getByTestId('line-select-back'));
    await user.press(screen.getByTestId('line-select-back'));

    expect(useAdvancedTrackingStore.getState().currentGame?.points[0].subs).toHaveLength(1);
    expect(router.back).toHaveBeenCalled();
  });

  it('offers a removed actionless Light player for an atomic Dark-side swap', async () => {
    const user = userEvent.setup();
    const { participants } = arrangeDualTrackedPoint();

    await renderScreen(<TrackerEditLineScreen />);
    await user.press(screen.getByText(participants[1].name));
    await user.press(screen.getByText(participants[14].name));
    await user.press(screen.getByTestId('line-select-confirm'));
    await user.press(screen.getByTestId('line-correction-edit-other'));

    expect(screen.getByText('Correct Current · Dark')).toBeVisible();
    expect(screen.queryByText(participants[1].name)).not.toBeOnTheScreen();
    await user.press(screen.getByTestId('line-select-show-all-players'));
    expect(screen.getByText(participants[1].name)).toBeVisible();
  });

  it('restores the other active line when a drafted crossover is undone', async () => {
    const user = userEvent.setup();
    const { participants } = arrangeDualTrackedPoint();

    await renderScreen(<TrackerEditLineScreen />);
    await user.press(screen.getByText(participants[1].name));
    await user.press(screen.getByTestId('line-select-show-all-players'));
    await user.press(screen.getByText(participants[8].name));
    await user.press(screen.getByTestId('line-select-confirm'));

    expect(screen.getByText('Correct Current · Dark')).toBeVisible();
    expect(screen.getByText('6/7')).toBeVisible();
    await user.press(screen.getByTestId('line-select-back'));
    await user.press(screen.getByText(participants[8].name));
    await user.press(screen.getByText(participants[14].name));
    await user.press(screen.getByTestId('line-select-confirm'));
    await user.press(screen.getByTestId('line-correction-edit-other'));

    expect(screen.getByText('Correct Current · Dark')).toBeVisible();
    expect(screen.queryByText('6/7')).not.toBeOnTheScreen();
    expect(screen.getByTestId('line-select-confirm')).toBeEnabled();
  });

  it('saves an atomic crossover through the other-side editor', async () => {
    const user = userEvent.setup();
    const { participants } = arrangeDualTrackedPoint();

    await renderScreen(<TrackerEditLineScreen />);
    await user.press(screen.getByText(participants[1].name));
    await user.press(screen.getByTestId('line-select-show-all-players'));
    await user.press(screen.getByText(participants[8].name));
    await user.press(screen.getByTestId('line-select-confirm'));

    // Dark dropped to six when its active player crossed over, so the editor advances directly.
    expect(screen.getByText('Correct Current · Dark')).toBeVisible();
    await user.press(screen.getByTestId('line-select-show-all-players'));
    await user.press(screen.getByText(participants[1].name));
    await user.press(screen.getByTestId('line-select-confirm'));

    const point = useAdvancedTrackingStore.getState().currentGame?.points[0];
    expect(getEffectiveLineParticipantIds(point!, 'light')).toEqual([
      participants[0].id,
      ...participants.slice(2, 7).map((participant) => participant.id),
      participants[8].id,
    ]);
    expect(getEffectiveLineParticipantIds(point!, 'dark')).toEqual([
      participants[7].id,
      ...participants.slice(9, 14).map((participant) => participant.id),
      participants[1].id,
    ]);
    expect(router.back).toHaveBeenCalled();
  });

  it('preserves injury history for the uncorrected side when finishing early', async () => {
    const user = userEvent.setup();
    const { participants } = arrangeDualTrackedPoint();
    useAdvancedTrackingStore.setState((state) => {
      state.currentGame!.points[0].subs = [
        {
          id: 'existing-dark-sub',
          sideId: 'dark',
          type: 'injury',
          inIds: [participants[14].id],
          outIds: [participants[7].id],
          stoppageActionId: 'earlier-injury',
        },
      ];
      state.currentGame!.points[0].possessions[0].actions.push({
        id: 'earlier-injury',
        kind: 'stoppage',
        reason: 'injury',
        sideId: 'dark',
        resumedAt: 200,
      });
    });

    await renderScreen(<TrackerEditLineScreen />);
    await user.press(screen.getByText(participants[1].name));
    await user.press(screen.getByText(participants[15].name));
    await user.press(screen.getByTestId('line-select-confirm'));
    await user.press(screen.getByTestId('line-correction-finish'));

    expect(useAdvancedTrackingStore.getState().currentGame?.points[0].subs).toEqual([
      expect.objectContaining({ id: 'existing-dark-sub', sideId: 'dark' }),
    ]);
  });

  it('renders the injury-sub route for the current real point', async () => {
    arrangeAdvancedGame();
    recordOpeningPull();

    await renderScreen(<TrackerInjurySubScreen />);

    expect(screen.getByText('Injury Sub')).toBeVisible();
    expect(screen.getByText('Blair')).toBeVisible();
  });

  it('records an injury sub through the single-side route', async () => {
    const user = userEvent.setup();
    const { participants, lineIds } = arrangeSingleSideTrackedPoint();

    await renderScreen(<TrackerInjurySubScreen />);

    expect(screen.getByText('Injury Sub')).toBeVisible();
    expect(screen.queryByText('Injury Sub · Windchill')).not.toBeOnTheScreen();

    await user.press(screen.getByText(participants[0].name));
    await user.press(screen.getByText(participants[7].name));
    await user.press(screen.getByTestId('line-select-confirm'));

    const point = useAdvancedTrackingStore.getState().currentGame?.points[0];
    const stoppage = point?.possessions[0].actions.find((action) => action.kind === 'stoppage');
    expect(stoppage).toMatchObject({ kind: 'stoppage', reason: 'injury', sideId: 'windchill' });
    expect(point?.subs).toEqual([
      expect.objectContaining({
        sideId: 'windchill',
        inIds: [participants[7].id],
        outIds: [lineIds[0]],
        stoppageActionId: stoppage?.id,
      }),
    ]);
    expect(router.back).toHaveBeenCalled();
  });

  it('keeps the single-side injury sub confirm disabled until the line changes', async () => {
    const user = userEvent.setup();
    arrangeSingleSideTrackedPoint();

    await renderScreen(<TrackerInjurySubScreen />);
    await user.press(screen.getByTestId('line-select-confirm'));

    const point = useAdvancedTrackingStore.getState().currentGame?.points[0];
    expect(point?.subs).toBeUndefined();
    expect(point?.possessions[0].actions).toHaveLength(1);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('updates the active stoppage sub through the single-side edit flow', async () => {
    const user = userEvent.setup();
    const { participants, lineIds } = arrangeSingleSideTrackedPoint();
    const stoppageId = useAdvancedTrackingStore.getState().recordInjurySubs({
      sideId: 'windchill',
      changes: [
        {
          sideId: 'windchill',
          inIds: [participants[7].id],
          outIds: [lineIds[0]],
        },
      ],
    });
    const subId = useAdvancedTrackingStore.getState().currentGame?.points[0].subs?.[0].id;

    await renderScreen(<TrackerInjurySubScreen />);
    await user.press(screen.getByText(participants[1].name));
    await user.press(screen.getByText(participants[8].name));
    await user.press(screen.getByTestId('line-select-confirm'));

    const point = useAdvancedTrackingStore.getState().currentGame?.points[0];
    expect(
      point?.possessions[0].actions.filter((action) => action.kind === 'stoppage'),
    ).toHaveLength(1);
    expect(point?.subs).toEqual([
      expect.objectContaining({
        id: subId,
        sideId: 'windchill',
        inIds: [participants[7].id, participants[8].id],
        outIds: [lineIds[0], lineIds[1]],
        stoppageActionId: stoppageId,
      }),
    ]);
    expect(router.back).toHaveBeenCalled();
  });

  it('starts a scrimmage injury sub on the active side', async () => {
    const { participants } = arrangeDualTrackedPoint();

    await renderScreen(<TrackerInjurySubScreen />);

    expect(screen.getByText('Injury Sub · Light')).toBeVisible();
    expect(screen.getByText(participants[0].name)).toBeVisible();
    expect(screen.queryByText(participants[7].name)).not.toBeOnTheScreen();
  });

  it('can show legally available opposite-group players during a scrimmage injury sub', async () => {
    const user = userEvent.setup();
    const { participants } = arrangeDualTrackedPointWithPreviouslyDarkBenchPlayer();

    await renderScreen(<TrackerInjurySubScreen />);

    expect(screen.queryByText(participants[7].name)).not.toBeOnTheScreen();
    await user.press(screen.getByTestId('line-select-show-all-players'));

    expect(screen.getByText(participants[7].name)).toBeVisible();
    expect(screen.queryByText(participants[8].name)).not.toBeOnTheScreen();
  });

  it('starts on the next active side after a turnover', async () => {
    const { participants } = arrangeDualTrackedPoint();
    useAdvancedTrackingStore.setState((state) => {
      state.currentGame!.points[0].possessions[0].actions.push({
        id: 'turnover-1',
        kind: 'throw',
        sideId: 'light',
        thrower: { refType: 'participant', participantId: participants[0].id },
        toPlayer: { refType: 'participant', participantId: participants[1].id },
        result: 'drop',
      });
    });

    await renderScreen(<TrackerInjurySubScreen />);

    expect(screen.getByText('Injury Sub · Dark')).toBeVisible();
    expect(screen.getByText(participants[7].name)).toBeVisible();
    expect(screen.queryByText(participants[0].name)).not.toBeOnTheScreen();
  });

  it('continues directly to the other scrimmage side when the active line is unchanged', async () => {
    const user = userEvent.setup();
    const { participants } = arrangeDualTrackedPoint();

    await renderScreen(<TrackerInjurySubScreen />);
    await user.press(screen.getByTestId('line-select-confirm'));

    expect(screen.getByText('Injury Sub · Dark')).toBeVisible();
    expect(screen.getByText(participants[7].name)).toBeVisible();
    expect(screen.queryByText(participants[0].name)).not.toBeOnTheScreen();
    expect(screen.getByTestId('line-select-confirm')).toBeDisabled();
  });

  it('finishes after changing only the active scrimmage side', async () => {
    const user = userEvent.setup();
    const { participants } = arrangeDualTrackedPoint();

    await renderScreen(<TrackerInjurySubScreen />);
    await user.press(screen.getByText(participants[0].name));
    await user.press(screen.getByText(participants[14].name));
    await user.press(screen.getByTestId('line-select-confirm'));

    expect(screen.getByText('Light lineup updated')).toBeVisible();
    await user.press(screen.getByTestId('injury-sub-finish'));

    const point = useAdvancedTrackingStore.getState().currentGame?.points[0];
    expect(point?.subs).toEqual([
      expect.objectContaining({
        sideId: 'light',
        inIds: [participants[14].id],
        outIds: [participants[0].id],
      }),
    ]);
    expect(router.back).toHaveBeenCalled();
  });

  it('edits the other scrimmage side before saving both injury subs', async () => {
    const user = userEvent.setup();
    const { participants } = arrangeDualTrackedPoint();

    await renderScreen(<TrackerInjurySubScreen />);
    await user.press(screen.getByText(participants[0].name));
    await user.press(screen.getByText(participants[14].name));
    await user.press(screen.getByTestId('line-select-confirm'));
    await user.press(screen.getByTestId('injury-sub-edit-other'));

    expect(screen.getByText('Injury Sub · Dark')).toBeVisible();
    await user.press(screen.getByText(participants[7].name));
    await user.press(screen.getByText(participants[15].name));
    await user.press(screen.getByTestId('line-select-confirm'));

    const subs = useAdvancedTrackingStore.getState().currentGame?.points[0].subs;
    expect(subs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sideId: 'light',
          inIds: [participants[14].id],
          outIds: [participants[0].id],
        }),
        expect.objectContaining({
          sideId: 'dark',
          inIds: [participants[15].id],
          outIds: [participants[7].id],
        }),
      ]),
    );
    expect(router.back).toHaveBeenCalled();
  });

  it('returns from the other lineup with the active-side draft preserved', async () => {
    const user = userEvent.setup();
    const { participants } = arrangeDualTrackedPoint();

    await renderScreen(<TrackerInjurySubScreen />);
    await user.press(screen.getByText(participants[0].name));
    await user.press(screen.getByText(participants[14].name));
    await user.press(screen.getByTestId('line-select-confirm'));
    await user.press(screen.getByTestId('injury-sub-edit-other'));
    await user.press(screen.getByTestId('line-select-back'));

    expect(screen.getByText('Injury Sub · Light')).toBeVisible();
    await user.press(screen.getByTestId('line-select-confirm'));
    expect(screen.getByText('Light lineup updated')).toBeVisible();
  });

  it('preserves an existing injury sub when editing both tracked sides without changes', async () => {
    const user = userEvent.setup();
    const { participants } = arrangeDualTrackedPoint();
    useAdvancedTrackingStore.setState((state) => {
      const point = state.currentGame!.points[0];
      point.possessions[0].actions.push({
        id: 'active-injury',
        kind: 'stoppage',
        reason: 'injury',
        sideId: 'dark',
        pausedAt: 100,
      });
      point.subs = [
        {
          id: 'active-dark-sub',
          sideId: 'dark',
          type: 'injury',
          inIds: [participants[14].id],
          outIds: [participants[7].id],
          stoppageActionId: 'active-injury',
        },
      ];
    });

    await renderScreen(<TrackerInjurySubScreen />);
    await user.press(screen.getByTestId('line-select-confirm'));

    expect(screen.getByText('Injury Sub · Dark')).toBeVisible();
    expect(screen.getByTestId('line-select-confirm')).toBeEnabled();
    await user.press(screen.getByTestId('line-select-confirm'));

    expect(useAdvancedTrackingStore.getState().currentGame?.points[0].subs).toEqual([
      expect.objectContaining({
        id: 'active-dark-sub',
        sideId: 'dark',
        inIds: [participants[14].id],
        outIds: [participants[7].id],
        stoppageActionId: 'active-injury',
      }),
    ]);
    expect(router.back).toHaveBeenCalled();
  });

  it('excludes an earlier opposing sub-in from later injury selection', async () => {
    const { participants } = arrangeDualTrackedPoint();
    useAdvancedTrackingStore.setState((state) => {
      const point = state.currentGame!.points[0];
      point.possessions[0].actions.push({
        id: 'earlier-injury',
        kind: 'stoppage',
        reason: 'injury',
        sideId: 'dark',
        pausedAt: 100,
        resumedAt: 200,
      });
      point.subs = [
        {
          id: 'earlier-dark-sub',
          sideId: 'dark',
          type: 'injury',
          inIds: [participants[14].id],
          outIds: [participants[7].id],
          stoppageActionId: 'earlier-injury',
        },
      ];
    });

    await renderScreen(<TrackerInjurySubScreen />);

    expect(screen.queryByText(participants[14].name)).not.toBeOnTheScreen();
    expect(screen.getByText(participants[15].name)).toBeVisible();
  });

  it('classifies and undoes the winning throw from Game Complete', async () => {
    const user = userEvent.setup();
    arrangeWinningAdvancedGame();

    await renderScreen(<TrackerGameCompleteScreen />);

    expect(screen.getByText('GAME COMPLETE')).toBeVisible();
    expect(screen.getByTestId('game-complete-last-goal-card')).toBeVisible();
    expect(screen.getByText('ASSIST')).toBeVisible();
    expect(screen.getByText('GOAL')).toBeVisible();
    expect(screen.getByText('CLEAN HOLD')).toBeVisible();
    expect(screen.queryByText('FINAL ACTION')).not.toBeOnTheScreen();
    expect(screen.queryByText('OUR GOAL')).not.toBeOnTheScreen();
    expect(screen.queryByText('OPTIONAL THROW CLASSIFICATION')).not.toBeOnTheScreen();
    expect(screen.getByTestId('throw-type-huck')).toBeOnTheScreen();
    expect(screen.getByTestId('game-complete-undo')).toBeOnTheScreen();
    expect(screen.getByText('Return to the tracker and continue the game')).toBeVisible();
    expect(screen.queryByTestId('tracker-more-button')).not.toBeOnTheScreen();
    expect(screen.getByText('WHAT NEXT')).toBeVisible();

    await user.press(screen.getByTestId('throw-type-huck'));
    expect(
      useAdvancedTrackingStore.getState().currentGame?.points[0].possessions[0].actions.at(-1),
    ).toMatchObject({ kind: 'throw', result: 'goal', details: { type: 'huck' } });

    await user.press(screen.getByTestId('game-complete-undo'));
    expect(
      useAdvancedTrackingStore.getState().currentGame?.points[0].possessions[0].actions.at(-1),
    ).toMatchObject({ kind: 'disc_pickup' });
    expect(router.replace).toHaveBeenCalledWith('/advancedTracking/Tracker');
  });

  it('persists the winning throw classification when Game Complete is finished', async () => {
    const user = userEvent.setup();
    arrangeWinningAdvancedGame();

    await renderScreen(<TrackerGameCompleteScreen />);

    await user.press(screen.getByTestId('throw-type-huck'));
    await user.press(screen.getByTestId('game-complete-finish'));

    const savedGame = await useSavedAdvancedGamesStore.getState().loadGame('advanced-game-1');
    expect(savedGame?.status).toBe('final');
    expect(savedGame?.points[0].possessions[0].actions.at(-1)).toMatchObject({
      kind: 'throw',
      result: 'goal',
      details: { type: 'huck' },
    });
  });

  it('shows only undo for an opponent goal on Game Complete', async () => {
    arrangeOpponentWinningAdvancedGame();

    await renderScreen(<TrackerGameCompleteScreen />);

    expect(screen.queryByTestId('throw-type-huck')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('game-complete-last-goal-card')).not.toBeOnTheScreen();
    expect(screen.getByTestId('game-complete-undo')).toBeVisible();
    expect(screen.getByText('Undo Last Action')).toBeVisible();
  });

  it('classifies a fully tracked opponent winning throw on Game Complete', async () => {
    const user = userEvent.setup();
    const { participants } = arrangeDualTrackedOpponentWinningGame();

    await renderScreen(<TrackerGameCompleteScreen />);

    expect(screen.getByTestId('game-complete-last-goal-card')).toBeVisible();
    expect(screen.getByText(participants[8].name)).toBeVisible();
    expect(screen.getByText('GOAL')).toBeVisible();
    expect(screen.getByText('BROKEN')).toBeVisible();
    expect(screen.getByTestId('throw-type-huck')).toBeOnTheScreen();

    await user.press(screen.getByTestId('throw-type-huck'));
    expect(
      useAdvancedTrackingStore.getState().currentGame?.points[0].possessions.at(-1)?.actions.at(-1),
    ).toMatchObject({ kind: 'throw', result: 'goal', details: { type: 'huck' } });
  });

  it('renders the manual early-end route without faking game-over hooks', async () => {
    arrangeAdvancedGame();
    setMockSearchParams({ mode: 'earlyEnd' });

    await renderScreen(<TrackerGameCompleteScreen />);

    expect(screen.getByText('END GAME')).toBeVisible();
    expect(screen.getByText('Final Score')).toBeVisible();
    expect(screen.getByTestId('game-complete-undo')).toBeVisible();
    expect(screen.queryByTestId('tracker-undo-button')).not.toBeOnTheScreen();
    expect(screen.getByText('Done')).toBeVisible();
  });
});
