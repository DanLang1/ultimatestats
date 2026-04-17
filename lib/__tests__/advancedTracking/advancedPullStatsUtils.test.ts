import { computePullStats } from '../../advancedTracking/advancedPullStatsUtils';
import { buildAnalyticsGame } from '../../advancedTracking/buildAnalyticsGame';
import type { AdvancedTrackedGame } from '../../advancedTracking/types';

// ── Shared fixtures ──────────────────────────────────────────────────────────

const ZOO = 'Zoo';
const RIVALS = 'rivals';

const august = { refType: 'participant' as const, participantId: 'p_august' };
const meves = { refType: 'participant' as const, participantId: 'p_meves' };
const untracked = { refType: 'untracked' as const };

const baseGame: Omit<AdvancedTrackedGame, 'points'> = {
  id: 'g1',
  schemaVersion: 1,
  createdAt: 0,
  updatedAt: 0,
  gameType: 'game',
  status: 'in_progress',
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('advancedPullStatsUtils', () => {
  describe('outcome grouping', () => {
    it('groups pull outcomes correctly', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: RIVALS,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pos1',
                sideId: RIVALS,
                actions: [
                  {
                    id: 'a1',
                    kind: 'pull',
                    sideId: ZOO,
                    receivingSideId: RIVALS,
                    puller: august,
                    receiver: untracked,
                    result: 'inbound',
                    hangTimeMs: 3000,
                  },
                  {
                    id: 'a2',
                    kind: 'throw',
                    sideId: RIVALS,
                    thrower: untracked,
                    toPlayer: untracked,
                    result: 'goal',
                  },
                ],
              },
            ],
          },
          {
            id: 'pt2',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pos2',
                sideId: ZOO,
                actions: [
                  {
                    id: 'b1',
                    kind: 'pull',
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    result: 'ob',
                  },
                  { id: 'b2', kind: 'disc_pickup', sideId: ZOO, player: august },
                  {
                    id: 'b3',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: august,
                    toPlayer: meves,
                    result: 'goal',
                  },
                ],
              },
            ],
          },
        ],
      };

      const analytics = buildAnalyticsGame(game);
      const stats = computePullStats(analytics);

      expect(stats.totalPulls).toBe(2);
      expect(stats.outcomes).toEqual({ inbound: 1, ob: 1 });
    });
  });

  describe('hang time', () => {
    it('averages hang time across pulls that have it', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: RIVALS,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pos1',
                sideId: RIVALS,
                actions: [
                  {
                    id: 'a1',
                    kind: 'pull',
                    sideId: ZOO,
                    receivingSideId: RIVALS,
                    puller: august,
                    receiver: untracked,
                    result: 'inbound',
                    hangTimeMs: 3000,
                  },
                  {
                    id: 'a2',
                    kind: 'throw',
                    sideId: RIVALS,
                    thrower: untracked,
                    toPlayer: untracked,
                    result: 'goal',
                  },
                ],
              },
            ],
          },
          {
            id: 'pt2',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pos2',
                sideId: RIVALS,
                actions: [
                  {
                    id: 'b1',
                    kind: 'pull',
                    sideId: ZOO,
                    receivingSideId: RIVALS,
                    puller: august,
                    receiver: untracked,
                    result: 'inbound',
                    hangTimeMs: 5000,
                  },
                  { id: 'b2', kind: 'disc_pickup', sideId: RIVALS, player: untracked },
                  {
                    id: 'b3',
                    kind: 'throw',
                    sideId: RIVALS,
                    thrower: untracked,
                    toPlayer: untracked,
                    result: 'goal',
                  },
                ],
              },
            ],
          },
        ],
      };

      const analytics = buildAnalyticsGame(game);
      const stats = computePullStats(analytics);

      expect(stats.avgHangTimeMs).toBeCloseTo(4000); // (3000 + 5000) / 2
    });

    it('returns null when no pulls have hang time', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: RIVALS,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pos1',
                sideId: RIVALS,
                actions: [
                  {
                    id: 'a1',
                    kind: 'pull',
                    sideId: ZOO,
                    receivingSideId: RIVALS,
                    puller: august,
                    receiver: untracked,
                    result: 'inbound',
                    // no hangTimeMs
                  },
                  {
                    id: 'a2',
                    kind: 'throw',
                    sideId: RIVALS,
                    thrower: untracked,
                    toPlayer: untracked,
                    result: 'goal',
                  },
                ],
              },
            ],
          },
        ],
      };

      const analytics = buildAnalyticsGame(game);
      const stats = computePullStats(analytics);

      expect(stats.avgHangTimeMs).toBeNull();
    });
  });

  describe('side filter', () => {
    it('only counts pulls by the specified side', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: RIVALS,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pos1',
                sideId: RIVALS,
                actions: [
                  {
                    id: 'a1',
                    kind: 'pull',
                    sideId: ZOO,
                    receivingSideId: RIVALS,
                    puller: august,
                    receiver: untracked,
                    result: 'inbound',
                    hangTimeMs: 3000,
                  },
                  {
                    id: 'a2',
                    kind: 'throw',
                    sideId: RIVALS,
                    thrower: untracked,
                    toPlayer: untracked,
                    result: 'goal',
                  },
                ],
              },
            ],
          },
          {
            id: 'pt2',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pos2',
                sideId: ZOO,
                actions: [
                  {
                    id: 'b1',
                    kind: 'pull',
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    receiver: august,
                    result: 'inbound',
                    hangTimeMs: 2000,
                  },
                  {
                    id: 'b2',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: august,
                    toPlayer: meves,
                    result: 'goal',
                  },
                ],
              },
            ],
          },
        ],
      };

      const analytics = buildAnalyticsGame(game);

      const zooStats = computePullStats(analytics, ZOO);
      expect(zooStats.totalPulls).toBe(1);
      expect(zooStats.avgHangTimeMs).toBeCloseTo(3000);

      const rivalsStats = computePullStats(analytics, RIVALS);
      expect(rivalsStats.totalPulls).toBe(1);
      expect(rivalsStats.avgHangTimeMs).toBeCloseTo(2000);
    });
  });
});
