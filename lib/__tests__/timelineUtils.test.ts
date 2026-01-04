import { GameEvent } from '@/store/gameStore.types';
import { computePointByPointEvents, getTurnoverSummary } from '../timelineUtils';

describe('timelineUtils', () => {
  describe('computePointByPointEvents', () => {
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

    const turnover = (team: 'team1' | 'team2', subtype: any): GameEvent => ({
      type: 'turnover',
      team,
      subtype,
      playerId: null,
    });

    it('should correctly group turnovers into points', () => {
      const events: GameEvent[] = [
        turnover('team1', 'throwaway'),
        turnover('team2', 'block'),
        goal('team1', 'Alice', 'Bob'),
        turnover('team1', 'drop'),
        goal('team2'),
      ];

      const points = computePointByPointEvents(events, 'team1', 15);

      expect(points).toHaveLength(2);

      // Point 1
      expect(points[0].pointNumber).toBe(1);
      expect(points[0].scoringTeam).toBe('team1');
      expect(points[0].turnovers).toHaveLength(2);
      expect(points[0].turnovers[0].type).toBe('throwaway');
      expect(points[0].turnovers[1].type).toBe('block');
      expect(points[0].scoreAfter).toEqual({ team1: 1, team2: 0 });

      // Point 2
      expect(points[1].pointNumber).toBe(2);
      expect(points[1].scoringTeam).toBe('team2');
      expect(points[1].turnovers).toHaveLength(1);
      expect(points[1].turnovers[0].type).toBe('drop');
      expect(points[1].scoreAfter).toEqual({ team1: 1, team2: 1 });
    });

    it('should track possession changes (scoring team pulls)', () => {
      const events: GameEvent[] = [
        goal('team1'), // Point 1: team1 starts O, scores. Next point: team2 is O.
        goal('team1'), // Point 2: team2 starts O, team1 scores. Next point: team1 is O.
        goal('team2'), // Point 3: team1 starts O, team2 scores. Next point: team2 is O.
      ];

      const points = computePointByPointEvents(events, 'team1', 15);

      expect(points[0].offensiveTeam).toBe('team1');
      expect(points[0].possessionType).toBe('hold');

      expect(points[1].offensiveTeam).toBe('team2');
      expect(points[1].possessionType).toBe('break');

      // Point 3: Team 1 scored Point 2, so Team 1 pulls. Team 2 is O for Point 3.
      expect(points[2].offensiveTeam).toBe('team2');
      expect(points[2].possessionType).toBe('hold');
    });

    it('should handle halftime flip', () => {
      // gameTo = 3, halftime = 2
      const events: GameEvent[] = [
        goal('team2'), // P1: T1 O, T2 scores. Score: 0-1.
        goal('team2'), // P2: T2 O, T2 scores. Score: 0-2 (Halftime!)
        goal('team1'), // P3: T2 starts O (because T1 started game on O).
      ];

      const points = computePointByPointEvents(events, 'team1', 3);

      expect(points[1].scoreAfter.team2).toBe(2); // Halftime reached

      // Point 3: Team that started on defense (team2) receives 2nd half
      expect(points[2].offensiveTeam).toBe('team2');
    });
  });

  describe('getTurnoverSummary', () => {
    it('summarizes different turnover types', () => {
      const turnovers: any[] = [
        { type: 'block' },
        { type: 'block' },
        { type: 'throwaway' },
        { type: 'fiftyfifty' },
        { type: 'drop' },
      ];

      const summary = getTurnoverSummary(turnovers);

      expect(summary.blocks).toBe(2);
      expect(summary.throwaways).toBe(2); // throwaway + fiftyfifty
      expect(summary.drops).toBe(1);
    });
  });
});
