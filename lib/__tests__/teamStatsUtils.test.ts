import { GameEvent } from '@/store/gameStore.types';
import { computeTeamStats } from '../teamStatsUtils';

// Helper to create goal events
const goal = (
  team: 'team1' | 'team2',
  goalPlayerId?: string,
  assistPlayerId?: string,
): GameEvent => ({
  type: 'goal',
  team,
  goalPlayerId: goalPlayerId ?? null,
  assistPlayerId: assistPlayerId ?? null,
});

// Helper to create turnover events
const turnover = (
  team: 'team1' | 'team2',
  subtype: 'block' | 'throwaway' | 'drop' | 'fiftyfifty',
  playerId?: string,
): GameEvent => ({
  type: 'turnover',
  team,
  subtype,
  playerId: playerId ?? null,
});

describe('computeTeamStats', () => {
  describe('empty game', () => {
    it('returns zeros for empty events', () => {
      const stats = computeTeamStats([], 'team1', 15);

      expect(stats.offensivePoints).toBe(0);
      expect(stats.defensivePoints).toBe(0);
      expect(stats.holds).toBe(0);
      expect(stats.breaks).toBe(0);
      expect(stats.holdPercentage).toBe(0);
      expect(stats.dEfficiency).toBe(0);
    });
  });

  describe('hold tracking', () => {
    it('counts clean hold (team1 starts on O, scores, no turnovers)', () => {
      const events: GameEvent[] = [goal('team1', 'Alice', 'Bob')];
      const stats = computeTeamStats(events, 'team1', 15);

      expect(stats.offensivePoints).toBe(1);
      expect(stats.holds).toBe(1);
      expect(stats.cleanHolds).toBe(1);
      expect(stats.dirtyHolds).toBe(0);
      expect(stats.holdPercentage).toBe(100);
    });

    it('counts dirty hold (team1 starts on O, turns it over, gets it back, scores)', () => {
      const events: GameEvent[] = [
        turnover('team1', 'throwaway', 'Alice'), // team1 turns it over
        turnover('team2', 'throwaway'), // team2 turns it back
        goal('team1', 'Bob', 'Charlie'),
      ];
      const stats = computeTeamStats(events, 'team1', 15);

      expect(stats.offensivePoints).toBe(1);
      expect(stats.holds).toBe(1);
      expect(stats.cleanHolds).toBe(0);
      expect(stats.dirtyHolds).toBe(1);
      expect(stats.totalTurnovers).toBe(1); // Only team1's turnover counts
    });
  });

  describe('break tracking', () => {
    it('counts break (team1 starts on D, scores)', () => {
      const events: GameEvent[] = [
        turnover('team1', 'block'), // team1 gets a block
        goal('team1', 'Alice', 'Bob'),
      ];
      const stats = computeTeamStats(events, 'team2', 15);

      expect(stats.defensivePoints).toBe(1);
      expect(stats.breaks).toBe(1);
      expect(stats.dPointsWithTurnover).toBe(1);
      expect(stats.breakEfficiency).toBe(100);
      expect(stats.dEfficiency).toBe(100);
    });

    it('counts failed break opportunity (got turnover but opponent scored)', () => {
      const events: GameEvent[] = [
        turnover('team1', 'block'), // team1 gets a block
        turnover('team1', 'drop'), // team1 drops it
        goal('team2'), // team2 scores anyway
      ];
      const stats = computeTeamStats(events, 'team2', 15);

      expect(stats.defensivePoints).toBe(1);
      expect(stats.breaks).toBe(0);
      expect(stats.dPointsWithTurnover).toBe(1);
      expect(stats.breakEfficiency).toBe(0);
      expect(stats.dEfficiency).toBe(0);
    });
  });

  describe('times broken', () => {
    it('counts when team1 starts on O but team2 scores', () => {
      const events: GameEvent[] = [turnover('team1', 'throwaway'), goal('team2')];
      const stats = computeTeamStats(events, 'team1', 15);

      expect(stats.offensivePoints).toBe(1);
      expect(stats.timesBroken).toBe(1);
      expect(stats.holds).toBe(0);
    });
  });

  describe('game flow', () => {
    it('tracks longest scoring run', () => {
      const events: GameEvent[] = [
        goal('team1'), // Run: 1
        goal('team2'), // Break run, team1 starts D next
        goal('team1'), // Run: 1
        goal('team1'), // Run: 2
        goal('team1'), // Run: 3
        goal('team2'), // Break run
      ];
      const stats = computeTeamStats(events, 'team1', 15);

      expect(stats.longestScoringRun).toBe(3);
    });

    it('tracks longest drought', () => {
      const events: GameEvent[] = [
        goal('team1'),
        goal('team2'), // Drought: 1
        goal('team2'), // Drought: 2
        goal('team2'), // Drought: 3
        goal('team1'),
      ];
      const stats = computeTeamStats(events, 'team1', 15);

      expect(stats.longestDrought).toBe(3);
    });
  });

  describe('turnovers', () => {
    it('counts total team1 turnovers', () => {
      const events: GameEvent[] = [
        turnover('team1', 'throwaway'),
        turnover('team1', 'drop'),
        turnover('team2', 'throwaway'), // Not counted
        goal('team2'),
      ];
      const stats = computeTeamStats(events, 'team1', 15);

      expect(stats.totalTurnovers).toBe(2);
    });

    it('calculates turnovers per point', () => {
      const events: GameEvent[] = [
        turnover('team1', 'throwaway'),
        goal('team1'),
        turnover('team1', 'throwaway'),
        turnover('team1', 'drop'),
        goal('team2'),
      ];
      const stats = computeTeamStats(events, 'team1', 15);

      // 3 turnovers over 2 points = 1.5
      expect(stats.turnoversPerPoint).toBe(1.5);
    });
  });

  describe('efficiency metrics', () => {
    it('calculates points per turnover', () => {
      const events: GameEvent[] = [
        goal('team1'),
        turnover('team1', 'throwaway'),
        goal('team1'),
        turnover('team1', 'drop'),
        goal('team1'),
      ];
      const stats = computeTeamStats(events, 'team1', 15);

      // 3 goals / 2 turnovers = 1.5
      expect(stats.pointsPerTurnover).toBe(1.5);
    });

    it('calculates blocks per D-point', () => {
      const events: GameEvent[] = [
        goal('team1'), // O-point, not counted for blocks/D
        turnover('team1', 'block'), // D-point, 1 block (Team 1 credit)
        goal('team1'),
        goal('team2'), // D-point, 0 blocks
      ];
      const stats = computeTeamStats(events, 'team1', 15);

      // 1 block / 2 D-points = 0.5
      expect(stats.blocksPerDPoint).toBe(0.5);
    });

    it('calculates conversion rate correctly (goals / possessions)', () => {
      // Team1 starts receiving (on O)
      // After any team scores, that team pulls, other team receives
      //
      // Point 1: team1 O (receives) → team1 scores (hold) → team1 pulls
      // Point 2: team1 D (team2 receives) → team1 break with 2 opp TOs → team1 pulls
      // Point 3: team1 D (team2 receives) → team2 scores (they hold) → team2 pulls
      // Point 4: team1 O (receives) → dirty hold (1 our TO, 1 opp TO) → team1 pulls
      // Point 5: team1 D (team2 receives) → team1 break with 1 opp TO → team1 pulls
      //
      // Results:
      // - O-Points: 2 (points 1, 4)
      // - D-Points: 3 (points 2, 3, 5)
      // - Our Goals: 4 (2 holds + 2 breaks)
      // - Opponent turnovers: 4 (2 from point 2 + 1 from point 4 + 1 from point 5)
      // - Possessions = O-Points + Opp Turnovers = 2 + 4 = 6
      // - Conversion = 4/6 = 66.67%

      const events: GameEvent[] = [
        // Point 1: team1 O, clean hold
        goal('team1'),

        // Point 2: team1 D, break with 2 opp turnovers
        turnover('team1', 'block'),
        turnover('team2', 'throwaway'),
        goal('team1'),

        // Point 3: team1 D, opponent holds (we lose this point)
        goal('team2'),

        // Point 4: team1 O, dirty hold with turnovers both ways
        turnover('team1', 'throwaway'), // We turn it over
        turnover('team1', 'block'), // We get it back
        goal('team1'),

        // Point 5: team1 D, break with 1 opp turnover
        turnover('team2', 'drop'),
        goal('team1'),
      ];

      const stats = computeTeamStats(events, 'team1', 15);

      // O-Points: 2 (points 1, 4)
      expect(stats.offensivePoints).toBe(2);
      // D-Points: 3 (points 2, 3, 5)
      expect(stats.defensivePoints).toBe(3);
      // Goals: 4 (2 holds from O-points, 2 breaks from D-points)
      expect(stats.holds).toBe(2);
      expect(stats.breaks).toBe(2);
      // Opponent turnovers: 4 total
      expect(stats.opponentTurnovers).toBe(4);
      // Possessions = O-Points + Opp Turnovers = 2 + 4 = 6
      // Conversion = 4/6 = 66.67%
      expect(stats.conversionRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('full game scenario', () => {
    it('calculates correct stats for a realistic game', () => {
      // Simulate a 5-3 game where team1 starts on offense
      // After each goal, possession alternates (scoring team pulls)
      // gameTo=15 means halftime at 8, so no halftime flip in this short game
      const events: GameEvent[] = [
        // Point 1: team1 O -> team1 scores (clean hold)
        goal('team1', 'Alice', 'Bob'),

        // Point 2: team1 D (team2 receives) -> team2 scores (team2 holds)
        goal('team2'),

        // Point 3: team1 O -> team1 scores after block (dirty hold due to team1 TO)
        turnover('team1', 'throwaway'), // team1 turns over
        turnover('team1', 'block'), // team1 gets a block to regain possession
        goal('team1', 'Charlie', 'Dave'),

        // Point 4: team1 D -> team1 scores (break!)
        turnover('team2', 'drop'),
        goal('team1', 'Alice'),

        // Point 5: team1 D -> team1 scores (another break!)
        turnover('team2', 'throwaway'),
        goal('team1', 'Bob'),

        // Point 6: team1 D -> team2 scores (team2 holds)
        goal('team2'),

        // Point 7: team1 O -> team1 scores (clean hold)
        goal('team1', 'Charlie', 'Alice'),

        // Point 8: team1 D -> team2 scores (team2 holds)
        goal('team2'),
      ];

      const stats = computeTeamStats(events, 'team1', 15);

      // O-points (team1 receives): 1, 3, 7 = 3
      expect(stats.offensivePoints).toBe(3);
      // D-points (team2 receives): 2, 4, 5, 6, 8 = 5
      expect(stats.defensivePoints).toBe(5);

      // Holds: team1 O -> team1 scores: points 1, 3, 7 = 3
      expect(stats.holds).toBe(3);
      expect(stats.cleanHolds).toBe(2); // Points 1, 7 (no team1 turnovers)
      expect(stats.dirtyHolds).toBe(1); // Point 3 (had a team1 turnover)

      // Breaks: team1 D -> team1 scores: points 4, 5 = 2
      expect(stats.breaks).toBe(2);

      // Times broken: team1 O -> team2 scores: 0 (all O-points were holds)
      expect(stats.timesBroken).toBe(0);

      // Hold %: 3/3 = 100%
      expect(stats.holdPercentage).toBe(100);

      // D-points with opponent turnover: 4 (drop), 5 (throwaway) = 2
      // Note: Point 3 is an O-point, so its turnovers don't count here
      expect(stats.dPointsWithTurnover).toBe(2);

      // Break efficiency: 2 breaks / 2 D-points with turnover = 100%
      expect(stats.breakEfficiency).toBe(100);

      // D-efficiency: 2 breaks / 5 D-points = 40%
      expect(stats.dEfficiency).toBe(40);

      // Scoring: 1, 3, 4, 5, 7 -> runs: 1, then 3-4-5 (3), then 7 (1) -> max 3
      expect(stats.longestScoringRun).toBe(3);

      // Team1 turnovers: 1 (point 3)
      expect(stats.totalTurnovers).toBe(1);
    });
  });
});
