import { GameEvent } from '@/lib/storage';
import { getChemistryStats, getImpactStats } from '../statsUtils';

describe('Player Stats Visualization Logic', () => {
  const mockEvents: GameEvent[] = [
    // Point 1: Player A throws to Player B
    { type: 'goal', team: 'team1', goalPlayerId: 'Player B', assistPlayerId: 'Player A' },
    // Point 2: Player B throws to Player A
    { type: 'goal', team: 'team1', goalPlayerId: 'Player A', assistPlayerId: 'Player B' },
    // Point 3: Player A throws to Player C
    { type: 'goal', team: 'team1', goalPlayerId: 'Player C', assistPlayerId: 'Player A' },
    // Point 4: Player A block
    { type: 'turnover', team: 'team1', subtype: 'block', playerId: 'Player A' },
    // Point 5: Player A throwaway
    { type: 'turnover', team: 'team1', subtype: 'throwaway', playerId: 'Player A' },
    // Point 6: Player D throwaway (team max turns setter)
    { type: 'turnover', team: 'team1', subtype: 'throwaway', playerId: 'Player D' },
    { type: 'turnover', team: 'team1', subtype: 'throwaway', playerId: 'Player D' },
  ];

  describe('getChemistryStats', () => {
    it('should correctly calculate connections for Player A', () => {
      const stats = getChemistryStats('Player A', mockEvents, 'team1');

      // Player A threw to Player B (1 assist) and Player C (1 assist)
      // Player A caught from Player B (1 goal)

      const bStats = stats.find((s) => s.playerName === 'Player B');
      expect(bStats).toBeDefined();
      expect(bStats?.assistsTo).toBe(1); // A -> B
      expect(bStats?.goalsFrom).toBe(1); // B -> A
      expect(bStats?.totalConnections).toBe(2);

      const cStats = stats.find((s) => s.playerName === 'Player C');
      expect(cStats).toBeDefined();
      expect(cStats?.assistsTo).toBe(1); // A -> C
      expect(cStats?.goalsFrom).toBe(0);
    });
  });

  describe('getImpactStats', () => {
    it('should calculate cumulative +/- correctly', () => {
      const stats = getImpactStats('Player A', mockEvents, 'team1');

      // Events for A:
      // 1. Assist B (+1) -> Cum: 1
      // 2. Goal from B (+1) -> Cum: 2
      // 3. Assist C (+1) -> Cum: 3
      // 4. Block (+1) -> Cum: 4
      // 5. Throwaway (-1) -> Cum: 3

      expect(stats.length).toBeGreaterThan(5); // Start + 5 events + End

      // Skip "Start"
      const event1 = stats.find((s) => s.description?.includes('Assist'));
      expect(event1?.cumulativePlusMinus).toBe(1);

      // Check final value (before "End" point)
      const eventLast = stats[stats.length - 2];
      // Note: The order in mockEvents is chronological.
      // 5th event involving A is the throwaway.
      expect(eventLast.cumulativePlusMinus).toBe(3);
    });

    it('uses the point-start score for all impact events in that point', () => {
      const pointAlignedEvents: GameEvent[] = [
        { type: 'goal', team: 'team1', goalPlayerId: 'Teammate', assistPlayerId: 'Other' }, // 1-0
        { type: 'turnover', team: 'team1', subtype: 'block', playerId: 'Player A' },
        { type: 'goal', team: 'team1', goalPlayerId: 'Teammate', assistPlayerId: 'Player A' }, // 2-0
      ];

      const stats = getImpactStats('Player A', pointAlignedEvents, 'team1');
      const block = stats.find((s) => s.description === 'Block');
      const assist = stats.find((s) => s.description === 'Assist');

      expect(block?.score).toBe('1-0');
      expect(assist?.score).toBe('1-0');
    });

    it('merges a same-point block and goal into a single callahan event', () => {
      const callahanEvents: GameEvent[] = [
        { type: 'goal', team: 'team2', goalPlayerId: 'Opponent', assistPlayerId: 'Opponent' }, // 0-1
        { type: 'turnover', team: 'team1', subtype: 'block', playerId: 'Player A' },
        { type: 'goal', team: 'team1', goalPlayerId: 'Player A', assistPlayerId: 'OTHER_TEAM' }, // 1-1
      ];

      const stats = getImpactStats('Player A', callahanEvents, 'team1');
      const impactEvents = stats.filter(
        (s) => s.description && s.description !== 'Start' && s.description !== 'End',
      );
      const callahan = impactEvents.find((s) => s.description === 'Callahan');
      const block = impactEvents.find((s) => s.description === 'Block');

      expect(impactEvents).toHaveLength(1);
      expect(callahan?.cumulativePlusMinus).toBe(2);
      expect(callahan?.score).toBe('0-1');
      expect(block).toBeUndefined();
    });

    it('does not carry a block across points when detecting callahans', () => {
      const splitPointEvents: GameEvent[] = [
        { type: 'turnover', team: 'team1', subtype: 'block', playerId: 'Player A' },
        { type: 'goal', team: 'team1', goalPlayerId: 'Teammate', assistPlayerId: 'Teammate' }, // 1-0
        { type: 'goal', team: 'team1', goalPlayerId: 'Player A', assistPlayerId: 'OTHER_TEAM' }, // 2-0
      ];

      const stats = getImpactStats('Player A', splitPointEvents, 'team1');
      const impactEvents = stats.filter(
        (s) => s.description && s.description !== 'Start' && s.description !== 'End',
      );
      const descriptions = impactEvents.map((s) => s.description);

      expect(descriptions).toEqual(['Block', 'Goal']);
      expect(impactEvents[0]?.score).toBe('0-0');
      expect(impactEvents[1]?.score).toBe('1-0');
    });
  });
});
