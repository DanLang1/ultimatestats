import { GameEvent } from '@/store/gameStore.types';
import { computePlayerStats, formatDateForCSV, generateCurrentGameCSV } from '../statsUtils';

describe('statsUtils', () => {
  const goal = (team: 'team1' | 'team2', goal: string, assist: string): GameEvent => ({
    type: 'goal',
    team,
    goal,
    assist,
  });

  const turnover = (team: 'team1' | 'team2', subtype: any, player: string): GameEvent => ({
    type: 'turnover',
    team,
    subtype,
    player,
    player2: null,
  });

  describe('computePlayerStats', () => {
    it('aggregates stats for a player correctly', () => {
      const events: GameEvent[] = [
        goal('team1', 'Alice', 'Bob'), // Alice: 1G, Bob: 1A
        goal('team1', 'Alice', 'Charlie'), // Alice: 1G, Charlie: 1A

        // POSSESSION: Team 2 receives pull

        // Scenario: Alice (team1) commits a turnover.
        // Wait, team1 is on Defense here. Let's make it more logical.

        // Point: Team 1 scores, then pulls to Team 2.
        // Team 2 possession:
        // Charlie (Team 1) gets a block on Team 2. (Team 1 regains possession)
        turnover('team1', 'block', 'Charlie'),

        // Team 1 possession:
        // Alice (Team 1) throws it away. (Team 2 regains possession)
        turnover('team1', 'throwaway', 'Alice'),

        // Team 2 possession:
        // Team 2 throws it away (untracked player). (Team 1 regains possession)
        turnover('team2', 'throwaway', 'Opponent'),

        // Team 1 possession:
        // Bob (Team 1) drops it. (Team 2 regains possession)
        turnover('team1', 'drop', 'Bob'),

        // Team 2 scores
        goal('team2', 'Opponent', 'Opponent'),
      ];

      const stats = computePlayerStats(events, 'team1');

      const alice = stats.find((p) => p.name === 'Alice');
      expect(alice?.goals).toBe(2);
      expect(alice?.throwaways).toBe(1);
      expect(alice?.plusMinus).toBe(1); // 2G - 1TO

      const bob = stats.find((p) => p.name === 'Bob');
      expect(bob?.assists).toBe(1);
      expect(bob?.drops).toBe(1);
      expect(bob?.plusMinus).toBe(0); // 1A - 1D

      const charlie = stats.find((p) => p.name === 'Charlie');
      expect(charlie?.assists).toBe(1);
      expect(charlie?.blocks).toBe(1);
      expect(charlie?.plusMinus).toBe(2); // 1A + 1B
    });
  });

  describe('formatDateForCSV', () => {
    it('formats timestamp as 25 Dec 2023', () => {
      const date = new Date(2023, 11, 25).getTime(); // Dec 25, 2023
      expect(formatDateForCSV(date)).toBe('25 Dec 2023');
    });
  });

  describe('generateCurrentGameCSV', () => {
    it('generates a string with expected headers', () => {
      const events: GameEvent[] = [goal('team1', 'Alice', 'Bob')];

      const csv = generateCurrentGameCSV(events, 'My Team', 'Opponent', 'team1', 15);

      expect(csv).toContain('# Play-by-Play');
      expect(csv).toContain('# Player Summary');
      expect(csv).toContain('# Team Stats');
      expect(csv).toContain('Alice,1,0,0,0,0,1');
    });
  });
});
