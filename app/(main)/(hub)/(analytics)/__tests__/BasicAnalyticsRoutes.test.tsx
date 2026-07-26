import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import AggregateStatsScreen from '@/app/(main)/(hub)/(analytics)/AggregateStats';
import CreateTournamentScreen from '@/app/(main)/(hub)/(analytics)/CreateTournament';
import GameTimelineScreen from '@/app/(main)/(hub)/(analytics)/GameTimeline';
import PlayerStatsScreen from '@/app/(main)/(hub)/(analytics)/PlayerStats';
import SavedGameScreen from '@/app/(main)/(hub)/(analytics)/saved-games/[gameId]';
import SavedGameStatsScreen from '@/app/(main)/(hub)/(analytics)/SavedGameStats';
import ViewStatsScreen from '@/app/(main)/(hub)/(analytics)/ViewStats';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
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
  });

  it('renders the empty aggregate route and its game-type controls', async () => {
    await renderScreen(<AggregateStatsScreen />);

    expect(screen.getByText('AGGREGATE STATS')).toBeVisible();
    expect(screen.getByText('Basic')).toBeVisible();
    expect(screen.getByText('Advanced')).toBeVisible();
    expect(screen.getByText('No saved games yet')).toBeVisible();
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

    await renderScreen(<GameTimelineScreen />);

    expect(screen.getByText('GAME TIMELINE')).toBeVisible();
    expect(screen.getByText('Windchill vs Rivals')).toBeVisible();
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
    expect(screen.getByText('+1 Net Impact')).toBeVisible();
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
