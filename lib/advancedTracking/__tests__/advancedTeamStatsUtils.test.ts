import { computeAdvancedTeamStats } from '../advancedTeamStatsUtils';
import { aggregateAnalyticsGames } from '../aggregateAnalyticsGames';
import { buildAnalyticsGame } from '../buildAnalyticsGame';
import type { AdvancedTrackedGame, PossessionAction, TrackedPoint } from '../types';

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
  participants,
};

// Helper to build a simple point where a given side scores
function makeHoldPoint(
  id: string,
  scoringSide: typeof ZOO | typeof RIVALS,
  receivingSide: typeof ZOO | typeof RIVALS,
) {
  const pullingSide = receivingSide === ZOO ? RIVALS : ZOO;
  if (scoringSide === receivingSide) {
    // Hold: receiving side scores on first possession
    return {
      id,
      lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
      possessions: [
        {
          id: `${id}_pos1`,
          sideId: receivingSide,
          actions: [
            {
              id: `${id}_a1`,
              kind: 'pull' as const,
              sideId: pullingSide,
              receivingSideId: receivingSide,
              puller: receivingSide === ZOO ? untracked : august,
              receiver: receivingSide === ZOO ? august : untracked,
              result: 'inbound' as const,
            },
            {
              id: `${id}_a2`,
              kind: 'throw' as const,
              sideId: receivingSide,
              thrower: receivingSide === ZOO ? august : untracked,
              toPlayer: receivingSide === ZOO ? meves : untracked,
              result: 'goal' as const,
            },
          ],
        },
      ],
    };
  } else {
    // Break: pulling side scores after a turnover
    return {
      id,
      lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
      possessions: [
        {
          id: `${id}_pos1`,
          sideId: receivingSide,
          actions: [
            {
              id: `${id}_a1`,
              kind: 'pull' as const,
              sideId: pullingSide,
              receivingSideId: receivingSide,
              puller: pullingSide === ZOO ? august : untracked,
              receiver: receivingSide === ZOO ? august : untracked,
              result: 'inbound' as const,
            },
            {
              id: `${id}_a2`,
              kind: 'throw' as const,
              sideId: receivingSide,
              thrower: receivingSide === ZOO ? august : untracked,
              result: 'throwaway' as const,
            },
          ],
        },
        {
          id: `${id}_pos2`,
          sideId: scoringSide,
          actions: [
            {
              id: `${id}_a3`,
              kind: 'disc_pickup' as const,
              sideId: scoringSide,
              player: scoringSide === ZOO ? august : untracked,
            },
            {
              id: `${id}_a4`,
              kind: 'throw' as const,
              sideId: scoringSide,
              thrower: scoringSide === ZOO ? august : untracked,
              toPlayer: scoringSide === ZOO ? meves : untracked,
              result: 'goal' as const,
            },
          ],
        },
      ],
    };
  }
}

function makeAlternatingPoint(
  id: string,
  receivingSide: typeof ZOO | typeof RIVALS,
  scoringSide: typeof ZOO | typeof RIVALS,
  turnoversBeforeScore: number,
): TrackedPoint {
  const pullingSide = receivingSide === ZOO ? RIVALS : ZOO;
  const possessions: TrackedPoint['possessions'] = [];

  for (let possessionIndex = 0; possessionIndex <= turnoversBeforeScore; possessionIndex++) {
    const sideId = possessionIndex % 2 === 0 ? receivingSide : pullingSide;
    const isScore = possessionIndex === turnoversBeforeScore;
    if (isScore && sideId !== scoringSide) {
      throw new Error('Fixture turnover count does not end with the requested scoring side.');
    }

    const actions: PossessionAction[] = [];
    if (possessionIndex === 0) {
      actions.push({
        id: `${id}_pull`,
        kind: 'pull',
        sideId: pullingSide,
        receivingSideId: receivingSide,
        puller: pullingSide === ZOO ? august : untracked,
        receiver: receivingSide === ZOO ? august : untracked,
        result: 'inbound',
      });
    }
    actions.push({
      id: `${id}_throw_${possessionIndex}`,
      kind: 'throw',
      sideId,
      thrower: sideId === ZOO ? august : untracked,
      ...(isScore ? { toPlayer: sideId === ZOO ? meves : untracked } : {}),
      result: isScore ? 'goal' : 'throwaway',
    });
    possessions.push({ id: `${id}_pos_${possessionIndex}`, sideId, actions });
  }

  return {
    id,
    lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
    possessions,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('advancedTeamStatsUtils', () => {
  describe('hold/break counting', () => {
    it('counts holds and breaks correctly', () => {
      // Pt1: Zoo receives and scores (hold)
      // Pt2: Rivals receive and Zoo scores (break — Zoo pulls, opponent turns it over, Zoo scores)
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: ZOO,
        points: [
          makeHoldPoint('pt1', ZOO, ZOO), // hold: Zoo receives, Zoo scores
          makeHoldPoint('pt2', ZOO, RIVALS), // break: Rivals receive, Zoo scores
        ],
      };

      const analytics = buildAnalyticsGame(game);
      const stats = computeAdvancedTeamStats(analytics, ZOO);

      expect(stats.holds).toBe(1);
      expect(stats.breaks).toBe(1);
      expect(stats.timesBroken).toBe(0);
      expect(stats.oppHolds).toBe(0);
      expect(stats.oPoints).toBe(1);
      expect(stats.dPoints).toBe(1);
    });

    it('counts broken and opp_hold', () => {
      // Pt1: Zoo receives (O), Rivals score → broken
      // After Rivals score pt1, Zoo receives pt2 again → but we want Rivals to receive pt2.
      // Use initialReceivingSideId=RIVALS so pt1=Rivals receive (opp_hold), then
      // after Rivals score pt1, Zoo receives pt2 → Zoo receives, Rivals score = broken.
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: RIVALS,
        points: [
          makeHoldPoint('pt1', RIVALS, RIVALS), // opp_hold: Rivals receive, Rivals score
          makeHoldPoint('pt2', RIVALS, ZOO), // broken: Zoo receives (derived), Rivals score
        ],
      };

      const analytics = buildAnalyticsGame(game);
      const stats = computeAdvancedTeamStats(analytics, ZOO);

      expect(stats.holds).toBe(0);
      expect(stats.breaks).toBe(0);
      expect(stats.timesBroken).toBe(1);
      expect(stats.oppHolds).toBe(1);
    });
  });

  describe('clean and dirty holds', () => {
    it('clean hold — single possession', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [makeHoldPoint('pt1', ZOO, ZOO)],
      };

      const analytics = buildAnalyticsGame(game);
      const stats = computeAdvancedTeamStats(analytics, ZOO);

      expect(stats.cleanHolds).toBe(1);
      expect(stats.dirtyHolds).toBe(0);
      expect(stats.scoredOPossessions).toBe(1);
      expect(stats.totalPossessionsOnO).toBe(1);
      expect(stats.oPossessionConversionPct).toBe(1);
    });
  });

  describe('efficiencies', () => {
    it('computes O and D efficiency', () => {
      // 2 O-points: 1 hold, 1 broken. 2 D-points: 1 break, 1 opp_hold
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: ZOO,
        points: [
          makeHoldPoint('pt1', ZOO, ZOO), // hold (O-point)
          makeHoldPoint('pt2', ZOO, RIVALS), // break (D-point)
          makeHoldPoint('pt3', RIVALS, ZOO), // broken (O-point)
          makeHoldPoint('pt4', RIVALS, RIVALS), // opp_hold (D-point)
        ],
      };

      const analytics = buildAnalyticsGame(game);
      const stats = computeAdvancedTeamStats(analytics, ZOO);

      // O-eff = holds / (holds + timesBroken) = 1/2 = 0.5
      expect(stats.oEfficiency).toBeCloseTo(0.5);
      // D-eff = breaks / (breaks + oppHolds) = 1/2 = 0.5
      expect(stats.dEfficiency).toBeCloseTo(0.5);
    });

    it('returns null efficiency with 0 relevant points', () => {
      // All D-points, no O-points
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: RIVALS,
        points: [makeHoldPoint('pt1', ZOO, RIVALS)], // break (D-point only)
      };

      const analytics = buildAnalyticsGame(game);
      const stats = computeAdvancedTeamStats(analytics, ZOO);

      expect(stats.oEfficiency).toBeNull(); // No O-points
      expect(stats.dEfficiency).toBeCloseTo(1.0); // 1 break, 0 opp_holds
    });
  });

  describe('conversion rates', () => {
    it('counts each O-possession after two turnovers before a hold', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [makeAlternatingPoint('pt1', ZOO, ZOO, 4)],
      };

      const stats = computeAdvancedTeamStats(buildAnalyticsGame(game), ZOO);

      expect(stats.holds).toBe(1);
      expect(stats.scoredOPossessions).toBe(1);
      expect(stats.totalPossessionsOnO).toBe(3);
      expect(stats.oPossessionConversionPct).toBeCloseTo(1 / 3);
    });

    it('separates D-possession conversion from break efficiency', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: RIVALS,
        points: [makeAlternatingPoint('pt1', RIVALS, ZOO, 9)],
      };

      const stats = computeAdvancedTeamStats(buildAnalyticsGame(game), ZOO);

      expect(stats.scoredDPossessions).toBe(1);
      expect(stats.totalPossessionsOnD).toBe(5);
      expect(stats.dPossessionConversionPct).toBeCloseTo(1 / 5);
      expect(stats.breakEfficiencyPct).toBe(1);
      expect(stats.dPointsWithTurnover).toBe(1);
    });

    it('preserves genuine zero percent when D chances do not convert', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: RIVALS,
        points: [makeAlternatingPoint('pt1', RIVALS, RIVALS, 2)],
      };

      const stats = computeAdvancedTeamStats(buildAnalyticsGame(game), ZOO);

      expect(stats.scoredDPossessions).toBe(0);
      expect(stats.totalPossessionsOnD).toBe(1);
      expect(stats.dPossessionConversionPct).toBe(0);
      expect(stats.breakEfficiencyPct).toBe(0);
    });

    it('returns null when there are no relevant possessions', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: RIVALS,
        points: [makeAlternatingPoint('pt1', RIVALS, RIVALS, 0)],
      };

      const stats = computeAdvancedTeamStats(buildAnalyticsGame(game), ZOO);

      expect(stats.oPossessionConversionPct).toBeNull();
      expect(stats.dPossessionConversionPct).toBeNull();
      expect(stats.possessionConversionPct).toBeNull();
      expect(stats.totalPossessions).toBe(0);
    });

    it('computes break efficiency from D-point break chances', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: RIVALS,
        points: [
          makeHoldPoint('pt1', ZOO, RIVALS), // break with a Zoo possession
          makeHoldPoint('pt2', RIVALS, RIVALS), // opp hold without a Zoo possession
        ],
      };

      const analytics = buildAnalyticsGame(game);
      const stats = computeAdvancedTeamStats(analytics, ZOO);

      expect(stats.dPoints).toBe(2);
      expect(stats.breaks).toBe(1);
      expect(stats.dPointsWithTurnover).toBe(1);
      expect(stats.breakEfficiencyPct).toBeCloseTo(1);
    });

    it('counts Callahan breaks as D-points with turnover', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: RIVALS,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pt1_pos1',
                sideId: RIVALS,
                actions: [
                  {
                    id: 'pt1_a1',
                    kind: 'pull',
                    sideId: ZOO,
                    receivingSideId: RIVALS,
                    puller: august,
                    receiver: untracked,
                    result: 'inbound',
                  },
                  {
                    id: 'pt1_a2',
                    kind: 'throw',
                    sideId: RIVALS,
                    thrower: untracked,
                    defender: august,
                    result: 'callahan',
                  },
                ],
              },
            ],
          },
        ],
      };

      const analytics = buildAnalyticsGame(game);
      const stats = computeAdvancedTeamStats(analytics, ZOO);

      expect(stats.breaks).toBe(1);
      expect(stats.dPointsWithTurnover).toBe(1);
      expect(stats.breakEfficiencyPct).toBeCloseTo(1);
      expect(stats.totalPossessions).toBe(1);
      expect(stats.scoredDPossessions).toBe(1);
      expect(stats.totalPossessionsOnD).toBe(1);
      expect(stats.dPossessionConversionPct).toBe(1);
      expect(stats.possessionConversionPct).toBeCloseTo(1);
    });

    it('classifies a Callahan after a turnover on our own O-point as an O-possession', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pt1_pos1',
                sideId: ZOO,
                actions: [
                  {
                    id: 'pt1_a1',
                    kind: 'pull',
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    receiver: august,
                    result: 'inbound',
                  },
                  {
                    id: 'pt1_a2',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: august,
                    result: 'throwaway',
                  },
                ],
              },
              {
                id: 'pt1_pos2',
                sideId: RIVALS,
                actions: [
                  {
                    id: 'pt1_b1',
                    kind: 'disc_pickup',
                    sideId: RIVALS,
                    player: untracked,
                  },
                  {
                    id: 'pt1_b2',
                    kind: 'throw',
                    sideId: RIVALS,
                    thrower: untracked,
                    defender: august,
                    result: 'callahan',
                  },
                ],
              },
            ],
          },
        ],
      };

      const analytics = buildAnalyticsGame(game);
      const stats = computeAdvancedTeamStats(analytics, ZOO);

      // Zoo receives (O-point), turns over, then scores a Callahan as defense.
      // Point resolves as a hold; the synthetic Callahan possession counts as an O-possession.
      expect(stats.holds).toBe(1);
      expect(stats.totalPossessions).toBe(2);
      expect(stats.scoredOPossessions).toBe(1);
      expect(stats.totalPossessionsOnO).toBe(2);
      expect(stats.oPossessionConversionPct).toBeCloseTo(0.5);
      expect(stats.possessionConversionPct).toBeCloseTo(0.5);
      expect(stats.scoredDPossessions).toBe(0);
      expect(stats.totalPossessionsOnD).toBe(0);
      expect(stats.dPossessionConversionPct).toBeNull();
    });

    it.each(['in_progress', 'terminated'] as const)(
      'includes the current %s possession in conversion denominators',
      (status) => {
        const point = makeAlternatingPoint('pt1', ZOO, ZOO, 2);
        const lastAction = point.possessions.at(-1)?.actions.at(-1);
        if (lastAction?.kind !== 'throw') throw new Error('Expected final throw fixture.');
        lastAction.result = 'complete';

        const game: AdvancedTrackedGame = {
          ...baseGame,
          status,
          points: [point],
        };
        const stats = computeAdvancedTeamStats(buildAnalyticsGame(game), ZOO);

        expect(stats.totalPossessions).toBe(2);
        expect(stats.oEfficiency).toBeNull();
        expect(stats.totalPossessionsOnO).toBe(2);
        expect(stats.scoredOPossessions).toBe(0);
        expect(stats.oPossessionConversionPct).toBe(0);
        expect(stats.possessionConversionPct).toBe(0);
      },
    );

    it('computes conversion from either side perspective', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [makeAlternatingPoint('pt1', ZOO, ZOO, 4)],
      };

      const stats = computeAdvancedTeamStats(buildAnalyticsGame(game), RIVALS);

      expect(stats.scoredDPossessions).toBe(0);
      expect(stats.totalPossessionsOnD).toBe(2);
      expect(stats.dPossessionConversionPct).toBe(0);
    });

    it('pools raw aggregate possession totals instead of averaging game percentages', () => {
      const cleanHold = buildAnalyticsGame({
        ...baseGame,
        id: 'clean-hold',
        points: [makeAlternatingPoint('pt1', ZOO, ZOO, 0)],
      });
      const threeChanceHold = buildAnalyticsGame({
        ...baseGame,
        id: 'three-chance-hold',
        points: [makeAlternatingPoint('pt1', ZOO, ZOO, 4)],
      });
      const aggregate = aggregateAnalyticsGames([cleanHold, threeChanceHold]);
      if (aggregate == null) throw new Error('Expected an aggregate analytics game.');

      const stats = computeAdvancedTeamStats(aggregate, ZOO);

      expect(stats.scoredOPossessions).toBe(2);
      expect(stats.totalPossessionsOnO).toBe(4);
      expect(stats.oPossessionConversionPct).toBe(0.5);
      expect(stats.possessionConversionPct).toBe(0.5);
    });

    it('excludes terminated points from O/D conversion denominators', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        status: 'terminated',
        initialReceivingSideId: ZOO,
        points: [
          makeHoldPoint('pt1', ZOO, ZOO),
          {
            id: 'pt2',
            lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
            possessions: [
              {
                id: 'pt2_pos1',
                sideId: RIVALS,
                actions: [
                  {
                    id: 'pt2_a1',
                    kind: 'pull',
                    sideId: ZOO,
                    receivingSideId: RIVALS,
                    puller: august,
                    receiver: untracked,
                    result: 'inbound',
                  },
                  {
                    id: 'pt2_a2',
                    kind: 'throw',
                    sideId: RIVALS,
                    thrower: untracked,
                    toPlayer: untracked,
                    result: 'complete',
                  },
                ],
              },
            ],
          },
        ],
      };

      const analytics = buildAnalyticsGame(game);
      const stats = computeAdvancedTeamStats(analytics, ZOO);

      expect(stats.holds).toBe(1);
      expect(stats.oPoints).toBe(1);
      expect(stats.dPoints).toBe(0);
    });
  });

  describe('scoring runs and droughts', () => {
    it('tracks longest scoring run', () => {
      // Zoo scores 3 in a row then loses 1
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: ZOO,
        points: [
          makeHoldPoint('pt1', ZOO, ZOO),
          makeHoldPoint('pt2', ZOO, RIVALS),
          makeHoldPoint('pt3', ZOO, ZOO),
          makeHoldPoint('pt4', RIVALS, RIVALS),
        ],
      };

      const analytics = buildAnalyticsGame(game);
      const stats = computeAdvancedTeamStats(analytics, ZOO);

      expect(stats.longestScoringRun).toBe(3);
      expect(stats.longestDrought).toBe(1);
    });
  });

  describe('possessions per point', () => {
    it('computes average possessions per point for the specified side only', () => {
      // pt1: Zoo clean hold — Zoo has 1 possession
      // pt2: Zoo breaks — Rivals have 1 possession (turned over), Zoo has 1 possession (scores)
      // Zoo total: 2 possessions across 2 points = 1.0 avg
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: ZOO,
        points: [
          makeHoldPoint('pt1', ZOO, ZOO), // Zoo: 1 possession
          makeHoldPoint('pt2', ZOO, RIVALS), // Zoo: 1 possession (after Rivals turn it over)
        ],
      };

      const analytics = buildAnalyticsGame(game);
      const stats = computeAdvancedTeamStats(analytics, ZOO);

      // Zoo: (1 + 1) / 2 = 1.0 (Rivals' possession in pt2 is not counted)
      expect(stats.possessionsPerPoint).toBeCloseTo(1.0);
    });
  });

  describe('passing flow', () => {
    it('computes completed passes per point, per possession, and completion rate', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
            possessions: [
              {
                id: 'pt1_pos1',
                sideId: ZOO,
                actions: [
                  {
                    id: 'pt1_a1',
                    kind: 'pull',
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    receiver: august,
                    result: 'inbound',
                  },
                  {
                    id: 'pt1_a2',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: august,
                    toPlayer: meves,
                    result: 'complete',
                  },
                  {
                    id: 'pt1_a3',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: meves,
                    result: 'throwaway',
                  },
                ],
              },
              {
                id: 'pt1_pos2',
                sideId: RIVALS,
                actions: [
                  {
                    id: 'pt1_a4',
                    kind: 'throw',
                    sideId: RIVALS,
                    thrower: untracked,
                    defender: august,
                    result: 'block',
                  },
                ],
              },
              {
                id: 'pt1_pos3',
                sideId: ZOO,
                actions: [
                  {
                    id: 'pt1_a5',
                    kind: 'disc_pickup',
                    sideId: ZOO,
                    player: august,
                  },
                  {
                    id: 'pt1_a6',
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
      const stats = computeAdvancedTeamStats(analytics, ZOO);

      expect(stats.totalThrowAttempts).toBe(3);
      expect(stats.totalCompletedPasses).toBe(2);
      expect(stats.completedPassesPerPoint).toBe(2);
      expect(stats.completedPassesPerPossession).toBe(1);
      expect(stats.completionPct).toBeCloseTo(2 / 3);
    });
  });

  describe('scores after turnovers', () => {
    it('counts possessions scoring after index > 0', () => {
      // Break point: turnover causes possession 2 which scores
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: RIVALS,
        points: [makeHoldPoint('pt1', ZOO, RIVALS)], // break: 2 possessions, 2nd scores
      };

      const analytics = buildAnalyticsGame(game);
      const stats = computeAdvancedTeamStats(analytics, ZOO);

      expect(stats.scoresAfterTurnovers).toBe(1);
    });

    it('only counts the specified side — not opponent scores after turnovers', () => {
      // pt1: Rivals receive, Zoo breaks (Zoo scores after TO) → Zoo scoresAfterTurnovers = 1
      // pt2: Zoo receives, Rivals break (Rivals score after TO) → should NOT count for Zoo
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: RIVALS,
        points: [
          makeHoldPoint('pt1', ZOO, RIVALS), // break: Zoo scores after turnover
          makeHoldPoint('pt2', RIVALS, ZOO), // broken: Rivals score after turnover
        ],
      };

      const analytics = buildAnalyticsGame(game);
      const stats = computeAdvancedTeamStats(analytics, ZOO);

      expect(stats.scoresAfterTurnovers).toBe(1);
    });
  });

  describe('normal stats efficiency fields', () => {
    it('computes points per turnover, blocks per D-point, turnovers, and blocks', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: ZOO,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
            possessions: [
              {
                id: 'pt1_pos1',
                sideId: ZOO,
                actions: [
                  {
                    id: 'pt1_a1',
                    kind: 'pull' as const,
                    sideId: RIVALS,
                    receivingSideId: ZOO,
                    puller: untracked,
                    receiver: august,
                    result: 'inbound' as const,
                  },
                  {
                    id: 'pt1_a2',
                    kind: 'throw' as const,
                    sideId: ZOO,
                    thrower: august,
                    result: 'throwaway' as const,
                  },
                ],
              },
              {
                id: 'pt1_pos2',
                sideId: RIVALS,
                actions: [
                  {
                    id: 'pt1_a3',
                    kind: 'throw' as const,
                    sideId: RIVALS,
                    thrower: untracked,
                    defender: meves,
                    result: 'block' as const,
                  },
                ],
              },
              {
                id: 'pt1_pos3',
                sideId: ZOO,
                actions: [
                  {
                    id: 'pt1_a4',
                    kind: 'disc_pickup' as const,
                    sideId: ZOO,
                    player: meves,
                  },
                  {
                    id: 'pt1_a5',
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
          {
            id: 'pt2',
            lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
            possessions: [
              {
                id: 'pt2_pos1',
                sideId: RIVALS,
                actions: [
                  {
                    id: 'pt2_a1',
                    kind: 'pull' as const,
                    sideId: ZOO,
                    receivingSideId: RIVALS,
                    puller: august,
                    receiver: untracked,
                    result: 'inbound' as const,
                  },
                  {
                    id: 'pt2_a2',
                    kind: 'throw' as const,
                    sideId: RIVALS,
                    thrower: untracked,
                    defender: meves,
                    result: 'block' as const,
                  },
                ],
              },
              {
                id: 'pt2_pos2',
                sideId: ZOO,
                actions: [
                  {
                    id: 'pt2_a3',
                    kind: 'disc_pickup' as const,
                    sideId: ZOO,
                    player: meves,
                  },
                  {
                    id: 'pt2_a4',
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

      const analytics = buildAnalyticsGame(game);
      const stats = computeAdvancedTeamStats(analytics, ZOO);

      expect(stats.totalTurnovers).toBe(1);
      expect(stats.totalBlocks).toBe(2);
      expect(stats.pointsPerTurnover).toBe(2);
      expect(stats.totalGoals).toBe(2);
      expect(stats.totalPossessions).toBe(3);
      expect(stats.possessionConversionPct).toBeCloseTo(2 / 3);
      expect(stats.blocksPerDPoint).toBe(2);
      expect(stats.dPointsWithTurnover).toBe(1);
      expect(stats.completedPoints).toBe(2);
      expect(stats.multiPossessionPoints).toBe(1);
      expect(stats.multiPossessionPointPct).toBeCloseTo(0.5);
    });

    it('counts pressures separately from blocks on defense', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: RIVALS,
        points: [
          {
            id: 'pt1',
            lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
            possessions: [
              {
                id: 'opp-possession',
                sideId: RIVALS,
                actions: [
                  {
                    id: 'pull1',
                    kind: 'pull',
                    sideId: ZOO,
                    receivingSideId: RIVALS,
                    puller: august,
                    result: 'inbound',
                  },
                  {
                    id: 'pressure1',
                    kind: 'throw',
                    sideId: RIVALS,
                    thrower: untracked,
                    defender: august,
                    result: 'pressure',
                  },
                ],
              },
              {
                id: 'zoo-possession',
                sideId: ZOO,
                actions: [
                  {
                    id: 'pickup1',
                    kind: 'disc_pickup',
                    sideId: ZOO,
                    player: august,
                  },
                  {
                    id: 'goal1',
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

      const stats = computeAdvancedTeamStats(buildAnalyticsGame(game), ZOO);
      expect(stats.totalPressures).toBe(1);
      expect(stats.pressuresPerDPoint).toBe(1);
      expect(stats.totalBlocks).toBe(0);
    });
  });
});
