import { dirtyHoldScenario } from '@/test/fixtures/advancedGameScenarios';

import { computeAdvancedTeamStats } from '../advancedTeamStatsUtils';
import { aggregateAnalyticsGames } from '../aggregateAnalyticsGames';
import { buildAnalyticsGame } from '../buildAnalyticsGame';

function markedGame() {
  const game = dirtyHoldScenario();
  game.points[0].possessions[0].redZone = { enteredAt: 1_000 };
  game.points[0].possessions[2].redZone = { enteredAt: 2_000 };
  return buildAnalyticsGame(game);
}

describe('red zone outcome timing splits', () => {
  it('pools each outcome independently and excludes missing timing without dropping zero', () => {
    // The stat utility consumes compiled, pause-adjusted durations.
    const first = markedGame();
    first.possessions[0].redZoneOutcomeDurationMs = 6_000;
    first.possessions[2].redZoneOutcomeDurationMs = 0;
    const second = markedGame();
    second.possessions[0].redZoneOutcomeDurationMs = null;
    second.possessions[2].redZoneOutcomeDurationMs = 12_000;
    const third = markedGame();
    third.possessions[0].redZoneOutcomeDurationMs = 10_000;
    third.possessions[2].redZoneOutcomeDurationMs = null;
    const aggregate = aggregateAnalyticsGames([first, second, third]);
    if (aggregate == null) throw new Error('Expected aggregate fixture');
    const stats = computeAdvancedTeamStats(aggregate, aggregate.focusSideId);
    expect(stats.averageRedZoneTimeToScoreMs).toBe(6_000);
    expect(stats.averageRedZoneTimeToTurnoverMs).toBe(8_000);
    expect(stats.redZoneConversionPct).toBe(0.5);
  });

  it('returns null when no matching outcome has timing', () => {
    const game = markedGame();
    const stats = computeAdvancedTeamStats(game, game.focusSideId);
    expect(stats.averageRedZoneTimeToScoreMs).toBeNull();
    expect(stats.averageRedZoneTimeToTurnoverMs).toBeNull();
  });
});
