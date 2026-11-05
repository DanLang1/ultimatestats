import { screen, within } from '@testing-library/react-native';

import AdvancedStatsContent from '@/components/advancedTracking/AdvancedStatsContent';
import { aggregateAnalyticsGames } from '@/lib/advancedTracking/aggregateAnalyticsGames';
import { getAnalyticsSidePerspective } from '@/lib/advancedTracking/analyticsPerspectiveUtils';
import type { AnalyticsGame } from '@/lib/advancedTracking/analyticsTypes';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import type { GameListItem } from '@/lib/gameListUtils';
import {
  ADVANCED_TEST_FOCUS_SIDE_ID,
  ADVANCED_TEST_OPPONENT_SIDE_ID,
  createAdvancedGameScenario,
  participantRef,
  UNTRACKED_PLAYER,
} from '@/test/fixtures/advancedGameBuilder';
import { renderScreen } from '@/test/render';

function redZoneGame(result: 'goal' | 'throwaway' | 'in_progress' | 'terminated', marked = true) {
  const scenario = createAdvancedGameScenario({
    id: result,
    status: result === 'terminated' ? 'terminated' : 'in_progress',
  }).startPoint({
    puller: UNTRACKED_PLAYER,
    receiver: participantRef('alex'),
    startedAt: 1_000,
    recordedAt: 1_000,
  });
  if (result === 'goal') scenario.goal(participantRef('blair'), { recordedAt: 15_000 });
  if (result === 'throwaway') scenario.turnover('throwaway', { recordedAt: 9_000 });
  const game = scenario.build();
  if (marked) game.points[0].possessions[0].redZone = { enteredAt: 3_000 };
  return buildAnalyticsGame(game);
}

function opponentRedZoneGame(result: 'goal' | 'throwaway') {
  const scenario = createAdvancedGameScenario({
    id: `opponent-${result}`,
    initialReceivingSideId: ADVANCED_TEST_OPPONENT_SIDE_ID,
  }).startPoint({
    puller: participantRef('alex'),
    receiver: UNTRACKED_PLAYER,
    startedAt: 1_000,
    recordedAt: 1_000,
  });
  if (result === 'goal') scenario.goal(UNTRACKED_PLAYER, { recordedAt: 15_000 });
  else scenario.turnover('throwaway', { recordedAt: 9_000 });
  const game = scenario.build();
  game.points[0].possessions[0].redZone = { enteredAt: 3_000 };
  return buildAnalyticsGame(game);
}

function toListItem(game: AnalyticsGame, index: number): GameListItem {
  const perspective = getAnalyticsSidePerspective(game);
  return {
    kind: 'advanced',
    gameType: game.gameType,
    id: `game-${index}`,
    teamId: game.focusSideId,
    timestamp: index,
    myTeamName: perspective.sideName,
    opponentName: perspective.opposingSideName,
    myScore: perspective.score,
    opponentScore: perspective.opposingScore,
  };
}

function renderStats(
  game: AnalyticsGame,
  sideId = ADVANCED_TEST_FOCUS_SIDE_ID,
  combinedGames?: AnalyticsGame[],
) {
  return renderScreen(
    <AdvancedStatsContent
      game={game}
      gameId="red-zone-display"
      myTeamName="Focus"
      opponentName="Opponent"
      myScore={0}
      opponentScore={0}
      perspectiveSideId={sideId}
      participantNames={game.participantNames}
      routeScope="saved"
      aggregateInfo={combinedGames && { games: combinedGames.map(toListItem) }}
    />,
  );
}

function expectRedZoneStat(label: string, value: string, ratio?: string) {
  const section = within(screen.getByTestId('advanced-red-zone-card'));
  const card = section.getByText(label).parent;
  if (card == null) throw new Error(`Missing stat card: ${label}`);
  expect(within(card).getByText(value)).toBeTruthy();
  if (ratio != null) expect(within(card).getByText(ratio)).toBeTruthy();
}

describe('Red Zone team stats display', () => {
  it('hides the section when the selected side has no entries', async () => {
    await renderStats(redZoneGame('goal', false));
    expect(screen.queryByTestId('advanced-red-zone-summary-card')).toBeNull();
    expect(screen.queryByTestId('advanced-red-zone-card')).toBeNull();
    expect(screen.queryByLabelText('About red zone stats')).toBeNull();
  });

  it('does not show the other side’s entries', async () => {
    await renderStats(redZoneGame('goal'), ADVANCED_TEST_OPPONENT_SIDE_ID);
    expect(screen.queryByTestId('advanced-red-zone-card')).toBeNull();
    expect(screen.getByTestId('advanced-red-zone-summary-card')).toBeTruthy();
    expect(screen.getByTestId('advanced-red-zone-defense-card')).toBeTruthy();
  });

  it('shows defensive results from opponent marked possessions', async () => {
    const games = [opponentRedZoneGame('goal'), opponentRedZoneGame('throwaway')];
    const aggregate = aggregateAnalyticsGames(games);
    if (aggregate == null) throw new Error('Expected defensive aggregate fixture');
    await renderStats(aggregate, ADVANCED_TEST_FOCUS_SIDE_ID, games);
    const section = within(screen.getByTestId('advanced-red-zone-defense-card'));
    expect(within(section.getByText('Stop Rate').parent!).getByText('50%')).toBeTruthy();
    expect(within(section.getByText('Stop Rate').parent!).getByText('1/2')).toBeTruthy();
    expect(section.getByText('Red Zone Stop')).toBeTruthy();
    expect(section.getByText('Avg Time to Opp Goal')).toBeTruthy();
    expect(section.getByText('12s')).toBeTruthy();
    expect(section.getByText('Avg Time to Opp Turn')).toBeTruthy();
    expect(section.getByText('6s')).toBeTruthy();
  });

  it('groups offensive and defensive results in one red zone card', async () => {
    const games = [redZoneGame('goal'), opponentRedZoneGame('throwaway')];
    const aggregate = aggregateAnalyticsGames(games);
    if (aggregate == null) throw new Error('Expected combined red zone fixture');
    await renderStats(aggregate, ADVANCED_TEST_FOCUS_SIDE_ID, games);

    const summaryCard = within(screen.getByTestId('advanced-red-zone-summary-card'));
    expect(summaryCard.getByTestId('advanced-red-zone-card')).toBeTruthy();
    expect(summaryCard.getByTestId('advanced-red-zone-defense-card')).toBeTruthy();
  });

  it('shows conversion, opportunities, turnovers, outcome timing, and help', async () => {
    await renderStats(redZoneGame('goal'));
    expect(screen.getByText('RED ZONE')).toBeTruthy();
    expect(screen.getByText('OFFENSE')).toBeTruthy();
    expectRedZoneStat('Conversion', '100%', '1/1');
    expect(screen.queryByText('Opportunities')).toBeNull();
    expectRedZoneStat('Red Zone Turns', '0');
    expectRedZoneStat('Avg Time to Score', '12s');
    expectRedZoneStat('Avg Time to Turn', '—');
  });

  it.each(['in_progress', 'terminated'] as const)(
    'shows dashes for %s opportunities',
    async (result) => {
      await renderStats(redZoneGame(result));
      expectRedZoneStat('Conversion', '—', '0/0');
      expect(screen.queryByText('Opportunities')).toBeNull();
      expectRedZoneStat('Red Zone Turns', '0');
      expectRedZoneStat('Avg Time to Score', '—');
      expectRedZoneStat('Avg Time to Turn', '—');
    },
  );

  it('pools resolved outcomes and timing while counting active aggregate entries', async () => {
    const games = [redZoneGame('goal'), redZoneGame('throwaway'), redZoneGame('in_progress')];
    const aggregate = aggregateAnalyticsGames(games);
    if (aggregate == null) throw new Error('Expected aggregate fixture');
    await renderStats(aggregate, ADVANCED_TEST_FOCUS_SIDE_ID, games);
    expectRedZoneStat('Conversion', '50%', '1/2');
    expect(screen.queryByText('Opportunities')).toBeNull();
    expectRedZoneStat('Red Zone Turn', '1');
    expectRedZoneStat('Avg Time to Score', '12s');
    expectRedZoneStat('Avg Time to Turn', '6s');
  });
});
