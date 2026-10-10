import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import CreateTournamentScreen from '@/app/(main)/(hub)/(analytics)/CreateTournament';
import GameTimelineScreen from '@/app/(main)/(hub)/(analytics)/GameTimeline';
import PlayerStatsScreen from '@/app/(main)/(hub)/(analytics)/PlayerStats';
import SavedGameScreen from '@/app/(main)/(hub)/(analytics)/saved-games/[gameId]';
import SavedGameStatsScreen from '@/app/(main)/(hub)/(analytics)/SavedGameStats';
import ViewStatsScreen from '@/app/(main)/(hub)/(analytics)/ViewStats';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import type { GameEvent, PointLineRecord } from '@/lib/storage/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';
import { usePlayerStatsStore } from '@/store/playerStatsStore';
import { useTournamentStore } from '@/store/tournamentStore';
import { arrangeBasicGame, createSavedBasicGame, testTeam } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter, setMockSearchParams } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

describe('basic analytics routes', () => {
  beforeEach(async () => {
    resetAllStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  it('renders the empty saved-games route from real stores', async () => {
    await renderScreen(<SavedGameStatsScreen />);

    expect(screen.getByText('SAVED GAMES')).toBeVisible();
    expect(screen.getByText('No saved games yet')).toBeVisible();
    expect(screen.queryByPlaceholderText('Search teams or dates...')).not.toBeOnTheScreen();
  });

  it('creates a tournament through the real persisted store action', async () => {
    const user = userEvent.setup();
    await renderScreen(<CreateTournamentScreen />);

    await user.type(screen.getByPlaceholderText('Tournament name'), 'Windy City Invite');
    await user.press(screen.getByText('Create Tournament'));

    expect(useTournamentStore.getState().tournaments[0]?.name).toBe('Windy City Invite');
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('renders current-game stats from the real basic game store', async () => {
    arrangeBasicGame({ statTrackingEnabled: true });
    useGameStore.setState({
      team1Score: 1,
      events: [
        {
          type: 'goal',
          team: 'team1',
          goalPlayerId: 'player-alex',
          assistPlayerId: 'player-blair',
          pointNumber: 1,
        },
      ],
    });

    await renderScreen(<ViewStatsScreen />);

    expect(screen.getByText('CURRENT GAME')).toBeVisible();
    expect(screen.getByText('Live Stats')).toBeVisible();
    expect(screen.getByText('Windchill')).toBeVisible();
    expect(screen.getByText('Rivals')).toBeVisible();
  });

  it('switches live stats perspective when both sides are fully tracked', async () => {
    const user = userEvent.setup();
    const lightPlayer = { refType: 'participant' as const, participantId: 'light-player' };
    const game: AdvancedTrackedGame = {
      id: 'dual-tracked-game',
      schemaVersion: 2,
      createdAt: 0,
      updatedAt: 0,
      gameType: 'game',
      status: 'in_progress',
      focusSideId: 'light',
      initialReceivingSideId: 'light',
      settings: { locationMode: 'none' },
      sides: [
        { id: 'light', label: 'Light', trackingMode: 'full-roster' },
        { id: 'dark', label: 'Dark', trackingMode: 'full-roster' },
      ],
      participants: [
        { id: 'light-player', name: 'Light Player' },
        { id: 'dark-player', name: 'Dark Player' },
      ],
      points: [
        {
          id: 'pt1',
          lines: [
            { sideId: 'light', participantIds: ['light-player'] },
            { sideId: 'dark', participantIds: ['dark-player'] },
          ],
          possessions: [
            {
              id: 'pos1',
              sideId: 'light',
              actions: [
                {
                  id: 'pull1',
                  kind: 'pull',
                  sideId: 'dark',
                  receivingSideId: 'light',
                  puller: { refType: 'participant', participantId: 'dark-player' },
                  result: 'inbound',
                },
                {
                  id: 'goal1',
                  kind: 'throw',
                  sideId: 'light',
                  thrower: lightPlayer,
                  toPlayer: lightPlayer,
                  result: 'goal',
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

    await renderScreen(<ViewStatsScreen />);

    expect(screen.getByText('STATS FOR')).toBeVisible();
    expect(screen.getByTestId('advanced-stats-team-name')).toHaveTextContent('Light');
    expect(screen.getByTestId('advanced-stats-opponent-name')).toHaveTextContent('Dark');
    expect(screen.getByTestId('advanced-stats-score-badge')).toHaveTextContent('1 - 0');

    await user.press(screen.getAllByText('Dark')[0]);

    expect(screen.getByTestId('advanced-stats-team-name')).toHaveTextContent('Dark');
    expect(screen.getByTestId('advanced-stats-opponent-name')).toHaveTextContent('Light');
    expect(screen.getByTestId('advanced-stats-score-badge')).toHaveTextContent('0 - 1');
  });

  it('renders the live game timeline from real events', async () => {
    const user = userEvent.setup();
    arrangeBasicGame({ statTrackingEnabled: true });
    useGameStore.setState({
      team1Score: 1,
      currentPoint: 2,
      pointLines: [
        {
          pointNumber: 1,
          playerIds: ['player-alex', 'player-blair'],
          timestamp: 1,
        },
      ],
      events: [
        {
          type: 'goal',
          team: 'team1',
          goalPlayerId: 'player-alex',
          assistPlayerId: 'player-blair',
          pointNumber: 1,
        },
      ],
    });

    await renderScreen(<GameTimelineScreen />);

    await user.press(screen.getByLabelText('Edit point 1 line'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/EditPointLineModal',
      params: { pointNumber: '1', gameId: 'current' },
    });
  });

  it('hides saved-timeline line editing for the matching live in-progress point', async () => {
    const game = {
      ...createSavedBasicGame(),
      pointLines: [
        {
          pointNumber: 1,
          playerIds: ['player-alex', 'player-blair'],
          timestamp: 1,
        },
      ],
    };
    useGameStore.setState({
      savedGames: [game],
      currentGameId: game.id,
      currentPoint: 1,
    });
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<GameTimelineScreen />);

    expect(screen.getByText('GAME TIMELINE')).toBeVisible();
    expect(screen.queryByLabelText('Edit point 1 line')).not.toBeOnTheScreen();
  });

  it('renders player analytics from the real player-stats store', async () => {
    const game = createSavedBasicGame();
    usePlayerStatsStore
      .getState()
      .openPlayerStats(
        'player-alex',
        game.events,
        'team1',
        testTeam.roster,
        [game],
        game.pointLines,
        game.startingPossession,
        game.gameTo,
      );

    await renderScreen(<PlayerStatsScreen />);

    expect(screen.getByText('PLAYER STATS')).toBeVisible();
    expect(screen.getByText('Alex')).toBeVisible();
    expect(screen.getAllByText('+1').length).toBeGreaterThan(0);
    expect(screen.getByText('Net impact')).toBeVisible();
    expect(screen.getByText('PROFILE')).toBeVisible();
  });

  it('renders a dynamic saved-game route from a real saved record', async () => {
    const game = createSavedBasicGame();
    useGameStore.setState({ savedGames: [game], savedTeams: [testTeam] });
    setMockSearchParams({ gameId: game.id });

    await renderScreen(<SavedGameScreen />);

    expect(screen.getByText('SAVED GAME')).toBeVisible();
    expect(screen.getByText('PLAYED AT')).toBeVisible();
    expect(screen.getByText('Windchill')).toBeVisible();
    expect(screen.getByText('Rivals')).toBeVisible();
  });
});

it('sorts live player stats and opens analytics for a player with only line participation', async () => {
  resetAllStores();
  resetMockRouter();
  arrangeBasicGame({ statTrackingEnabled: true });
  useGameStore.setState({
    currentTeam: {
      ...testTeam,
      roster: [
        ...testTeam.roster,
        { id: 'player-casey', name: 'Casey', isActive: true, matchingType: null, role: null },
      ],
    },
    events: [
      {
        type: 'turnover',
        team: 'team1',
        playerId: 'player-alex',
        subtype: 'throwaway',
        pointNumber: 1,
      },
      {
        type: 'turnover',
        team: 'team1',
        playerId: 'player-blair',
        subtype: 'drop',
        pointNumber: 1,
      },
      { type: 'goal', team: 'team2', goalPlayerId: null, assistPlayerId: null, pointNumber: 1 },
      { type: 'goal', team: 'team2', goalPlayerId: null, assistPlayerId: null, pointNumber: 2 },
    ],
    pointLines: [
      {
        pointNumber: 1,
        playerIds: ['player-alex', 'player-blair', 'player-casey'],
        timestamp: 1,
      },
      { pointNumber: 2, playerIds: ['player-alex'], timestamp: 2 },
    ],
  });
  const user = userEvent.setup();
  await renderScreen(<ViewStatsScreen />);
  const expectNameOrder = (expected: string[]) => {
    const nodes = screen.getAllByText(/^(Alex|Blair|Casey)$/);
    expect(nodes).toHaveLength(expected.length);
    expected.forEach((name, index) => expect(nodes[index]).toHaveTextContent(name));
  };
  await user.press(screen.getByText('PLAYER'));
  expectNameOrder(['Casey', 'Blair', 'Alex']);
  await user.press(screen.getByText('PLAYER'));
  expectNameOrder(['Alex', 'Blair', 'Casey']);
  await user.press(screen.getByText('PP'));
  expectNameOrder(['Alex', 'Blair', 'Casey']);
  await user.press(screen.getByText('PP'));
  expectNameOrder(['Blair', 'Casey', 'Alex']);
  await user.press(screen.getByText('Casey'));
  expect(router.push).toHaveBeenCalledWith('/PlayerStats');
  expect(usePlayerStatsStore.getState()).toMatchObject({
    playerId: 'player-casey',
    team: 'team1',
    pointLines: useGameStore.getState().pointLines,
    events: useGameStore.getState().events,
  });
});

describe('basic timeline editing', () => {
  beforeEach(() => {
    resetAllStores();
    resetMockRouter();
  });

  it.each(['current', 'saved'] as const)(
    'opens the correct event and duration editors from the %s timeline',
    async (source) => {
      arrangeBasicGame({ statTrackingEnabled: true });
      const events = [
        {
          type: 'turnover',
          team: 'team1',
          subtype: 'fiftyfifty',
          playerId: 'player-alex',
          player2Id: 'player-blair',
          pointNumber: 1,
          elapsedMs: 10000,
        },
        {
          type: 'timeout',
          team: 'team2',
          index: 0,
          isFloater: true,
          pointNumber: 1,
          elapsedMs: 20000,
        },
        {
          type: 'turnover',
          team: 'team2',
          subtype: 'throwaway',
          playerId: null,
          pointNumber: 1,
          elapsedMs: 30000,
        },
        {
          type: 'turnover',
          team: 'team2',
          subtype: 'block',
          playerId: null,
          pointNumber: 1,
          elapsedMs: 40000,
        },
        {
          type: 'turnover',
          team: 'team1',
          subtype: 'block',
          playerId: 'player-blair',
          pointNumber: 1,
          elapsedMs: 50000,
        },
        {
          type: 'goal',
          team: 'team1',
          goalPlayerId: 'player-alex',
          assistPlayerId: 'player-blair',
          pointNumber: 1,
          elapsedMs: 60000,
        },
      ] satisfies ReturnType<typeof useGameStore.getState>['events'];
      useGameStore.setState({ events, currentPoint: 2, pointTimerEnabled: true });
      let gameId = 'current';
      if (source === 'saved') {
        const game = { ...createSavedBasicGame(), events };
        useGameStore.setState({ savedGames: [game] });
        gameId = game.id;
        setMockSearchParams({ gameId });
      }
      const user = userEvent.setup();
      await renderScreen(<GameTimelineScreen />);
      expect(screen.getByText('Thr:')).toBeVisible();
      expect(screen.getByText('Drop:')).toBeVisible();
      expect(screen.getByText('OPP TURN')).toBeVisible();
      expect(screen.getByText('OPP BLOCK')).toBeVisible();
      await user.press(screen.getByText('50/50'));
      expect(router.push).toHaveBeenLastCalledWith({
        pathname: '/EditDurationModal',
        params: {
          eventIndex: '0',
          gameId,
          currentDurationMs: '10000',
          editorType: 'event',
          title: 'Edit Event Time',
        },
      });
      await user.press(screen.getByText('FLOATER'));
      expect(router.push).toHaveBeenLastCalledWith({
        pathname: '/EditDurationModal',
        params: {
          eventIndex: '1',
          gameId,
          currentDurationMs: '20000',
          editorType: 'event',
          title: 'Edit Timeout Time',
        },
      });
      await user.press(screen.getByText('GOAL'));
      expect(router.push).toHaveBeenLastCalledWith({
        pathname: '/EditDurationModal',
        params: {
          eventIndex: '5',
          gameId,
          currentDurationMs: '60000',
          editorType: 'point',
          title: 'Edit Point Duration',
        },
      });
      await user.longPress(screen.getByText('GOAL'));
      expect(router.push).toHaveBeenLastCalledWith({
        pathname: '/EditEventModal',
        params: {
          eventIndex: '5',
          eventType: 'goal',
          playerId: 'player-alex',
          editField: 'scorer',
          gameId,
        },
      });
      await user.longPress(screen.getByText('ASSIST'));
      expect(router.push).toHaveBeenLastCalledWith({
        pathname: '/EditEventModal',
        params: {
          eventIndex: '5',
          eventType: 'goal',
          playerId: 'player-blair',
          editField: 'assist',
          gameId,
        },
      });
      await user.longPress(screen.getByText('50/50'));
      expect(router.push).toHaveBeenLastCalledWith({
        pathname: '/EditEventModal',
        params: {
          eventIndex: '0',
          eventType: 'turnover',
          playerId: 'player-alex',
          player2Id: 'player-blair',
          subtype: 'fiftyfifty',
          originalTeam: 'team1',
          gameId,
        },
      });
      expect(screen.getAllByText('+10s').length).toBeGreaterThan(0);
      await user.press(screen.getByText('Show Splits: On'));
      expect(screen.queryByText('+10s')).not.toBeOnTheScreen();
    },
  );

  it('prevents timing and attribution edits on a live point still in progress', async () => {
    arrangeBasicGame({ statTrackingEnabled: true });
    useGameStore.setState({
      pointTimerEnabled: true,
      currentPoint: 1,
      events: [
        {
          type: 'turnover',
          team: 'team1',
          subtype: 'drop',
          playerId: null,
          pointNumber: 1,
          elapsedMs: 10000,
        },
      ],
    });
    await renderScreen(<GameTimelineScreen />);
    const user = userEvent.setup();
    await user.press(screen.getByText('DROP'));
    await user.longPress(screen.getByText('DROP'));
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('basic player presence', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('shows the player’s actual point outcomes and bench time in the game breakdown', async () => {
    const events: GameEvent[] = (['team1', 'team1', 'team2', 'team2', 'team1'] as const).map(
      (team, index) => ({
        type: 'goal',
        team,
        pointNumber: index + 1,
        goalPlayerId: team === 'team1' ? 'player-blair' : null,
        assistPlayerId: index === 0 ? 'player-alex' : null,
      }),
    );
    const pointLines: PointLineRecord[] = Array.from({ length: 5 }, (_, index) => ({
      pointNumber: index + 1,
      timestamp: index,
      playerIds: index === 4 ? ['player-blair'] : ['player-alex', 'player-blair'],
    }));
    usePlayerStatsStore
      .getState()
      .openPlayerStats(
        'player-alex',
        events,
        'team1',
        testTeam.roster,
        undefined,
        pointLines,
        'team1',
        15,
        false,
      );
    await renderScreen(<PlayerStatsScreen />);
    expect(screen.getByText('GAME BREAKDOWN')).toBeVisible();
    for (const label of ['Hold', 'Break', 'Opp Hold', 'Broken', 'Off']) {
      expect(screen.getByText(label)).toBeVisible();
    }
  });

  it('omits unused point outcomes from the player’s breakdown legend', async () => {
    usePlayerStatsStore.getState().openPlayerStats(
      'player-alex',
      [
        {
          type: 'goal',
          team: 'team1',
          goalPlayerId: 'player-alex',
          assistPlayerId: null,
          pointNumber: 1,
        },
      ],
      'team1',
      testTeam.roster,
      undefined,
      [{ pointNumber: 1, timestamp: 1, playerIds: ['player-alex'] }],
      'team1',
      15,
      false,
    );
    await renderScreen(<PlayerStatsScreen />);
    expect(screen.getByText('Hold')).toBeVisible();
    for (const label of ['Break', 'Opp Hold', 'Broken', 'Off']) {
      expect(screen.queryByText(label)).not.toBeOnTheScreen();
    }
  });

  it('keeps the completed-point breakdown hidden while the first point is still in progress', async () => {
    usePlayerStatsStore.getState().openPlayerStats(
      'player-alex',
      [
        {
          type: 'turnover',
          team: 'team1',
          subtype: 'throwaway',
          playerId: 'player-alex',
          pointNumber: 1,
        },
      ],
      'team1',
      testTeam.roster,
      undefined,
      [{ pointNumber: 1, timestamp: 1, playerIds: ['player-alex'] }],
      'team1',
      15,
      false,
    );
    await renderScreen(<PlayerStatsScreen />);
    expect(screen.getByText('PLAYER STATS')).toBeVisible();
    expect(screen.queryByText('GAME BREAKDOWN')).not.toBeOnTheScreen();
  });
});
