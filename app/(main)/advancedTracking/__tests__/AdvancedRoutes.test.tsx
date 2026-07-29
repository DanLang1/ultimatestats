import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import AdvancedPreGameConfirm from '@/app/(main)/advancedTracking/PreGameConfirm';
import PullTrackingScreen from '@/app/(main)/advancedTracking/PullTracking';
import TrackerScreen from '@/app/(main)/advancedTracking/Tracker';
import TrackerEditLineScreen from '@/app/(main)/advancedTracking/TrackerEditLine';
import TrackerGameCompleteScreen from '@/app/(main)/advancedTracking/TrackerGameComplete';
import TrackerInjurySubScreen from '@/app/(main)/advancedTracking/TrackerInjurySub';
import TrackerLineSelectScreen from '@/app/(main)/advancedTracking/TrackerLineSelect';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';
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
  const game: AdvancedTrackedGame = {
    id: 'dual-tracked-point',
    schemaVersion: 2,
    createdAt: 0,
    updatedAt: 0,
    gameType: 'scrimmage',
    status: 'in_progress',
    focusSideId: 'light',
    initialReceivingSideId: 'light',
    settings: { locationMode: 'none' },
    sides: [
      { id: 'light', label: 'Light', trackingMode: 'full-roster' },
      { id: 'dark', label: 'Dark', trackingMode: 'full-roster' },
    ],
    participants,
    points: [
      {
        id: 'point-1',
        lines: [
          { sideId: 'light', participantIds: lightIds },
          { sideId: 'dark', participantIds: darkIds },
        ],
        possessions: [
          {
            id: 'possession-1',
            sideId: 'light',
            actions: [
              {
                id: 'pull-1',
                kind: 'pull',
                sideId: 'dark',
                receivingSideId: 'light',
                puller: { refType: 'participant', participantId: darkIds[0] },
                receiver: { refType: 'participant', participantId: lightIds[0] },
                result: 'inbound',
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

  return { participants };
}

function arrangeSingleSideTrackedPoint() {
  const participants = Array.from({ length: 9 }, (_, index) => ({
    id: `single-player-${index + 1}`,
    name: `Single Player ${index + 1}`,
  }));
  const lineIds = participants.slice(0, 7).map((participant) => participant.id);
  const game: AdvancedTrackedGame = {
    id: 'single-side-point',
    schemaVersion: 2,
    createdAt: 0,
    updatedAt: 0,
    gameType: 'game',
    status: 'in_progress',
    focusSideId: 'windchill',
    initialReceivingSideId: 'windchill',
    settings: { locationMode: 'none' },
    sides: [
      { id: 'windchill', label: 'Windchill', trackingMode: 'full-roster' },
      { id: 'rivals', label: 'Rivals', trackingMode: 'anonymous' },
    ],
    participants,
    points: [
      {
        id: 'point-1',
        lines: [{ sideId: 'windchill', participantIds: lineIds }],
        possessions: [
          {
            id: 'possession-1',
            sideId: 'windchill',
            actions: [
              {
                id: 'pull-1',
                kind: 'pull',
                sideId: 'rivals',
                receivingSideId: 'windchill',
                puller: { refType: 'untracked' },
                receiver: { refType: 'participant', participantId: lineIds[0] },
                result: 'inbound',
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

  return { participants, lineIds };
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

  it('selects both lines for a non-scrimmage game with two tracked sides', async () => {
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
  });

  it('records an opponent pull through the real pull-tracking flow', async () => {
    const user = userEvent.setup();
    arrangeAdvancedGame();
    setMockSearchParams({
      isOurPull: 'false',
      lineParticipantIds: JSON.stringify(['player-alex', 'player-blair']),
    });
    await renderScreen(<PullTrackingScreen />);

    expect(screen.getByText('THEY ARE PULLING')).toBeVisible();

    await user.press(screen.getByText('Skip timing'));

    expect(useAdvancedTrackingStore.getState().currentGame?.points).toHaveLength(1);
    expect(router.dismissTo).toHaveBeenCalledWith('/advancedTracking/Tracker');
  });

  it('renders the live Tracker with its real tracking hooks and game state', async () => {
    arrangeAdvancedGame();
    recordOpeningPull();

    await renderScreen(<TrackerScreen />);

    expect(screen.getAllByText('Windchill')[0]).toBeVisible();
    expect(screen.getAllByText('Rivals')[0]).toBeVisible();
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

    expect(screen.getByText('Edit Line')).toBeVisible();
    expect(screen.getByText('Alex')).toBeVisible();
  });

  it('corrects the starting line through the single-side route', async () => {
    const user = userEvent.setup();
    const { participants, lineIds } = arrangeSingleSideTrackedPoint();

    await renderScreen(<TrackerEditLineScreen />);

    expect(screen.getByText('Edit Line')).toBeVisible();
    expect(screen.queryByText('Edit Rivals Line')).not.toBeOnTheScreen();

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
        `${participants[0].name} has recorded an action this point. Undo or edit that action before removing them from the lineup.`,
      ),
    ).toBeVisible();
    expect(
      useAdvancedTrackingStore.getState().currentGame?.points[0].lines[0].participantIds,
    ).toContain(lineIds[0]);
  });

  it('allows correcting injury-only participants and removes the invalidated sub', async () => {
    const user = userEvent.setup();
    const { participants, lineIds } = arrangeSingleSideTrackedPoint();
    useAdvancedTrackingStore.getState().recordInjurySubs({
      sideId: 'windchill',
      changes: [
        {
          sideId: 'windchill',
          inIds: [participants[7].id],
          outIds: [lineIds[1]],
        },
      ],
    });

    await renderScreen(<TrackerEditLineScreen />);

    expect(screen.queryByTestId(`player-chip-lock-${participants[1].name}`)).not.toBeOnTheScreen();
    expect(screen.queryByTestId(`player-chip-lock-${participants[7].name}`)).not.toBeOnTheScreen();

    await user.press(screen.getByText(participants[1].name));
    await user.press(screen.getByText(participants[8].name));
    await user.press(screen.getByTestId('line-select-confirm'));

    const point = useAdvancedTrackingStore.getState().currentGame?.points[0];
    expect(point?.subs).toBeUndefined();
    expect(point?.lines[0].participantIds).toContain(participants[8].id);
    expect(point?.lines[0].participantIds).not.toContain(participants[1].id);
    expect(router.back).toHaveBeenCalled();
  });

  it('preserves the focus side injury subs when correcting the single-side line', async () => {
    const user = userEvent.setup();
    const { participants, lineIds } = arrangeSingleSideTrackedPoint();
    useAdvancedTrackingStore.getState().recordInjurySubs({
      sideId: 'windchill',
      changes: [
        {
          sideId: 'windchill',
          inIds: [participants[7].id],
          outIds: [lineIds[0]],
        },
      ],
    });

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

    expect(screen.getByText('Edit Light Line')).toBeVisible();
    expect(screen.getByText(participants[0].name)).toBeVisible();
    expect(screen.queryByText(participants[7].name)).not.toBeOnTheScreen();
    expect(screen.queryByText('Correct Starting Lineup')).not.toBeOnTheScreen();
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

    expect(screen.getByText('Edit Dark Line')).toBeVisible();
    expect(screen.getByText(participants[7].name)).toBeVisible();
    expect(screen.queryByText(participants[0].name)).not.toBeOnTheScreen();
  });

  it('continues to the other correction line when the active line is unchanged', async () => {
    const user = userEvent.setup();
    arrangeDualTrackedPoint();

    await renderScreen(<TrackerEditLineScreen />);
    await user.press(screen.getByTestId('line-select-confirm'));

    expect(screen.getByText('Edit Dark Line')).toBeVisible();
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

    expect(screen.getByText('Edit Dark Line')).toBeVisible();
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

    expect(screen.getByText('Edit Light Line')).toBeVisible();
    await user.press(screen.getByTestId('line-select-confirm'));
    expect(screen.getByText('Light lineup updated')).toBeVisible();
  });

  it('preserves injury history when a dual-side correction makes no changes', async () => {
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
    await user.press(screen.getByTestId('line-select-confirm'));

    expect(useAdvancedTrackingStore.getState().currentGame?.points[0].subs).toHaveLength(1);
    expect(router.back).toHaveBeenCalled();
  });

  it('does not offer a removed Light player while correcting the Dark line', async () => {
    const user = userEvent.setup();
    const { participants } = arrangeDualTrackedPoint();

    await renderScreen(<TrackerEditLineScreen />);
    await user.press(screen.getByText(participants[1].name));
    await user.press(screen.getByText(participants[14].name));
    await user.press(screen.getByTestId('line-select-confirm'));
    await user.press(screen.getByTestId('line-correction-edit-other'));

    expect(screen.getByText('Edit Dark Line')).toBeVisible();
    expect(screen.queryByText(participants[1].name)).not.toBeOnTheScreen();
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

  it('renders the manual early-end route without faking game-over hooks', async () => {
    arrangeAdvancedGame();
    setMockSearchParams({ mode: 'earlyEnd' });

    await renderScreen(<TrackerGameCompleteScreen />);

    expect(screen.getByText('END GAME')).toBeVisible();
    expect(screen.getByText('Final Score')).toBeVisible();
    expect(screen.getByText('Done')).toBeVisible();
  });
});
