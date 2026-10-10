import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import AggregateStatsScreen from '@/app/(main)/(hub)/(analytics)/AggregateStats';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useGameStore } from '@/store/basic/gameStore';
import { useTournamentStore } from '@/store/tournamentStore';
import { createFinalAdvancedGame, createSavedBasicGame, testTeam } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetAdvancedTrackingStorage } from '@/test/mocks/advancedTrackingStorage';
import { resetMockRouter } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

async function arrangeGames(kind: 'basic' | 'advanced') {
  if (kind === 'basic') {
    const game = createSavedBasicGame();
    useGameStore.setState({
      savedTeams: [testTeam],
      savedGames: [
        { ...game, id: 'first', team2Name: 'Falcons', createdAt: 1000 },
        { ...game, id: 'second', team2Name: 'Eagles', createdAt: 2000 },
        { ...game, id: 'other', team1: { ...testTeam, id: 'other-team', name: 'Other Team' } },
      ],
    });
  } else {
    for (const [id, opponentName, isOther] of [
      ['first', 'Falcons', false],
      ['second', 'Eagles', false],
      ['other', 'Other Rival', true],
    ] as const) {
      const game = createFinalAdvancedGame({
        id,
        opponentName,
        focusLabel: isOther ? 'Other Team' : testTeam.name,
        sourceTeamId: isOther ? undefined : testTeam.id,
      });
      await useSavedAdvancedGamesStore.getState().saveGame(game);
    }
  }
  const tournamentId = await useTournamentStore
    .getState()
    .addTournament('Windy City', '2026-01-01', '2026-01-02');
  const emptyTournamentId = await useTournamentStore
    .getState()
    .addTournament('Empty Invite', '2026-02-01', '2026-02-01');
  await useTournamentStore.getState().addGamesToTournament(tournamentId, kind, ['first']);
  return { tournamentId, emptyTournamentId };
}

describe.each(['basic', 'advanced'] as const)('%s aggregate selection', (kind) => {
  beforeEach(async () => {
    resetAllStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  it('groups teams, toggles game selection, filters tournaments and returns from combined stats', async () => {
    await arrangeGames(kind);
    const user = userEvent.setup();
    await renderScreen(<AggregateStatsScreen />);
    if (kind === 'advanced') await user.press(screen.getByText('Advanced'));
    expect(screen.getByText('Other Team')).toBeVisible();
    await user.press(screen.getByText('Windchill'));
    expect(screen.getByText('WINDCHILL')).toBeVisible();
    expect(screen.getByText('vs Falcons')).toBeVisible();
    expect(screen.getByText('vs Eagles')).toBeVisible();

    await user.press(screen.getByText('Select All'));
    expect(screen.getByText('View Combined (2 games)')).toBeVisible();
    await user.press(screen.getByText('Deselect All'));
    expect(screen.queryByText('View Combined (2 games)')).not.toBeOnTheScreen();
    await user.press(screen.getByText('vs Eagles'));
    expect(screen.getByText('View Combined (1 game)')).toBeVisible();
    await user.press(screen.getByText('vs Eagles'));
    expect(screen.queryByText('View Combined (1 game)')).not.toBeOnTheScreen();

    await user.press(screen.getByText('Windy City'));
    expect(screen.getByText('View Combined (1 game)')).toBeVisible();
    expect(screen.queryByText('vs Eagles')).not.toBeOnTheScreen();
    await user.press(screen.getByText('Show All'));
    expect(screen.getByText('vs Eagles')).toBeVisible();
    expect(screen.queryByText('View Combined (1 game)')).not.toBeOnTheScreen();
    await user.press(screen.getByText('Empty Invite'));
    expect(
      screen.getByText(
        kind === 'advanced'
          ? 'No advanced games in this tournament'
          : 'No games in this tournament',
      ),
    ).toBeVisible();
    await user.press(screen.getByText('Empty Invite'));
    expect(screen.getByText('vs Falcons')).toBeVisible();

    await user.press(screen.getByText('Select All'));
    await user.press(screen.getByText('View Combined (2 games)'));
    expect(screen.getByText('COMBINED STATS')).toBeVisible();
    expect(screen.getByText('Windchill')).toBeVisible();
    await user.press(screen.getByTestId('screen-header-back'));
    expect(screen.getByText('WINDCHILL')).toBeVisible();
    await user.press(screen.getByTestId('screen-header-back'));
    expect(screen.getByText('AGGREGATE STATS')).toBeVisible();
    expect(router.back).not.toHaveBeenCalled();
    await user.press(screen.getByTestId('screen-header-back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('assigns selected games to a tournament and clears the selection after persistence', async () => {
    const { emptyTournamentId } = await arrangeGames(kind);
    const user = userEvent.setup();
    await renderScreen(<AggregateStatsScreen />);
    if (kind === 'advanced') await user.press(screen.getByText('Advanced'));
    await user.press(screen.getByText('Windchill'));
    await user.press(screen.getByText('vs Eagles'));
    await user.press(screen.getByText('Add to Tournament'));
    expect(screen.getByText('Select Tournament')).toBeVisible();
    await user.press(screen.getAllByText('Empty Invite').at(-1)!);
    expect(useTournamentStore.getState().getTournamentIdForGame(kind, 'second')).toBe(
      emptyTournamentId,
    );
    expect(screen.queryByText('View Combined (1 game)')).not.toBeOnTheScreen();
    await user.press(screen.getByText('Create'));
    expect(router.push).toHaveBeenCalledWith('/CreateTournament');
  });
});

describe('advanced aggregate recovery', () => {
  beforeEach(async () => {
    resetAllStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  it('shows the advanced empty state when switching from an empty basic library', async () => {
    const user = userEvent.setup();
    await renderScreen(<AggregateStatsScreen />);
    expect(screen.getByText('AGGREGATE STATS')).toBeVisible();
    expect(screen.getByText('Basic')).toBeVisible();
    expect(screen.getByText('No saved games yet')).toBeVisible();
    await user.press(screen.getByText('Advanced'));
    expect(screen.getByText('No advanced games yet')).toBeVisible();
  });

  it('refuses to show combined math when a catalog game has no full record', async () => {
    await arrangeGames('advanced');
    resetAdvancedTrackingStorage();
    useSavedAdvancedGamesStore.setState({ gamesById: {} });
    const user = userEvent.setup();
    await renderScreen(<AggregateStatsScreen />);
    await user.press(screen.getByText('Advanced'));
    await user.press(screen.getByText('Windchill'));
    await user.press(screen.getByText('vs Falcons'));
    await user.press(screen.getByText('View Combined (1 game)'));
    expect(await screen.findByText('Combined stats unavailable')).toBeVisible();
    expect(screen.getByText('Some selected advanced games could not be loaded.')).toBeVisible();
    await user.press(screen.getByText('Back to Games'));
    expect(screen.getByText('vs Falcons')).toBeVisible();
  });
});
