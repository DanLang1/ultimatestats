import { GameEvent, TurnoverType } from '@/store/gameStore.types';
import { Player, PointLineRecord, SavedGame } from '../storage/types';
import {
  computePlayerStats,
  formatDateForCSV,
  generateAggregateCSV,
  generateCurrentGameCSV,
} from '../statsUtils';

describe('statsUtils', () => {
  const goal = (
    team: 'team1' | 'team2',
    goalPlayerId: string,
    assistPlayerId: string,
    elapsedMs?: number,
  ): GameEvent => ({
    type: 'goal',
    team,
    goalPlayerId,
    assistPlayerId,
    elapsedMs,
  });

  const turnover = (
    team: 'team1' | 'team2',
    subtype: TurnoverType,
    playerId: string,
  ): GameEvent => ({
    type: 'turnover',
    team,
    subtype,
    playerId,
    player2Id: null,
  });

  const makePlayer = (id: string): Player => ({
    id,
    name: id,
    isActive: true,
    matchingType: null,
    role: null,
  });

  const makeSavedGame = (params: {
    id: string;
    createdAt: number;
    startingPossession: 'team1' | 'team2';
    events: GameEvent[];
    pointLines?: PointLineRecord[];
    roster?: Player[];
    team1Score: number;
    team2Score: number;
  }): SavedGame => ({
    id: params.id,
    schemaVersion: 2,
    createdAt: params.createdAt,
    team1: {
      id: 'team1-id',
      name: 'My Team',
      roster: params.roster ?? [makePlayer('Alice'), makePlayer('Bob')],
    },
    team2Name: 'Opponent',
    team1Score: params.team1Score,
    team2Score: params.team2Score,
    events: params.events,
    gameTo: 15,
    gameLength: 0,
    startingPossession: params.startingPossession,
    pointLines: params.pointLines,
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

    it('handles fifty-fifty turnovers with half-credit/half-penalty correctly', () => {
      const events: GameEvent[] = [
        {
          type: 'turnover',
          team: 'team1',
          subtype: 'fiftyfifty',
          playerId: 'Thrower',
          player2Id: 'Receiver',
        },
      ];

      const stats = computePlayerStats(events, 'team1');
      const thrower = stats.find((p) => p.name === 'Thrower');
      const receiver = stats.find((p) => p.name === 'Receiver');

      expect(thrower?.throwaways).toBe(0.5);
      expect(thrower?.plusMinus).toBe(-0.5);
      expect(receiver?.drops).toBe(0.5);
      expect(receiver?.plusMinus).toBe(-0.5);
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

    it('includes playing-time columns and line-only players when point lines exist', () => {
      const events: GameEvent[] = [goal('team1', 'Alice', 'Bob')];
      const pointLines: PointLineRecord[] = [
        {
          pointNumber: 1,
          playerIds: ['Alice', 'Bob', 'Charlie'],
          timestamp: 1,
        },
      ];

      const csv = generateCurrentGameCSV(
        events,
        'My Team',
        'Opponent',
        'team1',
        15,
        undefined,
        pointLines,
      );

      expect(csv).toContain(
        'Player,Goals,Assists,Blocks,Throwaways,Drops,Plus/Minus,Points Played,O-Points,D-Points,O-Line Holds,D-Line Breaks,Minutes Played,O-Eff,D-Eff',
      );
      expect(csv).toContain('Alice,1,0,0,0,0,1,1,1,0,1,0,-,100%,-');
      expect(csv).toContain('Bob,0,1,0,0,0,1,1,1,0,1,0,-,100%,-');
      expect(csv).toContain('Charlie,0,0,0,0,0,0,1,1,0,1,0,-,100%,-');
    });

    it('computes O-Eff and D-Eff from raw hold/break counts in mixed O/D samples', () => {
      const events: GameEvent[] = [
        goal('team1', 'Alice', 'Bob'), // Point 1: team1 O hold
        goal('team1', 'Alice', 'Bob'), // Point 2: team1 D break
        goal('team2', 'Opponent', 'Opponent'), // Point 3: team1 D hold against
        goal('team2', 'Opponent', 'Opponent'), // Point 4: team1 O broken
      ];
      const pointLines: PointLineRecord[] = [
        { pointNumber: 1, playerIds: ['Alice'], timestamp: 1 },
        { pointNumber: 2, playerIds: ['Alice'], timestamp: 2 },
        { pointNumber: 3, playerIds: ['Alice'], timestamp: 3 },
        { pointNumber: 4, playerIds: ['Alice'], timestamp: 4 },
      ];

      const csv = generateCurrentGameCSV(
        events,
        'My Team',
        'Opponent',
        'team1',
        15,
        undefined,
        pointLines,
      );

      // O-points=2, O-line holds=1 -> 50%
      // D-points=2, D-line breaks=1 -> 50%
      expect(csv).toContain('Alice,2,0,0,0,0,2,4,2,2,1,1,-,50%,50%');
    });

    it('shows "-" efficiency when denominator is zero (O-only or D-only participation)', () => {
      const events: GameEvent[] = [
        goal('team1', 'OffenseOnly', 'OffenseOnlyAssist'), // Point 1: team1 O hold
        goal('team1', 'DefenseOnly', 'DefenseOnlyAssist'), // Point 2: team1 D break
      ];
      const pointLines: PointLineRecord[] = [
        { pointNumber: 1, playerIds: ['OffenseOnly'], timestamp: 1 },
        { pointNumber: 2, playerIds: ['DefenseOnly'], timestamp: 2 },
      ];

      const csv = generateCurrentGameCSV(
        events,
        'My Team',
        'Opponent',
        'team1',
        15,
        undefined,
        pointLines,
      );

      expect(csv).toContain('OffenseOnly,1,0,0,0,0,1,1,1,0,1,0,-,100%,-');
      expect(csv).toContain('DefenseOnly,1,0,0,0,0,1,1,0,1,0,1,-,-,100%');
    });
  });

  describe('generateAggregateCSV', () => {
    it('aggregates raw hold/break counts and efficiency math across multiple games', () => {
      const roster = [makePlayer('Alice'), makePlayer('Bob')];
      const games: SavedGame[] = [
        makeSavedGame({
          id: 'g1',
          createdAt: 1,
          startingPossession: 'team1',
          events: [
            goal('team1', 'Alice', 'Bob', 60_000), // O hold
            goal('team1', 'Alice', 'Bob', 120_000), // D break
          ],
          pointLines: [
            { pointNumber: 1, playerIds: ['Alice'], timestamp: 1 },
            { pointNumber: 2, playerIds: ['Alice'], timestamp: 2 },
          ],
          roster,
          team1Score: 2,
          team2Score: 0,
        }),
        makeSavedGame({
          id: 'g2',
          createdAt: 2,
          startingPossession: 'team2',
          events: [
            goal('team2', 'Opponent', 'Opponent', 30_000), // D hold against
            goal('team2', 'Opponent', 'Opponent', 90_000), // O broken
          ],
          pointLines: [
            { pointNumber: 1, playerIds: ['Alice'], timestamp: 3 },
            { pointNumber: 2, playerIds: ['Alice'], timestamp: 4 },
          ],
          roster,
          team1Score: 0,
          team2Score: 2,
        }),
      ];

      const csv = generateAggregateCSV(games, 'My Team', roster);

      expect(csv).toContain(
        'Player,Goals,Assists,Blocks,Throwaways,Drops,Plus/Minus,Points Played,O-Points,D-Points,O-Line Holds,D-Line Breaks,Minutes Played,O-Eff,D-Eff',
      );
      // Totals: O=2, D=2, O-holds=1, D-breaks=1 => O-Eff 50%, D-Eff 50%
      // Minutes: 60s + 120s + 30s + 90s = 300s => 5:00
      expect(csv).toContain('Alice,2,0,0,0,0,2,4,2,2,1,1,5:00,50%,50%');
    });

    it('omits playing-time columns when no games include point lines', () => {
      const games: SavedGame[] = [
        makeSavedGame({
          id: 'g1',
          createdAt: 1,
          startingPossession: 'team1',
          events: [goal('team1', 'Alice', 'Bob')],
          team1Score: 1,
          team2Score: 0,
        }),
      ];

      const csv = generateAggregateCSV(games, 'My Team');

      expect(csv).toContain('# Combined Player Summary');
      expect(csv).toContain('Player,Goals,Assists,Blocks,Throwaways,Drops,Plus/Minus');
      expect(csv).not.toContain('Points Played');
    });

    it('handles empty game lists without NaN/Infinity in output', () => {
      const csv = generateAggregateCSV([], 'My Team');

      expect(csv).toContain('# Aggregated Stats: My Team (0 games)');
      expect(csv).not.toMatch(/NaN|Infinity/);
    });
  });
});
