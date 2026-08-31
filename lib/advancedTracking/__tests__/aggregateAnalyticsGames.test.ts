import { defineAdvancedGameTestContext } from '@/test/fixtures/advancedGameBuilder';

import { computeAdvancedPlayerStats } from '../advancedPlayerStatsUtils';
import { computeAdvancedTeamStats } from '../advancedTeamStatsUtils';
import { aggregateAnalyticsGames } from '../aggregateAnalyticsGames';
import { buildAnalyticsGame } from '../buildAnalyticsGame';
import { isAdvancedGameAggregateEligible } from '../summary';

const ZOO = 'zoo';
const RIVALS = 'rivals';

const aggregateFixtures = defineAdvancedGameTestContext({
  id: 'aggregate-base-game',
  createdAt: 1000,
  updatedAt: 1000,
  status: 'final',
  focusSideId: ZOO,
  initialReceivingSideId: ZOO,
  sides: [
    { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
    { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
  ],
  players: {
    august: { id: 'p_august', name: 'August' },
    meves: { id: 'p_meves', name: 'Meves' },
  },
  defaultLines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
});

const { august, meves } = aggregateFixtures.players;

function makeHoldGame(id: string) {
  return aggregateFixtures
    .scenario({ id })
    .hold({
      id: 'pt1',
      possessionId: 'pos1',
      puller: aggregateFixtures.untracked,
      receiver: august,
      scorer: meves,
    })
    .build();
}

function makeBreakGame(id: string) {
  return aggregateFixtures
    .scenario({ id, initialReceivingSideId: RIVALS })
    .breakAfterTurnover({
      id: 'pt1',
      possessionId: 'pos1',
      puller: august,
      receiver: aggregateFixtures.untracked,
      turnoverResult: 'block',
      defender: meves,
      pickupPlayer: meves,
      scorer: august,
    })
    .build();
}

describe('aggregateAnalyticsGames', () => {
  it('rejects scrimmage games', () => {
    const scrimmageAnalytics = buildAnalyticsGame({
      ...makeHoldGame('scrimmage'),
      gameType: 'scrimmage',
    });

    expect(() => aggregateAnalyticsGames([scrimmageAnalytics])).toThrow(
      'does not support scrimmage games',
    );
  });

  it('combines advanced games so existing stat utils can compute aggregate totals', () => {
    const holdAnalytics = buildAnalyticsGame(makeHoldGame('g1'));
    const breakAnalytics = buildAnalyticsGame(makeBreakGame('g2'));
    const aggregate = aggregateAnalyticsGames([holdAnalytics, breakAnalytics]);

    expect(aggregate).not.toBeNull();
    const stats = computeAdvancedTeamStats(aggregate!, ZOO);
    const playerStats = computeAdvancedPlayerStats(aggregate!, ZOO);
    const mevesStats = playerStats.find((player) => player.participantId === 'p_meves');

    expect(stats.holds).toBe(1);
    expect(stats.breaks).toBe(1);
    expect(stats.totalBlocks).toBe(1);
    expect(mevesStats?.goals).toBe(1);
    expect(mevesStats?.assists).toBe(1);
    expect(mevesStats?.blocks).toBe(1);
  });

  it('prefixes ids from each game to avoid collisions', () => {
    const aggregate = aggregateAnalyticsGames([
      buildAnalyticsGame(makeHoldGame('g1')),
      buildAnalyticsGame(makeHoldGame('g2')),
    ]);

    expect(aggregate?.points.map((point) => point.id)).toEqual(['g0_pt1', 'g1_pt1']);
    expect(aggregate?.possessions.map((possession) => possession.id)).toEqual([
      'g0_pos1',
      'g1_pos1',
    ]);
  });

  it('rejects mixed focus sides', () => {
    const zooAnalytics = buildAnalyticsGame(makeHoldGame('g1'));
    const rivalsAnalytics = buildAnalyticsGame({
      ...makeHoldGame('g2'),
      focusSideId: RIVALS,
    });

    expect(() => aggregateAnalyticsGames([zooAnalytics, rivalsAnalytics])).toThrow(
      'same focus side',
    );
  });
});

describe('isAdvancedGameAggregateEligible', () => {
  it('excludes scrimmages while retaining regular advanced games', () => {
    expect(isAdvancedGameAggregateEligible({ gameType: 'scrimmage' })).toBe(false);
    expect(isAdvancedGameAggregateEligible({ gameType: 'game' })).toBe(true);
  });
});
