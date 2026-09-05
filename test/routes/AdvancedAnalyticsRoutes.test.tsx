import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AdvancedGameScreen from '@/app/(main)/(hub)/(analytics)/advancedTracking/analytics/[gameId]';
import AdvancedPlayerStatsScreen from '@/app/(main)/(hub)/(analytics)/advancedTracking/analytics/playerStats';
import AdvancedGameTimelineScreen from '@/app/(main)/(hub)/(analytics)/advancedTracking/analytics/timeline/[gameId]';
import TimelineEditLineScreen from '@/app/(main)/advancedTracking/TimelineEditLine';
import { loadAdvancedGame } from '@/lib/advancedTracking/storage';
import { getEffectiveLineParticipantIds } from '@/lib/advancedTracking/trackingUtils';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { createAdvancedGameScenario } from '@/test/fixtures/advancedGameBuilder';
import { arrangeAdvancedGame, cacheCurrentAdvancedGame } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter, setMockSearchParams } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

function makeEditableTimelineGame(): AdvancedTrackedGame {
  return createAdvancedGameScenario({
    id: 'advanced-timeline-edit-game',
    createdAt: 1,
    updatedAt: 1,
    status: 'final',
    focusSideId: 'windchill',
    initialReceivingSideId: 'windchill',
    metadata: { title: 'Windchill vs Rivals' },
    sides: [
      { id: 'windchill', label: 'Windchill', trackingMode: 'full-roster' },
      { id: 'rivals', label: 'Rivals', trackingMode: 'anonymous' },
    ],
    participants: [
      { id: 'alex', name: 'Alex' },
      { id: 'blair', name: 'Blair' },
      { id: 'casey', name: 'Casey' },
      { id: 'dana', name: 'Dana' },
      { id: 'eli', name: 'Eli' },
      { id: 'finn', name: 'Finn' },
      { id: 'gia', name: 'Gia' },
      { id: 'hana', name: 'Hana' },
    ],
  })
    .addPoint({
      id: 'point-1',
      lines: [
        {
          sideId: 'windchill',
          participantIds: ['alex', 'blair', 'casey', 'dana', 'eli', 'finn', 'gia'],
        },
      ],
      possessions: [
        {
          id: 'possession-1',
          sideId: 'windchill',
          actions: [
            {
              id: 'pickup-1',
              kind: 'disc_pickup',
              sideId: 'windchill',
              player: { refType: 'participant', participantId: 'alex' },
            },
            {
              id: 'goal-1',
              kind: 'throw',
              sideId: 'windchill',
              thrower: { refType: 'participant', participantId: 'alex' },
              toPlayer: { refType: 'participant', participantId: 'blair' },
              result: 'goal',
            },
          ],
        },
      ],
    })
    .build();
}

describe('advanced analytics routes', () => {
  beforeEach(async () => {
    resetAllStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  it('renders a dynamic advanced-game route from the real cached game store', async () => {
    arrangeAdvancedGame();
    const game = cacheCurrentAdvancedGame();
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<AdvancedGameScreen />);

    expect(screen.getByText('ADVANCED GAME')).toBeVisible();
    expect(screen.getByText('PLAYED AT')).toBeVisible();
    expect(screen.getByText('Windchill')).toBeVisible();
    expect(screen.getByText('Rivals')).toBeVisible();
  });

  it('shows the share action for a terminated advanced game', async () => {
    const game = makeEditableTimelineGame();
    game.status = 'terminated';
    game.endReason = 'manual';
    useSavedAdvancedGamesStore.setState({
      gamesById: { [game.id]: game },
      summariesLoaded: true,
    });
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<AdvancedGameScreen />);

    expect(screen.getByTestId('header-action-share')).toBeVisible();
  });

  it('edits and persists a private note from a saved advanced game', async () => {
    const user = userEvent.setup();
    arrangeAdvancedGame();
    const game = cacheCurrentAdvancedGame();
    setMockSearchParams({ gameId: game.id });
    await renderScreen(<AdvancedGameScreen />);

    await user.press(screen.getByTestId('advanced-game-note-card'));
    await user.type(screen.getByTestId('advanced-game-note-input'), 'Review the red-zone offense.');
    await user.press(screen.getByTestId('advanced-game-note-save'));

    await waitFor(() => {
      expect(useSavedAdvancedGamesStore.getState().gamesById[game.id].metadata?.notes).toBe(
        'Review the red-zone offense.',
      );
    });
    expect(screen.getByText('Review the red-zone offense.')).toBeVisible();
  });

  it('renders the advanced timeline empty state from a real cached game', async () => {
    arrangeAdvancedGame();
    const game = cacheCurrentAdvancedGame();
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<AdvancedGameTimelineScreen />);

    expect(screen.getByText('GAME TIMELINE')).toBeVisible();
    expect(screen.getByText('Windchill vs Rivals')).toBeVisible();
    expect(screen.getByText('No points to display')).toBeVisible();
  });

  it('corrects and persists a pickup-less terminal touch from the saved timeline', async () => {
    const user = userEvent.setup();
    const game = makeEditableTimelineGame();
    game.points[0].possessions[0].actions = [game.points[0].possessions[0].actions.at(-1)!];
    useSavedAdvancedGamesStore.setState({
      gamesById: { [game.id]: game },
      summariesLoaded: true,
    });
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<AdvancedGameTimelineScreen />);
    await user.press(screen.getByTestId('advanced-timeline-action-goal-1'));

    expect(screen.getByText('Edit Touch')).toBeVisible();
    expect(
      screen.queryByText('Change who made this touch without changing the recorded result.'),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText('Change the recorded player.')).not.toBeOnTheScreen();
    expect(screen.getByTestId('player-chip-Alex')).toBeVisible();
    await user.press(screen.getByTestId('player-chip-Casey'));
    await user.press(screen.getByTestId('advanced-touch-save'));

    await waitFor(() => {
      expect(screen.getByText('Alex + Casey · Goal')).toBeVisible();
    });
    const persistedGame = await loadAdvancedGame(game.id);
    expect(persistedGame?.points[0].possessions[0].actions[0]).toMatchObject({
      kind: 'throw',
      toPlayer: { refType: 'participant', participantId: 'casey' },
    });
  });

  it('corrects one middle touch across its incoming and outgoing throws', async () => {
    const user = userEvent.setup();
    const game = makeEditableTimelineGame();
    game.points[0].possessions[0].actions = [
      game.points[0].possessions[0].actions[0],
      {
        id: 'pass-1',
        kind: 'throw',
        sideId: 'windchill',
        thrower: { refType: 'participant', participantId: 'alex' },
        toPlayer: { refType: 'participant', participantId: 'blair' },
        result: 'complete',
      },
      {
        id: 'pass-2',
        kind: 'throw',
        sideId: 'windchill',
        thrower: { refType: 'participant', participantId: 'blair' },
        toPlayer: { refType: 'participant', participantId: 'casey' },
        result: 'complete',
      },
      {
        id: 'goal-1',
        kind: 'throw',
        sideId: 'windchill',
        thrower: { refType: 'participant', participantId: 'casey' },
        toPlayer: { refType: 'participant', participantId: 'eli' },
        result: 'goal',
      },
    ];
    useSavedAdvancedGamesStore.setState({
      gamesById: { [game.id]: game },
      summariesLoaded: true,
    });
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<AdvancedGameTimelineScreen />);
    const chainText = screen.getByText('Alex -> Blair -> Casey');
    expect(chainText).toHaveProp('numberOfLines', 2);
    await user.press(screen.getByTestId('advanced-timeline-chain-pass-1'));
    expect(chainText.props.numberOfLines).toBeUndefined();
    await user.press(screen.getByTestId('advanced-timeline-action-pass-1'));

    expect(screen.getByText('Select the touch you want to correct.')).toBeVisible();
    const middleTouch = screen.getByTestId('advanced-touch-pass-receiver:pass-1');
    expect(screen.queryByText('PREVIEW')).toBeNull();
    await user.press(middleTouch);
    expect(middleTouch).toHaveTextContent(/Blair/);
    expect(middleTouch.props.accessibilityLabel).toContain('Blair');
    expect(screen.getByText('ORIGINAL: Blair')).toBeVisible();
    expect(screen.queryByText('REPLACE PARTICIPANT')).not.toBeOnTheScreen();
    expect(screen.getByTestId('player-chip-Blair')).toHaveTextContent(/ORIGINAL/);
    await user.press(screen.getByTestId('player-chip-Dana'));
    expect(middleTouch).toHaveTextContent(/Dana/);
    expect(middleTouch.props.accessibilityLabel).toContain('will change to Dana');
    await user.press(screen.getByTestId('player-chip-Blair'));
    expect(middleTouch).toHaveTextContent(/Blair/);
    expect(middleTouch.props.accessibilityLabel).toContain('unchanged');
    expect(screen.getByTestId('advanced-touch-save')).toBeDisabled();
    await user.press(screen.getByTestId('player-chip-Dana'));
    await user.press(screen.getByTestId('advanced-touch-save'));

    await waitFor(() => {
      const actions =
        useSavedAdvancedGamesStore.getState().gamesById[game.id].points[0].possessions[0].actions;
      expect(actions[1]).toMatchObject({
        kind: 'throw',
        toPlayer: { refType: 'participant', participantId: 'dana' },
      });
      expect(actions[2]).toMatchObject({
        kind: 'throw',
        thrower: { refType: 'participant', participantId: 'dana' },
      });
    });
  });

  it('opens the turnover editor and converts a throwaway while preserving holder continuity', async () => {
    const user = userEvent.setup();
    const game = makeEditableTimelineGame();
    game.points[0].possessions[0].actions = [
      {
        id: 'pickup-1',
        kind: 'disc_pickup',
        sideId: 'windchill',
        player: { refType: 'participant', participantId: 'alex' },
      },
      {
        id: 'pass-1',
        kind: 'throw',
        sideId: 'windchill',
        thrower: { refType: 'participant', participantId: 'alex' },
        toPlayer: { refType: 'participant', participantId: 'blair' },
        result: 'complete',
      },
      {
        id: 'turnover-1',
        kind: 'throw',
        sideId: 'windchill',
        thrower: { refType: 'participant', participantId: 'blair' },
        result: 'throwaway',
      },
    ];
    game.points[0].possessions.push({
      id: 'possession-2',
      sideId: 'rivals',
      actions: [
        {
          id: 'goal-2',
          kind: 'throw',
          sideId: 'rivals',
          thrower: { refType: 'untracked' },
          toPlayer: { refType: 'untracked' },
          result: 'goal',
        },
      ],
    });
    useSavedAdvancedGamesStore.setState({
      gamesById: { [game.id]: game },
      summariesLoaded: true,
    });
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<AdvancedGameTimelineScreen />);
    await user.press(screen.getByTestId('advanced-timeline-action-turnover-1'));

    expect(screen.getByText('Edit Turnover')).toBeVisible();
    expect(screen.getByTestId('advanced-turnover-field-result')).toBeVisible();
    expect(screen.getByTestId('advanced-turnover-field-thrower')).toBeVisible();
    expect(screen.getByTestId('advanced-turnover-field-classification')).toBeVisible();
    expect(screen.queryByTestId('advanced-turnover-field-role')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('advanced-turnover-result-drop')).not.toBeOnTheScreen();

    const resultField = screen.getByTestId('advanced-turnover-field-result');
    await user.press(resultField);
    expect(resultField).toHaveStyle({ backgroundColor: 'transparent' });
    expect(screen.getByTestId('advanced-turnover-result-drop')).toBeVisible();
    expect(screen.getByTestId('advanced-turnover-result-fifty-fifty')).toBeVisible();
    expect(screen.getByTestId('advanced-turnover-result-block')).toBeVisible();
    expect(screen.getByText('Opp Block')).toBeVisible();
    expect(screen.getByTestId('advanced-turnover-result-stall')).toBeVisible();
    expect(screen.queryByTestId('advanced-turnover-result-pressure')).not.toBeOnTheScreen();

    await user.press(screen.getByTestId('advanced-turnover-result-drop'));
    expect(screen.getByTestId('advanced-turnover-field-role')).toBeVisible();
    await user.press(screen.getByTestId('advanced-turnover-field-thrower'));
    expect(screen.getByTestId('player-chip-Blair')).toHaveTextContent(/ORIGINAL/);
    await user.press(screen.getByTestId('player-chip-Dana'));
    expect(screen.getByText('LINKED CHANGE')).toBeVisible();
    await user.press(screen.getByTestId('advanced-turnover-field-role'));
    await user.press(screen.getByTestId('player-chip-Casey'));
    await user.press(screen.getByTestId('advanced-turnover-save'));

    await waitFor(() => {
      const actions =
        useSavedAdvancedGamesStore.getState().gamesById[game.id].points[0].possessions[0].actions;
      expect(actions[1]).toMatchObject({
        toPlayer: { refType: 'participant', participantId: 'dana' },
      });
      expect(actions[2]).toMatchObject({
        result: 'drop',
        thrower: { refType: 'participant', participantId: 'dana' },
        toPlayer: { refType: 'participant', participantId: 'casey' },
      });
    });
  });

  it('does not save a no-op after round-tripping an irrelevant defender draft', async () => {
    const user = userEvent.setup();
    const game = makeEditableTimelineGame();
    const rivals = Array.from({ length: 7 }, (_, index) => ({
      id: `rivals-${index + 1}`,
      name: `Rival ${index + 1}`,
    }));
    game.participants.push(...rivals);
    game.sides[1].trackingMode = 'full-roster';
    game.points[0].lines.push({
      sideId: 'rivals',
      participantIds: rivals.map((participant) => participant.id),
    });
    game.points[0].possessions[0].actions = [
      {
        id: 'pickup-1',
        kind: 'disc_pickup',
        sideId: 'windchill',
        player: { refType: 'participant', participantId: 'alex' },
      },
      {
        id: 'turnover-1',
        kind: 'throw',
        sideId: 'windchill',
        thrower: { refType: 'participant', participantId: 'alex' },
        result: 'throwaway',
      },
    ];
    game.points[0].possessions.push({
      id: 'possession-2',
      sideId: 'rivals',
      actions: [
        {
          id: 'goal-2',
          kind: 'throw',
          sideId: 'rivals',
          thrower: { refType: 'participant', participantId: 'rivals-1' },
          toPlayer: { refType: 'participant', participantId: 'rivals-2' },
          result: 'goal',
        },
      ],
    });
    useSavedAdvancedGamesStore.setState({
      gamesById: { [game.id]: game },
      summariesLoaded: true,
    });
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<AdvancedGameTimelineScreen />);
    await user.press(screen.getByTestId('advanced-timeline-action-turnover-1'));
    await user.press(screen.getByTestId('advanced-turnover-field-result'));
    expect(screen.getByText('Opp Block')).toBeVisible();
    expect(screen.getByText('Opp Pressure')).toBeVisible();
    await user.press(screen.getByTestId('advanced-turnover-result-block'));
    await user.press(screen.getByTestId('advanced-turnover-field-role'));
    await user.press(screen.getByTestId('player-chip-Rival 3'));
    await user.press(screen.getByTestId('advanced-turnover-field-result'));
    await user.press(screen.getByTestId('advanced-turnover-result-throwaway'));

    expect(screen.getByTestId('advanced-turnover-save')).toBeDisabled();
  });

  it('adds, previews, edits, and removes a private point note from the saved timeline', async () => {
    const user = userEvent.setup();
    const game = makeEditableTimelineGame();
    useSavedAdvancedGamesStore.setState({
      gamesById: { [game.id]: game },
      summariesLoaded: true,
    });
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<AdvancedGameTimelineScreen />);
    await user.press(screen.getByTestId('advanced-point-note-1'));

    expect(screen.getByText('Point Note')).toBeVisible();
    await user.type(screen.getByTestId('advanced-point-note-input'), 'Keep the reset flatter.');
    await user.press(screen.getByTestId('advanced-point-note-save'));

    await waitFor(() => {
      expect(screen.getByText('Keep the reset flatter.')).toBeVisible();
      expect(useSavedAdvancedGamesStore.getState().gamesById[game.id].points[0].note).toBe(
        'Keep the reset flatter.',
      );
    });

    await user.press(screen.getByTestId('advanced-point-note-1'));
    await user.clear(screen.getByTestId('advanced-point-note-input'));
    await user.press(screen.getByTestId('advanced-point-note-save'));

    await waitFor(() => {
      expect(useSavedAdvancedGamesStore.getState().gamesById[game.id].points[0]).not.toHaveProperty(
        'note',
      );
      expect(screen.getByText('Add note')).toBeVisible();
    });
  });

  it('corrects a completed touch from an in-progress current-game timeline', async () => {
    const user = userEvent.setup();
    const game = { ...makeEditableTimelineGame(), status: 'in_progress' as const };
    useAdvancedTrackingStore.setState({ currentGameId: game.id, currentGame: game });
    useSavedAdvancedGamesStore.setState({
      gamesById: { [game.id]: game },
      summariesLoaded: true,
    });
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<AdvancedGameTimelineScreen />);
    expect(screen.getByText('In Progress')).toBeVisible();
    await user.press(screen.getByTestId('advanced-timeline-action-goal-1'));
    await user.press(screen.getByTestId('player-chip-Casey'));
    await user.press(screen.getByTestId('advanced-touch-save'));

    await waitFor(() => {
      expect(screen.getByText('Alex + Casey · Goal')).toBeVisible();
    });
    expect(
      useAdvancedTrackingStore.getState().currentGame?.points[0].possessions[0].actions[1],
    ).toMatchObject({
      kind: 'throw',
      toPlayer: { refType: 'participant', participantId: 'casey' },
    });
  });

  it('edits a point note through the in-progress current-game timeline', async () => {
    const user = userEvent.setup();
    const game = { ...makeEditableTimelineGame(), status: 'in_progress' as const };
    useAdvancedTrackingStore.setState({ currentGameId: game.id, currentGame: game });
    useSavedAdvancedGamesStore.setState({
      gamesById: { [game.id]: game },
      summariesLoaded: true,
    });
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<AdvancedGameTimelineScreen />);
    await user.press(screen.getByTestId('advanced-point-note-1'));
    await user.type(screen.getByTestId('advanced-point-note-input'), 'Live timeline note.');
    await user.press(screen.getByTestId('advanced-point-note-save'));

    await waitFor(() => {
      expect(useAdvancedTrackingStore.getState().currentGame?.points[0].note).toBe(
        'Live timeline note.',
      );
      expect(screen.getByText('Live timeline note.')).toBeVisible();
    });
  });

  it('uses the live game as the source for an in-progress timeline note', async () => {
    const user = userEvent.setup();
    const currentGame = { ...makeEditableTimelineGame(), status: 'in_progress' as const };
    currentGame.points[0].note = 'Live timeline note.';
    const savedGame: AdvancedTrackedGame = {
      ...currentGame,
      points: currentGame.points.map(({ note: _note, ...point }) => point),
    };
    useAdvancedTrackingStore.setState({ currentGameId: currentGame.id, currentGame });
    useSavedAdvancedGamesStore.setState({
      gamesById: { [savedGame.id]: savedGame },
      summariesLoaded: true,
    });
    setMockSearchParams({ gameId: currentGame.id });

    await renderScreen(<AdvancedGameTimelineScreen />);
    await user.press(screen.getByTestId('advanced-point-note-1'));

    expect(screen.getByDisplayValue('Live timeline note.')).toBeVisible();
    await user.press(screen.getByTestId('advanced-point-note-save'));

    await waitFor(() => {
      expect(useAdvancedTrackingStore.getState().currentGame?.points[0].note).toBe(
        'Live timeline note.',
      );
    });
  });

  it('opens and persists a completed-point lineup correction from the advanced timeline', async () => {
    const user = userEvent.setup();
    const game = makeEditableTimelineGame();
    useSavedAdvancedGamesStore.setState({
      gamesById: { [game.id]: game },
      summariesLoaded: true,
    });
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<AdvancedGameTimelineScreen />);

    expect(screen.getByTestId('advanced-edit-point-line-1')).toHaveStyle({
      backgroundColor: 'transparent',
    });
    await user.press(screen.getByTestId('advanced-edit-point-line-1'));

    setMockSearchParams({ gameId: game.id, pointId: 'point-1' });
    await renderScreen(<TimelineEditLineScreen />);
    expect(screen.getByText('Correct Final Lineup')).toBeVisible();

    await user.press(screen.getByTestId('player-chip-Casey'));
    await user.press(screen.getByTestId('player-chip-Hana'));
    await user.press(screen.getByTestId('line-select-confirm'));

    await waitFor(() => {
      expect(
        useSavedAdvancedGamesStore.getState().gamesById[game.id].points[0].lines[0].participantIds,
      ).toEqual(['alex', 'blair', 'dana', 'eli', 'finn', 'gia', 'hana']);
    });

    const persistedGame = await loadAdvancedGame(game.id);
    expect(persistedGame?.points[0].lines[0].participantIds).toEqual([
      'alex',
      'blair',
      'dana',
      'eli',
      'finn',
      'gia',
      'hana',
    ]);
  });

  it('persists a completed-point lineup correction from the active-game timeline', async () => {
    const user = userEvent.setup();
    const game = { ...makeEditableTimelineGame(), status: 'in_progress' as const };
    useAdvancedTrackingStore.setState({ currentGameId: game.id, currentGame: game });
    useSavedAdvancedGamesStore.setState({
      gamesById: { [game.id]: game },
      summariesLoaded: true,
    });
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<AdvancedGameTimelineScreen />);
    await user.press(screen.getByTestId('advanced-edit-point-line-1'));

    setMockSearchParams({ gameId: game.id, pointId: 'point-1' });
    await renderScreen(<TimelineEditLineScreen />);
    await user.press(screen.getByTestId('player-chip-Casey'));
    await user.press(screen.getByTestId('player-chip-Hana'));
    await user.press(screen.getByTestId('line-select-confirm'));

    await waitFor(() => {
      expect(
        useAdvancedTrackingStore.getState().currentGame?.points[0].lines[0].participantIds,
      ).toEqual(['alex', 'blair', 'dana', 'eli', 'finn', 'gia', 'hana']);
    });
  });

  it('initializes from the final active line and preserves recorded injuries', async () => {
    const user = userEvent.setup();
    const game = makeEditableTimelineGame();
    game.participants.push({ id: 'irene', name: 'Irene' });
    game.points[0].subs = [
      {
        id: 'injury-sub-1',
        sideId: 'windchill',
        type: 'injury',
        inIds: ['hana'],
        outIds: ['casey'],
        stoppageActionId: 'injury-1',
      },
    ];
    game.points[0].possessions[0].actions.unshift({
      id: 'injury-1',
      kind: 'stoppage',
      reason: 'injury',
      sideId: 'windchill',
      resumedAt: 2,
    });
    useSavedAdvancedGamesStore.setState({
      gamesById: { [game.id]: game },
      summariesLoaded: true,
    });
    setMockSearchParams({ gameId: game.id, pointId: 'point-1' });

    await renderScreen(<TimelineEditLineScreen />);

    expect(screen.getByTestId('player-chip-Hana')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
    expect(screen.getByTestId('player-chip-Casey')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: false }),
    );
    expect(screen.getByTestId('player-chip-lock-Hana')).toBeVisible();
    expect(screen.getByTestId('player-chip-lock-Casey')).toBeVisible();

    await user.press(screen.getByTestId('player-chip-Dana'));
    await user.press(screen.getByTestId('player-chip-Irene'));
    await user.press(screen.getByTestId('line-select-confirm'));

    await waitFor(() => {
      const correctedPoint = useSavedAdvancedGamesStore.getState().gamesById[game.id].points[0];
      expect(getEffectiveLineParticipantIds(correctedPoint, 'windchill')).toContain('irene');
    });
    const correctedPoint = useSavedAdvancedGamesStore.getState().gamesById[game.id].points[0];
    expect(correctedPoint.subs).toEqual(game.points[0].subs);
    expect(getEffectiveLineParticipantIds(correctedPoint, 'windchill')).toContain('hana');
  });

  it('allows correcting the final active line of a terminated unfinished point', async () => {
    const game = makeEditableTimelineGame();
    game.status = 'terminated';
    game.endReason = 'manual';
    const lastAction = game.points[0].possessions[0].actions.at(-1)!;
    if (lastAction.kind !== 'throw') throw new Error('Expected a throw fixture.');
    lastAction.result = 'complete';
    useSavedAdvancedGamesStore.setState({
      gamesById: { [game.id]: game },
      summariesLoaded: true,
    });
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<AdvancedGameTimelineScreen />);

    expect(screen.getByTestId('advanced-edit-point-line-1')).toBeVisible();
    setMockSearchParams({ gameId: game.id, pointId: 'point-1' });
    await renderScreen(<TimelineEditLineScreen />);
    expect(screen.getByText('Correct Final Lineup')).toBeVisible();
  });

  it('does not open the saved-boundary editor while a terminated game remains current', async () => {
    const game = makeEditableTimelineGame();
    game.status = 'terminated';
    game.endReason = 'manual';
    const lastAction = game.points[0].possessions[0].actions.at(-1)!;
    if (lastAction.kind !== 'throw') throw new Error('Expected a throw fixture.');
    lastAction.result = 'complete';
    useAdvancedTrackingStore.setState({ currentGameId: game.id, currentGame: game });
    useSavedAdvancedGamesStore.setState({
      gamesById: { [game.id]: game },
      summariesLoaded: true,
    });
    setMockSearchParams({ gameId: game.id, pointId: 'point-1' });

    await renderScreen(<TimelineEditLineScreen />);

    expect(screen.queryByText('Correct Final Lineup')).not.toBeOnTheScreen();
    expect(router.replace).toHaveBeenCalledWith(
      {
        pathname: '/advancedTracking/analytics/timeline/[gameId]',
        params: { gameId: game.id },
      },
      { relativeToDirectory: undefined, withAnchor: undefined },
    );
  });

  it('renders a stored timeline when its touch correction history is invalid', async () => {
    const game = makeEditableTimelineGame();
    game.points[0].subs = [
      {
        id: 'invalid-sub',
        sideId: 'windchill',
        type: 'injury',
        inIds: ['casey'],
        outIds: ['blair'],
        stoppageActionId: 'missing-stoppage',
      },
    ];
    useSavedAdvancedGamesStore.setState({
      gamesById: { [game.id]: game },
      summariesLoaded: true,
    });
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<AdvancedGameTimelineScreen />);

    expect(screen.getByText('GAME TIMELINE')).toBeVisible();
    expect(screen.getByText('Alex + Blair · Goal')).toBeVisible();
    expect(screen.queryByTestId('advanced-timeline-action-goal-1')).not.toBeOnTheScreen();
  });

  it('renders advanced player stats from a real cached game and participant', async () => {
    arrangeAdvancedGame();
    const game = cacheCurrentAdvancedGame();
    setMockSearchParams({
      gameId: game.id,
      participantId: 'player-alex',
      sideId: 'windchill',
    });

    await renderScreen(<AdvancedPlayerStatsScreen />);

    expect(screen.getByText('PLAYER STATS')).toBeVisible();
    expect(screen.getByText('Alex')).toBeVisible();
    expect(screen.getByText(/^Windchill · .* vs Rivals$/)).toBeVisible();
  });

  it('renders classified throw details on the advanced player page', async () => {
    const game = makeEditableTimelineGame();
    const goalAction = game.points[0].possessions[0].actions.at(-1)!;
    if (goalAction.kind !== 'throw') throw new Error('Expected goal throw fixture.');
    goalAction.details = { type: 'huck' };
    useSavedAdvancedGamesStore.setState({
      gamesById: { [game.id]: game },
      summariesLoaded: true,
    });
    setMockSearchParams({
      gameId: game.id,
      participantId: 'alex',
      sideId: 'windchill',
    });

    await renderScreen(<AdvancedPlayerStatsScreen />);

    expect(screen.getByTestId('advanced-player-throw-types-card')).toBeVisible();
    expect(screen.getByText('HUCK THROWING')).toBeVisible();
    expect(screen.getByText('Completion rate')).toBeVisible();
    expect(screen.getByText('1 of 1')).toBeVisible();
    expect(screen.queryByText('EFFICIENCY')).toBeNull();
    await userEvent.setup().press(screen.getByRole('button', { name: 'More team comparisons' }));
    expect(screen.getByText('EFFICIENCY')).toBeVisible();
  });
});
