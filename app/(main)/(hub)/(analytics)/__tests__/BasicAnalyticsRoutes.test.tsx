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
