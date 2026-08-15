import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent, waitFor } from '@testing-library/react-native';

import AdvancedGameScreen from '@/app/(main)/(hub)/(analytics)/advancedTracking/analytics/[gameId]';
import AdvancedPlayerStatsScreen from '@/app/(main)/(hub)/(analytics)/advancedTracking/analytics/playerStats';
import AdvancedGameTimelineScreen from '@/app/(main)/(hub)/(analytics)/advancedTracking/analytics/timeline/[gameId]';
import { loadAdvancedGame } from '@/lib/advancedTracking/storage';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { arrangeAdvancedGame, cacheCurrentAdvancedGame } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter, setMockSearchParams } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

function makeEditableTimelineGame(): AdvancedTrackedGame {
  return {
    id: 'advanced-timeline-edit-game',
    schemaVersion: 2,
    createdAt: 1,
    updatedAt: 1,
    gameType: 'game',
    status: 'final',
    focusSideId: 'windchill',
    initialReceivingSideId: 'windchill',
    settings: { locationMode: 'none' },
    metadata: { title: 'Windchill vs Rivals' },
    sides: [
      { id: 'windchill', label: 'Windchill', trackingMode: 'full-roster' },
      { id: 'rivals', label: 'Rivals', trackingMode: 'anonymous' },
    ],
    participants: [
      { id: 'alex', name: 'Alex' },
      { id: 'blair', name: 'Blair' },
      { id: 'casey', name: 'Casey' },
    ],
    points: [
      {
        id: 'point-1',
        lines: [{ sideId: 'windchill', participantIds: ['alex', 'blair', 'casey'] }],
        possessions: [
          {
            id: 'possession-1',
            sideId: 'windchill',
            actions: [
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
      },
    ],
  };
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

  it('corrects and persists a goal scorer from the saved advanced timeline', async () => {
    const user = userEvent.setup();
    const game = makeEditableTimelineGame();
    useSavedAdvancedGamesStore.setState({
      gamesById: { [game.id]: game },
      summariesLoaded: true,
    });
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<AdvancedGameTimelineScreen />);
    await user.longPress(screen.getByTestId('advanced-timeline-action-goal-1'));

    expect(screen.getByText('Edit Scorer')).toBeVisible();
    expect(screen.queryByTestId('player-chip-Alex')).not.toBeOnTheScreen();
    await user.press(screen.getByTestId('player-chip-Casey'));
    await user.press(screen.getByTestId('advanced-goal-scorer-save'));

    await waitFor(() => {
      expect(screen.getByText('Alex + Casey · Goal')).toBeVisible();
    });
    const persistedGame = await loadAdvancedGame(game.id);
    expect(persistedGame?.points[0].possessions[0].actions[0]).toMatchObject({
      kind: 'throw',
      toPlayer: { refType: 'participant', participantId: 'casey' },
    });
  });

  it('corrects a scorer from an in-progress current-game timeline', async () => {
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
    await user.longPress(screen.getByTestId('advanced-timeline-action-goal-1'));
    await user.press(screen.getByTestId('player-chip-Casey'));
    await user.press(screen.getByTestId('advanced-goal-scorer-save'));

    await waitFor(() => {
      expect(screen.getByText('Alex + Casey · Goal')).toBeVisible();
    });
    expect(
      useAdvancedTrackingStore.getState().currentGame?.points[0].possessions[0].actions[0],
    ).toMatchObject({
      kind: 'throw',
      toPlayer: { refType: 'participant', participantId: 'casey' },
    });
  });

  it('renders a stored timeline when its scorer correction history is invalid', async () => {
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
    expect(screen.getByText('Windchill stats')).toBeVisible();
  });
});
