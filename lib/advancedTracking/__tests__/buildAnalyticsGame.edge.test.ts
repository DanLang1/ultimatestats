import { createAdvancedGameFixture } from '@/test/fixtures/advancedGameBuilder';

import { buildAnalyticsGame } from '../buildAnalyticsGame';
import type { AdvancedTrackedGame } from '../types';

// ── Shared fixtures ──────────────────────────────────────────────────────────

const ZOO = 'Zoo';
const RIVALS = 'rivals';

const participants = [
  { id: 'p_august', name: 'August' },
  { id: 'p_meves', name: 'Meves' },
  { id: 'p_joah', name: 'Joah' },
  { id: 'p_max', name: 'Max' },
];

const august = { refType: 'participant' as const, participantId: 'p_august' };
const meves = { refType: 'participant' as const, participantId: 'p_meves' };
const joah = { refType: 'participant' as const, participantId: 'p_joah' };
const max = { refType: 'participant' as const, participantId: 'p_max' };
const untracked = { refType: 'untracked' as const };
const unknown = { refType: 'unknown' as const };

const baseGame = createAdvancedGameFixture({
  id: 'g1',
  createdAt: 0,
  updatedAt: 0,
  focusSideId: ZOO,
  initialReceivingSideId: ZOO,
  sides: [
    { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
    { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
  ],
  participants,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('buildAnalyticsGame — edge cases and correctness', () => {
  describe('stoppages after possession-ending actions', () => {
    it('builds stats when a turnover is followed by an injury stoppage', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah'] }],
            startedAt: 1_000,
            elapsedMsAtEnd: 20_533,
            possessions: [
              {
                id: 'pos1',
                sideId: ZOO,
                actions: [
                  {
                    id: 'a1',
                    kind: 'pull',
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    result: 'inbound',
                    recordedAt: 1_000,
                  },
                  {
                    id: 'a2',
                    kind: 'disc_pickup',
                    sideId: ZOO,
                    player: august,
                    recordedAt: 2_000,
                  },
                  {
                    id: 'a3',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: august,
                    toPlayer: meves,
                    result: 'drop',
                    recordedAt: 3_000,
                  },
                  {
                    id: 'a4',
                    kind: 'stoppage',
                    reason: 'injury',
                    sideId: ZOO,
                    recordedAt: 4_000,
                    pausedAt: 4_000,
                    resumedAt: 5_000,
                  },
                ],
              },
              {
                id: 'pos2',
                sideId: RIVALS,
                actions: [
                  {
                    id: 'a5',
                    kind: 'disc_pickup',
                    sideId: RIVALS,
                    player: untracked,
                    recordedAt: 6_000,
                  },
                  {
                    id: 'a6',
                    kind: 'throw',
                    sideId: RIVALS,
                    thrower: untracked,
                    result: 'goal',
                    recordedAt: 7_000,
                  },
                ],
              },
            ],
            subs: [
              {
                id: 'sub1',
                sideId: ZOO,
                type: 'injury',
                inIds: ['p_max'],
                outIds: ['p_joah'],
                stoppageActionId: 'a4',
              },
            ],
          },
        ],
      };

      const analytics = buildAnalyticsGame(game);

      expect(analytics.points[0].state).toBe('broken');
      expect(analytics.points[0].scoringSideId).toBe(RIVALS);
      expect(analytics.possessions[0]).toMatchObject({
        result: 'turned_over',
        turnoverType: 'drop',
      });
      expect(analytics.possessions[1]).toMatchObject({ result: 'scored' });
    });

    it('derives the scorer when a goal is followed by a stoppage', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pos1',
                sideId: ZOO,
                actions: [
                  {
                    id: 'a1',
                    kind: 'pull',
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    result: 'inbound',
                  },
                  {
                    id: 'a2',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: august,
                    toPlayer: meves,
                    result: 'goal',
                  },
                  {
                    id: 'a3',
                    kind: 'stoppage',
                    reason: 'injury',
                    sideId: ZOO,
                    recordedAt: 100,
                    pausedAt: 100,
                    resumedAt: 200,
                  },
                ],
              },
            ],
          },
        ],
      };

      const analytics = buildAnalyticsGame(game);

      expect(analytics.points[0].state).toBe('hold');
      expect(analytics.points[0].scoringSideId).toBe(ZOO);
      expect(analytics.possessions[0].result).toBe('scored');
    });
  });

  describe('callahan break points', () => {
    it('does NOT mark a callahan break as a clean hold', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pos1',
                sideId: ZOO,
                actions: [
                  {
                    id: 'a1',
                    kind: 'pull',
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    receiver: august,
                    result: 'inbound',
                  },
                  {
                    id: 'a2',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: august,
                    result: 'callahan',
                    defender: max,
                  },
                ],
              },
            ],
          },
        ],
      };

      const analytics = buildAnalyticsGame(game);
      expect(analytics.points).toHaveLength(1);
      expect(analytics.points[0].state).toBe('broken');
      expect(analytics.points[0].isCleanHold).toBe(false);
    });

    it('callahan on first possession still derives correct scoringSideId and state', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pos1',
                sideId: ZOO,
                actions: [
                  {
                    id: 'a1',
                    kind: 'pull',
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    result: 'inbound',
                  },
                  {
                    id: 'a2',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: august,
                    result: 'callahan',
                    defender: max,
                  },
                ],
              },
            ],
          },
        ],
      };

      const analytics = buildAnalyticsGame(game);
      expect(analytics.points[0].scoringSideId).toBe(RIVALS);
      expect(analytics.points[0].receivingSideId).toBe(ZOO);
      expect(analytics.points[0].pullingSideId).toBe(RIVALS);
    });
  });

  describe('attribution correctness for untracked/unknown players', () => {
    it('block with no defender recorded does not produce block attribution', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pos1',
                sideId: ZOO,
                actions: [
                  {
                    id: 'a1',
                    kind: 'pull',
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    receiver: august,
                    result: 'inbound',
                  },
                  {
                    id: 'a2',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: august,
                    result: 'block',
                    // no defender
                  },
                  {
                    id: 'a3',
                    kind: 'disc_pickup',
                    sideId: ZOO,
                    player: august,
                  },
                  {
                    id: 'a4',
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
      const blockAttrs = analytics.attributions.filter((a) => a.type === 'block');
      expect(blockAttrs).toHaveLength(0);
      const throwawayAttrs = analytics.attributions.filter((a) => a.type === 'throwaway');
      expect(throwawayAttrs).toHaveLength(1);
      expect(throwawayAttrs[0].participantId).toBe('p_august');
    });

    it('stall with no defender recorded does not produce stall attribution', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pos1',
                sideId: ZOO,
                actions: [
                  {
                    id: 'a1',
                    kind: 'pull',
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    receiver: august,
                    result: 'inbound',
                  },
                  {
                    id: 'a2',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: august,
                    result: 'stall',
                    // no defender
                  },
                ],
              },
              {
                id: 'pos2',
                sideId: RIVALS,
                actions: [
                  {
                    id: 'a3',
                    kind: 'disc_pickup',
                    sideId: RIVALS,
                    player: untracked,
                  },
                  {
                    id: 'a4',
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
      const stallAttrs = analytics.attributions.filter((a) => a.type === 'stall');
      expect(stallAttrs).toHaveLength(0);
      const stalledAttrs = analytics.attributions.filter((a) => a.type === 'stall_conceded');
      expect(stalledAttrs).toHaveLength(1);
      expect(stalledAttrs[0].participantId).toBe('p_august');
    });

    it('callahan with untracked defender produces no goal/block/callahan attribution', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pos1',
                sideId: ZOO,
                actions: [
                  {
                    id: 'a1',
                    kind: 'pull',
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    result: 'inbound',
                  },
                  {
                    id: 'a2',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: august,
                    result: 'callahan',
                    defender: untracked,
                  },
                ],
              },
            ],
          },
        ],
      };

      const analytics = buildAnalyticsGame(game);
      const scoringAttrs = analytics.attributions.filter((a) =>
        ['goal', 'block', 'callahan'].includes(a.type),
      );
      expect(scoringAttrs).toHaveLength(0);
      expect(
        analytics.attributions.filter(
          (a) => a.participantId === 'p_august' && a.type === 'throwaway',
        ),
      ).toHaveLength(1);
    });

    it('completion to unknown player produces receiving_touch for UNKNOWN_PARTICIPANT', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pos1',
                sideId: ZOO,
                actions: [
                  {
                    id: 'a1',
                    kind: 'pull',
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    receiver: august,
                    result: 'inbound',
                  },
                  {
                    id: 'a2',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: august,
                    toPlayer: unknown,
                    result: 'complete',
                  },
                  {
                    id: 'a3',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: { refType: 'unknown' as const },
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
      const receivingTouch = analytics.attributions.filter((a) => a.type === 'receiving_touch');
      expect(receivingTouch).toHaveLength(2);
      expect(receivingTouch.some((a) => a.participantId === 'UNKNOWN_PARTICIPANT')).toBe(true);
    });
  });

  describe('split attribution edge cases', () => {
    it('split drop where receiver is untracked only penalizes thrower', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pos1',
                sideId: ZOO,
                actions: [
                  {
                    id: 'a1',
                    kind: 'pull',
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    receiver: august,
                    result: 'inbound',
                  },
                  {
                    id: 'a2',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: august,
                    toPlayer: untracked,
                    result: 'drop',
                    splitAttribution: true,
                  },
                ],
              },
              {
                id: 'pos2',
                sideId: RIVALS,
                actions: [
                  {
                    id: 'a3',
                    kind: 'disc_pickup',
                    sideId: RIVALS,
                    player: untracked,
                  },
                  {
                    id: 'a4',
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
      const throwawayAttrs = analytics.attributions.filter((a) => a.type === 'throwaway');
      const dropAttrs = analytics.attributions.filter((a) => a.type === 'drop');
      expect(throwawayAttrs).toHaveLength(1);
      expect(throwawayAttrs[0].weight).toBe(0.5);
      expect(throwawayAttrs[0].participantId).toBe('p_august');
      expect(dropAttrs).toHaveLength(0);
    });
  });

  describe('multi-turnover point stats', () => {
    it('correctly tracks 3 possessions with 2 turnovers before a score', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: ZOO,
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
                    kind: 'pull',
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    receiver: august,
                    result: 'inbound',
                  },
                  {
                    id: 'a2',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: august,
                    toPlayer: meves,
                    result: 'throwaway',
                  },
                ],
              },
              {
                id: 'pos2',
                sideId: RIVALS,
                actions: [
                  {
                    id: 'b1',
                    kind: 'disc_pickup',
                    sideId: RIVALS,
                    player: untracked,
                  },
                  {
                    id: 'b2',
                    kind: 'throw',
                    sideId: RIVALS,
                    thrower: untracked,
                    result: 'block',
                    defender: joah,
                  },
                ],
              },
              {
                id: 'pos3',
                sideId: ZOO,
                actions: [
                  {
                    id: 'c1',
                    kind: 'disc_pickup',
                    sideId: ZOO,
                    player: meves,
                  },
                  {
                    id: 'c2',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: meves,
                    toPlayer: august,
                    result: 'goal',
                  },
                ],
              },
            ],
          },
        ],
      };

      const analytics = buildAnalyticsGame(game);
      expect(analytics.possessions).toHaveLength(3);
      expect(analytics.possessions[0].result).toBe('turned_over');
      expect(analytics.possessions[0].turnoverType).toBe('throwaway');
      expect(analytics.possessions[1].result).toBe('turned_over');
      expect(analytics.possessions[1].turnoverType).toBe('block');
      expect(analytics.possessions[2].result).toBe('scored');

      const augustAttribs = analytics.attributions.filter((a) => a.participantId === 'p_august');
      expect(augustAttribs.some((a) => a.type === 'throwaway')).toBe(true);
      expect(augustAttribs.some((a) => a.type === 'goal')).toBe(true);

      const mevesAttribs = analytics.attributions.filter((a) => a.participantId === 'p_meves');
      expect(mevesAttribs.some((a) => a.type === 'assist')).toBe(true);
      expect(mevesAttribs.some((a) => a.type === 'completion')).toBe(true);

      const joahAttribs = analytics.attributions.filter((a) => a.participantId === 'p_joah');
      expect(joahAttribs.some((a) => a.type === 'block')).toBe(true);

      expect(analytics.points[0].state).toBe('hold');
      expect(analytics.points[0].isCleanHold).toBe(false);
    });
  });

  describe('stoppage timing calculations', () => {
    it('ignores unresumed stoppages in pause calculations', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [
          {
            id: 'pt1',
            startedAt: 0,
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pos1',
                sideId: ZOO,
                actions: [
                  {
                    id: 'a1',
                    kind: 'pull',
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    receiver: august,
                    result: 'inbound',
                    recordedAt: 0,
                  },
                  {
                    id: 'a2',
                    kind: 'stoppage',
                    reason: 'injury',
                    recordedAt: 10000,
                    pausedAt: 10000,
                  },
                  {
                    id: 'a3',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: august,
                    toPlayer: meves,
                    result: 'goal',
                    recordedAt: 20000,
                  },
                ],
              },
            ],
          },
        ],
      };

      const analytics = buildAnalyticsGame(game);
      expect(analytics.actions[2].elapsedMs).toBe(20000);
    });
  });

  describe('hockey assist detection', () => {
    it('does NOT give hockey assist when previous throw was not a completion', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah'] }],
            possessions: [
              {
                id: 'pos1',
                sideId: ZOO,
                actions: [
                  {
                    id: 'a1',
                    kind: 'pull',
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    receiver: august,
                    result: 'inbound',
                  },
                  {
                    id: 'a2',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: august,
                    toPlayer: meves,
                    result: 'drop',
                  },
                  {
                    id: 'a3',
                    kind: 'disc_pickup',
                    sideId: ZOO,
                    player: joah,
                  },
                  {
                    id: 'a4',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: joah,
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
      const hockeyAssists = analytics.attributions.filter((a) => a.type === 'hockey_assist');
      expect(hockeyAssists).toHaveLength(0);
    });
  });

  describe('pull outcome attributions', () => {
    it('OB pull with no receiver produces no pull_reception or drop', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pos1',
                sideId: ZOO,
                actions: [
                  {
                    id: 'a1',
                    kind: 'pull',
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    result: 'ob',
                  },
                  {
                    id: 'a2',
                    kind: 'disc_pickup',
                    sideId: ZOO,
                    player: august,
                  },
                  {
                    id: 'a3',
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
      const pullReception = analytics.attributions.filter((a) => a.type === 'pull_reception');
      const drop = analytics.attributions.filter((a) => a.type === 'drop');
      expect(pullReception).toHaveLength(0);
      expect(drop).toHaveLength(0);
    });
  });

  describe('action validation', () => {
    it('allows stoppage sideId to differ from possession sideId', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [
          {
            id: 'pt1',
            startedAt: 0,
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pos1',
                sideId: ZOO,
                actions: [
                  {
                    id: 'a1',
                    kind: 'pull',
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    result: 'inbound',
                    recordedAt: 0,
                  },
                  {
                    id: 'a2',
                    kind: 'stoppage',
                    reason: 'timeout',
                    sideId: RIVALS,
                    recordedAt: 10000,
                    pausedAt: 10000,
                    resumedAt: 20000,
                  },
                  {
                    id: 'a3',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: august,
                    toPlayer: meves,
                    result: 'goal',
                    recordedAt: 30000,
                  },
                ],
              },
            ],
          },
        ],
      };

      expect(() => buildAnalyticsGame(game)).not.toThrow();
      const analytics = buildAnalyticsGame(game);
      expect(analytics.points[0].durationMs).toBe(20000); // 30000 - 0 - 10000 pause
    });
  });

  describe('empty and minimal games', () => {
    it('handles a game with no points', () => {
      const game: AdvancedTrackedGame = { ...baseGame, points: [] };
      const analytics = buildAnalyticsGame(game);
      expect(analytics.points).toHaveLength(0);
      expect(analytics.possessions).toHaveLength(0);
      expect(analytics.actions).toHaveLength(0);
      expect(analytics.attributions).toHaveLength(0);
    });
  });
});
