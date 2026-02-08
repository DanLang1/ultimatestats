import { GameEvent, PointLineRecord } from '@/lib/storage/types';
import {
  computePerPointStats,
  computePlayingTimeStats,
  computeRates,
  formatEfficiency,
  formatMinutesPlayed,
  PlayingTimeStats,
} from '../playingTimeStatsUtils';

describe('playingTimeStatsUtils', () => {
  describe('computePlayingTimeStats', () => {
    it('returns empty map when no point lines', () => {
      const result = computePlayingTimeStats([], [], 'team1', 15);
      expect(result.size).toBe(0);
    });

    it('computes points played correctly', () => {
      const pointLines: PointLineRecord[] = [
        { pointNumber: 1, playerIds: ['p1', 'p2'], timestamp: 1000 },
        { pointNumber: 2, playerIds: ['p1', 'p3'], timestamp: 2000 },
        { pointNumber: 3, playerIds: ['p2', 'p3'], timestamp: 3000 },
      ];

      const events: GameEvent[] = [
        { type: 'goal', team: 'team1', goalPlayerId: 'p1', assistPlayerId: 'p2' },
        { type: 'goal', team: 'team2', goalPlayerId: null, assistPlayerId: null },
        { type: 'goal', team: 'team1', goalPlayerId: 'p2', assistPlayerId: 'p3' },
      ];

      const result = computePlayingTimeStats(pointLines, events, 'team1', 15);

      expect(result.get('p1')?.pointsPlayed).toBe(2);
      expect(result.get('p2')?.pointsPlayed).toBe(2);
      expect(result.get('p3')?.pointsPlayed).toBe(2);
    });

    it('computes O-line efficiency correctly for holds', () => {
      // Team1 receives first (O-line) and scores (hold)
      const pointLines: PointLineRecord[] = [
        { pointNumber: 1, playerIds: ['p1'], timestamp: 1000 },
      ];

      const events: GameEvent[] = [
        { type: 'goal', team: 'team1', goalPlayerId: 'p1', assistPlayerId: null },
      ];

      const result = computePlayingTimeStats(pointLines, events, 'team1', 15);

      expect(result.get('p1')?.oEfficiency).toBe(1); // 1/1 = 100% hold rate
      expect(result.get('p1')?.oLineHolds).toBe(1);
      expect(result.get('p1')?.oPoints).toBe(1);
    });

    it('computes O-line efficiency correctly for breaks against', () => {
      // Team1 receives first (O-line) but team2 scores (break against)
      const pointLines: PointLineRecord[] = [
        { pointNumber: 1, playerIds: ['p1'], timestamp: 1000 },
      ];

      const events: GameEvent[] = [
        { type: 'goal', team: 'team2', goalPlayerId: null, assistPlayerId: null },
      ];

      const result = computePlayingTimeStats(pointLines, events, 'team1', 15);

      expect(result.get('p1')?.oEfficiency).toBe(0); // 0/1 = 0% hold rate
      expect(result.get('p1')?.oLineBreaksAgainst).toBe(1);
      expect(result.get('p1')?.pointLosses).toBe(1);
    });

    it('computes D-line efficiency correctly for breaks', () => {
      // Team1 pulls (D-line) and then scores (break)
      const pointLines: PointLineRecord[] = [
        { pointNumber: 1, playerIds: ['p1'], timestamp: 1000 },
      ];

      const events: GameEvent[] = [
        { type: 'goal', team: 'team1', goalPlayerId: 'p1', assistPlayerId: null },
      ];

      // startingPossession is team2, so team1 is on D-line
      const result = computePlayingTimeStats(pointLines, events, 'team2', 15);

      expect(result.get('p1')?.dEfficiency).toBe(1); // 1/1 = 100% break rate
      expect(result.get('p1')?.dLineBreaks).toBe(1);
      expect(result.get('p1')?.dPoints).toBe(1);
    });

    it('computes D-line efficiency correctly for holds against', () => {
      // Team1 pulls (D-line) and team2 scores (hold against)
      const pointLines: PointLineRecord[] = [
        { pointNumber: 1, playerIds: ['p1'], timestamp: 1000 },
      ];

      const events: GameEvent[] = [
        { type: 'goal', team: 'team2', goalPlayerId: null, assistPlayerId: null },
      ];

      // startingPossession is team2, so team1 is on D-line
      const result = computePlayingTimeStats(pointLines, events, 'team2', 15);

      expect(result.get('p1')?.dEfficiency).toBe(0); // 0/1 = 0% break rate
      expect(result.get('p1')?.dLineHoldsAgainst).toBe(1);
      expect(result.get('p1')?.pointLosses).toBe(1);
    });

    it('includes all players who appeared during a point with substitutions', () => {
      // p1 subs out, p2 subs in mid-point — both get credit
      const pointLines: PointLineRecord[] = [
        { pointNumber: 1, playerIds: ['p1'], timestamp: 1000 },
        { pointNumber: 1, playerIds: ['p2'], timestamp: 2000, isSubstitution: true },
      ];

      const events: GameEvent[] = [
        { type: 'goal', team: 'team1', goalPlayerId: 'p2', assistPlayerId: null },
      ];

      const result = computePlayingTimeStats(pointLines, events, 'team1', 15);

      // Both p1 and p2 get credit for this point
      expect(result.get('p1')?.pointsPlayed).toBe(1);
      expect(result.get('p1')?.oEfficiency).toBe(1);
      expect(result.get('p2')?.pointsPlayed).toBe(1);
      expect(result.get('p2')?.oEfficiency).toBe(1);
    });

    it('computes playing time percent correctly', () => {
      const pointLines: PointLineRecord[] = [
        { pointNumber: 1, playerIds: ['p1'], timestamp: 1000 },
        { pointNumber: 2, playerIds: ['p2'], timestamp: 2000 },
        { pointNumber: 3, playerIds: ['p1'], timestamp: 3000 },
        { pointNumber: 4, playerIds: ['p2'], timestamp: 4000 },
      ];

      const events: GameEvent[] = [
        { type: 'goal', team: 'team1', goalPlayerId: 'p1', assistPlayerId: null },
        { type: 'goal', team: 'team1', goalPlayerId: 'p2', assistPlayerId: null },
        { type: 'goal', team: 'team1', goalPlayerId: 'p1', assistPlayerId: null },
        { type: 'goal', team: 'team1', goalPlayerId: 'p2', assistPlayerId: null },
      ];

      const result = computePlayingTimeStats(pointLines, events, 'team1', 15);

      // Each player played 2 of 4 points = 50%
      expect(result.get('p1')?.playingTimePercent).toBe(50);
      expect(result.get('p2')?.playingTimePercent).toBe(50);
    });
  });

  describe('computePerPointStats', () => {
    it('returns zeros when no points played', () => {
      // pointsPlayed, goals, assists, blocks, turnovers, throwaways, drops
      const result = computePerPointStats(0, 3, 2, 1, 4, 2, 2);
      expect(result.goalsPerPoint).toBe(0);
      expect(result.assistsPerPoint).toBe(0);
      expect(result.blocksPerPoint).toBe(0);
      expect(result.turnoversPerPoint).toBe(0);
      expect(result.throwawaysPerPoint).toBe(0);
      expect(result.dropsPerPoint).toBe(0);
    });

    it('computes stats per point correctly', () => {
      // 10 points played, 5 goals, 3 assists, 2 blocks, 4 turnovers, 3 throwaways, 1 drop
      const result = computePerPointStats(10, 5, 3, 2, 4, 3, 1);
      expect(result.goalsPerPoint).toBe(0.5);
      expect(result.assistsPerPoint).toBe(0.3);
      expect(result.blocksPerPoint).toBe(0.2);
      expect(result.turnoversPerPoint).toBe(0.4);
      expect(result.throwawaysPerPoint).toBe(0.3);
      expect(result.dropsPerPoint).toBe(0.1);
    });
  });

  describe('computeRates', () => {
    it('computes win rate correctly', () => {
      const stats: PlayingTimeStats = {
        pointsPlayed: 10,
        oPoints: 6,
        dPoints: 4,
        oEfficiency: 4,
        dEfficiency: 1,
        pointWins: 7,
        pointLosses: 3,
        oLineHolds: 5,
        oLineBreaksAgainst: 1,
        dLineBreaks: 2,
        dLineHoldsAgainst: 2,
      };

      const rates = computeRates(stats);
      expect(rates.pointWinRate).toBe(70);
    });

    it('handles zero points gracefully', () => {
      const stats: PlayingTimeStats = {
        pointsPlayed: 0,
        oPoints: 0,
        dPoints: 0,
        oEfficiency: 0,
        dEfficiency: 0,
        pointWins: 0,
        pointLosses: 0,
        oLineHolds: 0,
        oLineBreaksAgainst: 0,
        dLineBreaks: 0,
        dLineHoldsAgainst: 0,
      };

      const rates = computeRates(stats);
      expect(rates.pointWinRate).toBe(0);
    });
  });

  describe('formatEfficiency', () => {
    it('formats rate as percentage', () => {
      expect(formatEfficiency(0.75)).toBe('75%');
      expect(formatEfficiency(1)).toBe('100%');
      expect(formatEfficiency(0)).toBe('0%');
      expect(formatEfficiency(0.333)).toBe('33%');
    });
  });

  describe('formatMinutesPlayed', () => {
    it('formats minutes and seconds', () => {
      expect(formatMinutesPlayed(5.5)).toBe('5:30');
      expect(formatMinutesPlayed(12.25)).toBe('12:15');
    });

    it('returns dash for undefined or zero', () => {
      expect(formatMinutesPlayed(undefined)).toBe('-');
      expect(formatMinutesPlayed(0)).toBe('-');
    });
  });
});
