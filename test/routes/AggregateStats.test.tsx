import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import AggregateStatsScreen from '@/app/(main)/(hub)/(analytics)/aggregate-stats';
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

  it('groups teams, selects games by row and tournament section, and returns from combined stats', async () => {
    await arrangeGames(kind);
    const user = userEvent.setup();
    await renderScreen(<AggregateStatsScreen />);
    if (kind === 'basic') await user.press(screen.getByText('Basic'));
    expect(screen.getByLabelText(/^Other Team, 1 game,/)).toBeVisible();
    await user.press(screen.getByLabelText(/^Windchill, 2 games/));
    expect(screen.getByText('WINDCHILL')).toBeVisible();
    expect(screen.getByLabelText(/versus Falcons/)).toBeVisible();
    expect(screen.getByLabelText(/versus Eagles/)).toBeVisible();
    expect(screen.queryByText(/Empty Invite/)).not.toBeOnTheScreen();

    await user.press(screen.getByText('Select all'));
    expect(screen.getByText('2 selected · 2–0')).toBeVisible();
    await user.press(screen.getByText('Deselect all'));
    expect(screen.queryByText(/^2 selected/)).not.toBeOnTheScreen();
    await user.press(screen.getByLabelText(/versus Eagles/));
    expect(screen.getByText(/^1 selected/)).toBeVisible();
    await user.press(screen.getByLabelText(/versus Eagles/));
    expect(screen.queryByText(/^1 selected/)).not.toBeOnTheScreen();

    await user.press(screen.getByLabelText('Select games in Windy City'));
    expect(screen.getByText(/^1 selected/)).toBeVisible();
    expect(screen.getByLabelText(/versus Falcons/)).toBeSelected();
    expect(screen.getByLabelText(/versus Eagles/)).not.toBeSelected();
    await user.press(screen.getByLabelText('Select games with no tournament'));
    expect(screen.getByText(/^2 selected/)).toBeVisible();
    expect(screen.getByText('Deselect all')).toBeVisible();
    await user.press(screen.getByLabelText('Deselect games in Windy City'));
    expect(screen.getByText(/^1 selected/)).toBeVisible();
    expect(screen.getByLabelText(/versus Eagles/)).toBeSelected();

    await user.press(screen.getByText('Select all'));
    await user.press(screen.getByText('View stats'));
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
    if (kind === 'basic') await user.press(screen.getByText('Basic'));
    await user.press(screen.getByLabelText(/^Windchill, 2 games/));
    await user.press(screen.getByLabelText(/versus Eagles/));
    await user.press(screen.getByText('Add to tournament'));
    expect(screen.getByText('Select Tournament')).toBeVisible();
    await user.press(screen.getByText('Empty Invite'));
    expect(useTournamentStore.getState().getTournamentIdForGame(kind, 'second')).toBe(
      emptyTournamentId,
    );
    expect(screen.queryByText(/^1 selected/)).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Select games in Empty Invite')).toBeVisible();
  });

  it('confirms a tournament delete inside the picker sheet', async () => {
    const { emptyTournamentId } = await arrangeGames(kind);
    const user = userEvent.setup();
    await renderScreen(<AggregateStatsScreen />);
    if (kind === 'basic') await user.press(screen.getByText('Basic'));
    await user.press(screen.getByLabelText(/^Windchill, 2 games/));
    await user.press(screen.getByLabelText(/versus Eagles/));
    await user.press(screen.getByText('Add to tournament'));

    await user.press(screen.getByLabelText('Delete Empty Invite'));
    expect(screen.getByText('Delete Empty Invite?')).toBeVisible();
    await user.press(screen.getByText('Cancel'));
    expect(screen.getByText('Select Tournament')).toBeVisible();

    await user.press(screen.getByLabelText('Delete Empty Invite'));
    await user.press(screen.getByText('Delete tournament'));
    expect(
      useTournamentStore.getState().tournaments.some(({ id }) => id === emptyTournamentId),
    ).toBe(false);
    expect(screen.getByText('Select Tournament')).toBeVisible();
  });

  it('hands the selected games to a tournament created from the picker', async () => {
    await arrangeGames(kind);
    const user = userEvent.setup();
    await renderScreen(<AggregateStatsScreen />);
    if (kind === 'basic') await user.press(screen.getByText('Basic'));
    await user.press(screen.getByLabelText(/^Windchill, 2 games/));
    await user.press(screen.getByText('Select all'));
    await user.press(screen.getByText('Add to tournament'));
    await user.press(screen.getByText('Create New Tournament'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/create-tournament',
      params: { gameKind: kind, gameIds: expect.stringMatching(/^(first,second|second,first)$/) },
    });
  });
});

describe('advanced aggregate recovery', () => {
  beforeEach(async () => {
    resetAllStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  it("opens on advanced and shows each mode's empty state", async () => {
    const user = userEvent.setup();
    await renderScreen(<AggregateStatsScreen />);
    expect(screen.getByText('AGGREGATE STATS')).toBeVisible();
    expect(screen.getByText('No advanced games yet')).toBeVisible();
    await user.press(screen.getByText('Basic'));
    expect(screen.getByText('No saved games yet')).toBeVisible();
  });

  it('refuses to show combined math when a catalog game has no full record', async () => {
    await arrangeGames('advanced');
    resetAdvancedTrackingStorage();
    useSavedAdvancedGamesStore.setState({ gamesById: {} });
    const user = userEvent.setup();
    await renderScreen(<AggregateStatsScreen />);
    await user.press(screen.getByLabelText(/^Windchill, 2 games/));
    await user.press(screen.getByLabelText(/versus Falcons/));
    await user.press(screen.getByText('View stats'));
    expect(await screen.findByText('Combined stats unavailable')).toBeVisible();
    expect(screen.getByText('Some selected advanced games could not be loaded.')).toBeVisible();
    await user.press(screen.getByText('Back to Games'));
    expect(screen.getByLabelText(/versus Falcons/)).toBeVisible();
  });
});
