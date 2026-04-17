import { computeAdvancedTeamStats } from '../../advancedTracking/advancedTeamStatsUtils';
import { buildAnalyticsGame } from '../../advancedTracking/buildAnalyticsGame';
import type { AdvancedTrackedGame } from '../../advancedTracking/types';

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
    it('computes O-line and D-line conversion %', () => {
      // initialReceiving=ZOO → pt1: Zoo receives, Zoo scores (hold).
      // Zoo scored pt1 → Rivals receive pt2 (D-point for Zoo).
      // Rivals score pt2 → Zoo receives pt3 (O-point).
      // Pt3: Zoo receives, Rivals score (broken).
      // Zoo now has 2 O-points (pt1=hold, pt3=broken) and 1 D-point (pt2).
      const game: AdvancedTrackedGame = {
        ...baseGame,
        initialReceivingSideId: ZOO,
        points: [
          makeHoldPoint('pt1', ZOO, ZOO), // hold (O-point)
          makeHoldPoint('pt2', RIVALS, RIVALS), // opp_hold (D-point)
          makeHoldPoint('pt3', RIVALS, ZOO), // broken (O-point)
        ],
      };

      const analytics = buildAnalyticsGame(game);
      const stats = computeAdvancedTeamStats(analytics, ZOO);

      // oLineConversion = holds / oPoints = 1/2 = 0.5
      expect(stats.oLineConversionPct).toBeCloseTo(0.5);
      // dLineConversion = breaks / dPoints = 0/1 = 0
      expect(stats.dLineConversionPct).toBeCloseTo(0);
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
      expect(stats.oLineConversionPct).toBeCloseTo(1);
      expect(stats.dLineConversionPct).toBeNull();
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
});
