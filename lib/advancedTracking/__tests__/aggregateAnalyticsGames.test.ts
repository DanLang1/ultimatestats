import { aggregateAnalyticsGames } from '../aggregateAnalyticsGames';
import { buildAnalyticsGame } from '../buildAnalyticsGame';
import { computeAdvancedPlayerStats } from '../advancedPlayerStatsUtils';
import { computeAdvancedTeamStats } from '../advancedTeamStatsUtils';
import type { AdvancedTrackedGame } from '../types';

const ZOO = 'zoo';
const RIVALS = 'rivals';

const august = { refType: 'participant' as const, participantId: 'p_august' };
const meves = { refType: 'participant' as const, participantId: 'p_meves' };
const untracked = { refType: 'untracked' as const };

const baseGame: Omit<AdvancedTrackedGame, 'id' | 'points'> = {
  schemaVersion: 1,
  createdAt: 1000,
  updatedAt: 1000,
  gameType: 'game',
  status: 'final',
  focusSideId: ZOO,
  initialReceivingSideId: ZOO,
  settings: { locationMode: 'none' },
  sides: [
    { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
    { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
  ],
  participants: [
    { id: 'p_august', name: 'August' },
    { id: 'p_meves', name: 'Meves' },
  ],
};

function makeHoldGame(id: string): AdvancedTrackedGame {
  return {
    ...baseGame,
    id,
    points: [
      {
        id: 'pt1',
        lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
        possessions: [
          {
            id: 'pos1',
            sideId: ZOO,
            actions: [
              {
                id: 'a1',
                kind: 'pull' as const,
                sideId: RIVALS,
                receivingSideId: ZOO,
                puller: untracked,
                receiver: august,
                result: 'inbound' as const,
              },
              {
                id: 'a2',
                kind: 'throw' as const,
                sideId: ZOO,
                thrower: august,
                toPlayer: meves,
                result: 'goal' as const,
              },
            ],
          },
        ],
      },
    ],
  };
}

function makeBreakGame(id: string): AdvancedTrackedGame {
  return {
    ...baseGame,
    id,
    initialReceivingSideId: RIVALS,
    points: [
      {
        id: 'pt1',
        lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
        possessions: [
          {
            id: 'pos1',
            sideId: RIVALS,
            actions: [
              {
                id: 'a1',
                kind: 'pull' as const,
                sideId: ZOO,
                receivingSideId: RIVALS,
                puller: august,
                receiver: untracked,
                result: 'inbound' as const,
              },
              {
                id: 'a2',
                kind: 'throw' as const,
                sideId: RIVALS,
                thrower: untracked,
                defender: meves,
                result: 'block' as const,
              },
            ],
          },
          {
            id: 'pos2',
            sideId: ZOO,
            actions: [
              {
                id: 'a3',
                kind: 'disc_pickup' as const,
                sideId: ZOO,
                player: meves,
              },
              {
                id: 'a4',
                kind: 'throw' as const,
                sideId: ZOO,
                thrower: meves,
                toPlayer: august,
                result: 'goal' as const,
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('aggregateAnalyticsGames', () => {
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
