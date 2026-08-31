import {
  defineAdvancedGameTestContext,
  type AdvancedGameScenarioBuilder,
} from '@/test/fixtures/advancedGameBuilder';

import { computePullStats, getInboundPullCount } from '../advancedPullStatsUtils';
import type { PlayerRef, PullResult } from '../types';

const ZOO = 'Zoo';
const RIVALS = 'rivals';

const pullFixtures = defineAdvancedGameTestContext({
  id: 'pull-stats-game',
  createdAt: 0,
  updatedAt: 0,
  focusSideId: ZOO,
  initialReceivingSideId: RIVALS,
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

const { august, meves } = pullFixtures.players;

interface AddPullPointOptions {
  puller: PlayerRef;
  receiver: PlayerRef;
  scorer?: PlayerRef;
  result?: PullResult;
  hangTimeMs?: number;
  finish?: boolean;
}

function addPullPoint(
  scenario: AdvancedGameScenarioBuilder,
  { puller, receiver, scorer, result = 'inbound', hangTimeMs, finish = true }: AddPullPointOptions,
) {
  scenario.startPoint({
    puller,
    receiver: result === 'inbound' ? receiver : undefined,
    pullResult: result,
    hangTimeMs,
  });
  if (result !== 'inbound') scenario.pickup(receiver);
  if (finish) scenario.goal(scorer);
  return scenario;
}

describe('advancedPullStatsUtils', () => {
  describe('outcome grouping', () => {
    it('groups pull outcomes correctly', () => {
      const scenario = pullFixtures.scenario();
      addPullPoint(scenario, {
        puller: august,
        receiver: pullFixtures.untracked,
        hangTimeMs: 3000,
      });
      addPullPoint(scenario, {
        puller: pullFixtures.untracked,
        receiver: august,
        scorer: meves,
        result: 'roller',
        hangTimeMs: 9000,
      });
      const analytics = addPullPoint(scenario, {
        puller: august,
        receiver: pullFixtures.untracked,
        result: 'ob',
      }).buildAnalytics();

      const stats = computePullStats(analytics);

      expect(stats.totalPulls).toBe(3);
      expect(stats.outcomes).toEqual({ inbound: 1, roller: 1, ob: 1 });
      expect(getInboundPullCount(stats)).toBe(2);
    });
  });

  describe('hang time', () => {
    it('averages hang time across pulls that have it', () => {
      const scenario = pullFixtures.scenario();
      addPullPoint(scenario, {
        puller: august,
        receiver: pullFixtures.untracked,
        hangTimeMs: 3000,
      });
      const analytics = addPullPoint(scenario, {
        puller: pullFixtures.untracked,
        receiver: august,
        scorer: meves,
        hangTimeMs: 5000,
      }).buildAnalytics();

      expect(computePullStats(analytics).avgHangTimeMs).toBeCloseTo(4000);
    });

    it.each([
      ['out-of-bounds', 'ob' as const],
      ['roller', 'roller' as const],
    ])('excludes %s pulls from average hang time', (_label, excludedResult) => {
      const scenario = pullFixtures.scenario();
      addPullPoint(scenario, {
        puller: august,
        receiver: pullFixtures.untracked,
        hangTimeMs: 3000,
      });
      const analytics = addPullPoint(scenario, {
        puller: pullFixtures.untracked,
        receiver: august,
        scorer: meves,
        result: excludedResult,
        hangTimeMs: 9000,
      }).buildAnalytics();

      const stats = computePullStats(analytics);

      expect(stats.totalPulls).toBe(2);
      expect(stats.outcomes).toEqual({ inbound: 1, [excludedResult]: 1 });
      expect(stats.avgHangTimeMs).toBeCloseTo(3000);
    });

    it('returns null when only out-of-bounds pulls have hang time', () => {
      const analytics = addPullPoint(pullFixtures.scenario(), {
        puller: august,
        receiver: pullFixtures.untracked,
        result: 'ob',
        hangTimeMs: 9000,
        finish: false,
      }).buildAnalytics();

      const stats = computePullStats(analytics);

      expect(stats.totalPulls).toBe(1);
      expect(stats.outcomes).toEqual({ ob: 1 });
      expect(stats.avgHangTimeMs).toBeNull();
    });

    it('returns null when no pulls have hang time', () => {
      const analytics = addPullPoint(pullFixtures.scenario(), {
        puller: august,
        receiver: pullFixtures.untracked,
      }).buildAnalytics();

      expect(computePullStats(analytics).avgHangTimeMs).toBeNull();
    });
  });

  describe('side filter', () => {
    it('only counts pulls by the specified side', () => {
      const scenario = pullFixtures.scenario();
      addPullPoint(scenario, {
        puller: august,
        receiver: pullFixtures.untracked,
        hangTimeMs: 3000,
      });
      const analytics = addPullPoint(scenario, {
        puller: pullFixtures.untracked,
        receiver: august,
        scorer: meves,
        hangTimeMs: 2000,
      }).buildAnalytics();
      const zooStats = computePullStats(analytics, ZOO);
      const rivalsStats = computePullStats(analytics, RIVALS);

      expect(zooStats.totalPulls).toBe(1);
      expect(zooStats.avgHangTimeMs).toBeCloseTo(3000);
      expect(rivalsStats.totalPulls).toBe(1);
      expect(rivalsStats.avgHangTimeMs).toBeCloseTo(2000);
    });
  });
});
