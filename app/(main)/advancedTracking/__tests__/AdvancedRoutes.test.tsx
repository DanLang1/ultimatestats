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

  it('renders the injury-sub route for the current real point', async () => {
    arrangeAdvancedGame();
    recordOpeningPull();

    await renderScreen(<TrackerInjurySubScreen />);

    expect(screen.getByText('Injury Sub')).toBeVisible();
    expect(screen.getByText('Blair')).toBeVisible();
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
