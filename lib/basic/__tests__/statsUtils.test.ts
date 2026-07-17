import { GameEvent, TurnoverType } from '@/store/basic/gameStore.types';

import { UNKNOWN_PLAYER_ID } from '../../playerUtils';
import { CURRENT_SCHEMA_VERSION, Player, PointLineRecord, SavedGame } from '../../storage/types';
import { aggregatePlayingTimeStats } from '../playingTimeStatsUtils';
import {
  PlayerStats as ComputedPlayerStats,
  computePlayerStats,
  computeRelativePlayerStats,
  computeRelativePlayingTimeStats,
  formatDateForCSV,
  getImpactStats,
  getSelectablePlayerStatGames,
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
    schemaVersion: CURRENT_SCHEMA_VERSION,
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

    it('normalizes missing turnover player IDs to unknown', () => {
      const events: GameEvent[] = [
        {
          type: 'turnover',
          team: 'team1',
          subtype: 'block',
          playerId: null,
          player2Id: null,
        },
        {
          type: 'turnover',
          team: 'team1',
          subtype: 'throwaway',
          playerId: null,
          player2Id: null,
        },
      ];

      const stats = computePlayerStats(events, 'team1');
      const unknown = stats.find((p) => p.id === UNKNOWN_PLAYER_ID);

      expect(unknown).toBeDefined();
      expect(unknown?.name).toBe('Unknown');
      expect(unknown?.blocks).toBe(1);
      expect(unknown?.throwaways).toBe(1);
      expect(unknown?.plusMinus).toBe(0);
    });
  });

  describe('computeRelativePlayerStats', () => {
    const playerStatsFixture = (): ComputedPlayerStats[] => [
      {
        id: 'alice',
        name: 'Alice',
        goals: 3,
        assists: 4,
        blocks: 1,
        throwaways: 1,
        drops: 0,
        plusMinus: 7,
        callahans: 0,
      },
      {
        id: 'bob',
        name: 'Bob',
        goals: 1,
        assists: 2,
        blocks: 0,
        throwaways: 3,
        drops: 1,
        plusMinus: -1,
        callahans: 0,
      },
      {
        id: 'cara',
        name: 'Cara',
        goals: 2,
        assists: 0,
        blocks: 2,
        throwaways: 0,
        drops: 1,
        plusMinus: 3,
        callahans: 0,
      },
    ];

    it('computes team-average and team-max context for a player', () => {
      const metrics = computeRelativePlayerStats('alice', playerStatsFixture());

      const assists = metrics.find((m) => m.key === 'assists');
      const goals = metrics.find((m) => m.key === 'goals');
      const plusMinus = metrics.find((m) => m.key === 'plusMinus');

      expect(assists).toBeDefined();
      expect(assists?.raw).toBe(4);
      expect(assists?.teamAvg).toBeCloseTo(2); // (4 + 2 + 0) / 3
      expect(assists?.teamMax).toBe(4);
      expect(assists?.deltaFromAvg).toBeCloseTo(2);
      expect(assists?.ratioToAvg).toBeCloseTo(2);
      expect(assists?.pctOfMax).toBe(1);
      expect(assists?.rank).toBe(1);
      expect(assists?.higherIsBetter).toBe(true);

      expect(goals?.teamAvg).toBeCloseTo(2); // (3 + 1 + 2) / 3
      expect(goals?.pctOfMax).toBe(1);
      expect(plusMinus?.teamAvg).toBeCloseTo(3); // (7 - 1 + 3) / 3
      expect(plusMinus?.deltaFromAvg).toBeCloseTo(4);
      expect(plusMinus?.teamMin).toBe(-1);
      expect(plusMinus?.teamMax).toBe(7);
      // Signed pool includes negatives, so helper disables pct-of-max
      expect(plusMinus?.pctOfMax).toBeNull();
    });

    it('ranks lower-is-better metrics correctly and preserves raw arithmetic', () => {
      const metrics = computeRelativePlayerStats('cara', playerStatsFixture());

      const throwaways = metrics.find((m) => m.key === 'throwaways');
      const totalTurnovers = metrics.find((m) => m.key === 'totalTurnovers');

      expect(throwaways).toBeDefined();
      expect(throwaways?.raw).toBe(0);
      expect(throwaways?.higherIsBetter).toBe(false);
      expect(throwaways?.rank).toBe(1); // Lowest throwaways on team
      expect(throwaways?.teamAvg).toBeCloseTo(4 / 3); // 1 + 3 + 0
      expect(throwaways?.deltaFromAvg).toBeCloseTo(-(4 / 3));
      expect(throwaways?.ratioToAvg).toBe(0);
      expect(throwaways?.pctOfMax).toBe(0); // 0 / 3; UI can invert visuals later

      expect(totalTurnovers?.raw).toBe(1); // 0 TA + 1 drop
      expect(totalTurnovers?.rank).toBe(1); // values: 1,4,1 => shared first
      expect(totalTurnovers?.teamAvg).toBeCloseTo(2);
      expect(totalTurnovers?.pctOfMax).toBeCloseTo(0.25);
    });

    it('returns no event-relative metrics when the player has no tracked events', () => {
      const zeroStats: ComputedPlayerStats[] = [
        {
          id: 'alice',
          name: 'Alice',
          goals: 0,
          assists: 0,
          blocks: 0,
          throwaways: 0,
          drops: 0,
          plusMinus: 0,
          callahans: 0,
        },
        {
          id: 'bob',
          name: 'Bob',
          goals: 0,
          assists: 0,
          blocks: 0,
          throwaways: 0,
          drops: 0,
          plusMinus: 0,
          callahans: 0,
        },
      ];

      expect(computeRelativePlayerStats('alice', zeroStats)).toEqual([]);
    });

    it('returns an empty array when the player is not in the comparison pool', () => {
      expect(computeRelativePlayerStats('missing', playerStatsFixture())).toEqual([]);
      expect(computeRelativePlayerStats('missing', [])).toEqual([]);
    });

    it('excludes unknown and non-roster players from comparison metrics', () => {
      const statsWithUnknown: ComputedPlayerStats[] = [
        ...playerStatsFixture(),
        {
          id: UNKNOWN_PLAYER_ID,
          name: 'Unknown',
          goals: 20,
          assists: 20,
          blocks: 20,
          throwaways: 0,
          drops: 0,
          plusMinus: 60,
          callahans: 0,
        },
        {
          id: 'guest',
          name: 'Guest',
          goals: 10,
          assists: 10,
          blocks: 10,
          throwaways: 0,
          drops: 0,
          plusMinus: 30,
          callahans: 0,
        },
      ];
      const roster: Player[] = [
        { id: 'alice', name: 'Alice', isActive: true, matchingType: null, role: null },
        { id: 'bob', name: 'Bob', isActive: true, matchingType: null, role: null },
        { id: 'cara', name: 'Cara', isActive: true, matchingType: null, role: null },
      ];

      const metrics = computeRelativePlayerStats('alice', statsWithUnknown, roster);
      const goals = metrics.find((m) => m.key === 'goals');

      expect(goals).toBeDefined();
      expect(goals?.teamPoolSize).toBe(3);
      expect(goals?.teamMax).toBe(3);
      expect(goals?.teamAvg).toBeCloseTo(2); // alice, bob, cara only
      expect(goals?.rank).toBe(1);
    });

    it('excludes inactive players from comparison pool when pointLines provided', () => {
      const stats: ComputedPlayerStats[] = [
        ...playerStatsFixture(),
        {
          id: 'dana',
          name: 'Dana',
          goals: 0,
          assists: 0,
          blocks: 0,
          throwaways: 0,
          drops: 0,
          plusMinus: 0,
          callahans: 0,
        },
      ];
      // dana never appeared in any point line
      const pointLines: PointLineRecord[] = [
        { pointNumber: 1, playerIds: ['alice', 'bob', 'cara'], timestamp: 1 },
      ];

      const metrics = computeRelativePlayerStats('alice', stats, undefined, pointLines);
      const goals = metrics.find((m) => m.key === 'goals');

      expect(goals?.teamPoolSize).toBe(3); // dana excluded
      expect(goals?.teamAvg).toBeCloseTo(2); // (3 + 1 + 2) / 3, not / 4
    });

    it('includes all provided player stats when pointLines is not provided', () => {
      const stats: ComputedPlayerStats[] = [
        ...playerStatsFixture(),
        {
          id: 'dana',
          name: 'Dana',
          goals: 0,
          assists: 0,
          blocks: 0,
          throwaways: 0,
          drops: 0,
          plusMinus: 0,
          callahans: 0,
        },
      ];

      const metrics = computeRelativePlayerStats('alice', stats);
      const goals = metrics.find((m) => m.key === 'goals');

      expect(goals?.teamPoolSize).toBe(4); // dana included (no pointLines filter)
      expect(goals?.teamAvg).toBeCloseTo(1.5); // (3 + 1 + 2 + 0) / 4
    });
  });

  describe('getImpactStats', () => {
    it('records a self fifty-fifty turnover as a single -1 impact event', () => {
      const events: GameEvent[] = [
        {
          type: 'turnover',
          team: 'team1',
          subtype: 'fiftyfifty',
          playerId: 'Alice',
          player2Id: 'Alice',
        },
      ];

      const impact = getImpactStats('Alice', events, 'team1');

      expect(impact).toEqual([
        { eventIndex: 0, cumulativePlusMinus: 0, description: 'Start', score: '0-0' },
        { eventIndex: 1, cumulativePlusMinus: -1, description: '50/50 Self', score: '0-0' },
        { eventIndex: 2, cumulativePlusMinus: -1, description: 'End', score: '0-0' },
      ]);
    });
  });

  describe('getSelectablePlayerStatGames', () => {
    it('returns empty for missing player or games', () => {
      expect(getSelectablePlayerStatGames(null, [], 'team1')).toEqual([]);
      expect(getSelectablePlayerStatGames('Alice', null, 'team1')).toEqual([]);
      expect(getSelectablePlayerStatGames('Alice', undefined, 'team1')).toEqual([]);
    });

    it('includes games where player has impact or point-line presence', () => {
      const playerId = 'Alice';
      const games: SavedGame[] = [
        // Impact game: assist by Alice
        makeSavedGame({
          id: 'impact',
          createdAt: 3,
          startingPossession: 'team1',
          events: [goal('team1', 'Bob', playerId)],
          pointLines: [{ pointNumber: 1, playerIds: ['Bob'], timestamp: 1 }],
          roster: [makePlayer(playerId), makePlayer('Bob')],
          team1Score: 1,
          team2Score: 0,
        }),
        // Point-line-only game: Alice played but had no impact events
        makeSavedGame({
          id: 'line-only',
          createdAt: 2,
          startingPossession: 'team1',
          events: [goal('team1', 'Bob', 'Cara')],
          pointLines: [{ pointNumber: 1, playerIds: [playerId, 'Bob'], timestamp: 2 }],
          roster: [makePlayer(playerId), makePlayer('Bob'), makePlayer('Cara')],
          team1Score: 1,
          team2Score: 0,
        }),
        // Neither impact nor line presence: should be excluded
        makeSavedGame({
          id: 'excluded',
          createdAt: 1,
          startingPossession: 'team1',
          events: [goal('team1', 'Bob', 'Cara')],
          pointLines: [{ pointNumber: 1, playerIds: ['Bob', 'Cara'], timestamp: 3 }],
          roster: [makePlayer(playerId), makePlayer('Bob'), makePlayer('Cara')],
          team1Score: 1,
          team2Score: 0,
        }),
      ];

      const selectable = getSelectablePlayerStatGames(playerId, games, 'team1');
      expect(selectable.map((g) => g.id)).toEqual(['impact', 'line-only']);
    });
  });

  describe('computeRelativePlayingTimeStats', () => {
    it('returns empty when point line data is missing or player is absent', () => {
      expect(computeRelativePlayingTimeStats('alice', null, [], 'team1', 15)).toEqual([]);
      expect(computeRelativePlayingTimeStats('alice', [], [], 'team1', 15)).toEqual([]);

      const events: GameEvent[] = [goal('team1', 'Alice', 'Bob')];
      const pointLines: PointLineRecord[] = [{ pointNumber: 1, playerIds: ['Bob'], timestamp: 1 }];
      expect(computeRelativePlayingTimeStats('Alice', pointLines, events, 'team1', 15)).toEqual([]);
    });

    it('computes playing-time relative metrics with metric-specific comparison pools', () => {
      const events: GameEvent[] = [
        goal('team1', 'Alice', 'Bob'), // Point 1: team1 O hold
        goal('team2', 'Opp', 'Opp'), // Point 2: team1 D hold against
        goal('team1', 'Alice', 'Bob'), // Point 3: team1 O hold
      ];
      const pointLines: PointLineRecord[] = [
        { pointNumber: 1, playerIds: ['alice', 'bob'], timestamp: 1 },
        { pointNumber: 2, playerIds: ['alice', 'cara'], timestamp: 2 },
        { pointNumber: 3, playerIds: ['alice'], timestamp: 3 },
      ];

      const aliceMetrics = computeRelativePlayingTimeStats(
        'alice',
        pointLines,
        events,
        'team1',
        15,
      );
      const bobMetrics = computeRelativePlayingTimeStats('bob', pointLines, events, 'team1', 15);
      const caraMetrics = computeRelativePlayingTimeStats('cara', pointLines, events, 'team1', 15);

      const aliceWinRate = aliceMetrics.find((m) => m.key === 'pointWinRate');
      const aliceOEff = aliceMetrics.find((m) => m.key === 'oEfficiency');
      const aliceDEff = aliceMetrics.find((m) => m.key === 'dEfficiency');

      expect(aliceWinRate?.raw).toBeCloseTo((2 / 3) * 100);
      expect(aliceWinRate?.detail).toBe('2/3');
      expect(aliceWinRate?.teamPoolSize).toBe(3); // alice, bob, cara all played points
      expect(aliceOEff?.raw).toBe(100);
      expect(aliceOEff?.detail).toBe('2/2');
      expect(aliceOEff?.teamPoolSize).toBe(2); // alice + bob have O points

      expect(aliceDEff?.raw).toBe(0);
      expect(aliceDEff?.detail).toBe('0/1');
      expect(aliceDEff?.teamPoolSize).toBe(2); // alice + cara have D points

      const bobWinRate = bobMetrics.find((m) => m.key === 'pointWinRate');
      const bobOEff = bobMetrics.find((m) => m.key === 'oEfficiency');
      const bobDEff = bobMetrics.find((m) => m.key === 'dEfficiency');
      expect(bobWinRate?.raw).toBe(100);
      expect(bobWinRate?.detail).toBe('1/1');
      expect(bobOEff?.raw).toBe(100);
      expect(bobOEff?.detail).toBe('1/1');
      expect(bobDEff).toBeUndefined(); // no D points, metric omitted

      const caraWinRate = caraMetrics.find((m) => m.key === 'pointWinRate');
      const caraDEff = caraMetrics.find((m) => m.key === 'dEfficiency');
      expect(caraWinRate?.raw).toBe(0);
      expect(caraWinRate?.detail).toBe('0/1');
      expect(caraDEff?.raw).toBe(0);
      expect(caraDEff?.detail).toBe('0/1');
    });

    it('aggregates multi-game playing time without colliding repeated point numbers', () => {
      const roster = [makePlayer('Dan'), makePlayer('Casey')];
      const games: SavedGame[] = [
        makeSavedGame({
          id: 'g1',
          createdAt: 1,
          startingPossession: 'team1',
          events: [goal('team1', 'Dan', 'Casey'), goal('team2', 'Opponent', 'Opponent')],
          pointLines: [
            { pointNumber: 1, playerIds: ['Dan'], timestamp: 1 },
            { pointNumber: 2, playerIds: ['Casey'], timestamp: 2 },
          ],
          roster,
          team1Score: 1,
          team2Score: 1,
        }),
        makeSavedGame({
          id: 'g2',
          createdAt: 2,
          startingPossession: 'team2',
          events: [goal('team1', 'Dan', 'Casey'), goal('team2', 'Opponent', 'Opponent')],
          pointLines: [
            { pointNumber: 1, playerIds: ['Dan'], timestamp: 3 },
            { pointNumber: 2, playerIds: ['Casey'], timestamp: 4 },
          ],
          roster,
          team1Score: 1,
          team2Score: 1,
        }),
      ];

      const playingTime = aggregatePlayingTimeStats(games);
      const dan = playingTime.get('Dan');

      expect(dan?.pointsPlayed).toBe(2);
      expect(dan?.oPoints).toBe(1);
      expect(dan?.dPoints).toBe(1);
      expect(dan?.oLineHolds).toBe(1);
      expect(dan?.dLineBreaks).toBe(1);
      expect(dan?.playingTimePercent).toBe(50);
    });

    it('uses aggregate game data for relative playing-time metrics', () => {
      const games: SavedGame[] = [
        makeSavedGame({
          id: 'g1',
          createdAt: 1,
          startingPossession: 'team1',
          events: [goal('team1', 'Dan', 'Casey'), goal('team2', 'Opponent', 'Opponent')],
          pointLines: [
            { pointNumber: 1, playerIds: ['Dan'], timestamp: 1 },
            { pointNumber: 2, playerIds: ['Casey'], timestamp: 2 },
          ],
          roster: [makePlayer('Dan'), makePlayer('Casey')],
          team1Score: 1,
          team2Score: 1,
        }),
        makeSavedGame({
          id: 'g2',
          createdAt: 2,
          startingPossession: 'team2',
          events: [goal('team1', 'Dan', 'Casey'), goal('team2', 'Opponent', 'Opponent')],
          pointLines: [
            { pointNumber: 1, playerIds: ['Dan'], timestamp: 3 },
            { pointNumber: 2, playerIds: ['Casey'], timestamp: 4 },
          ],
          roster: [makePlayer('Dan'), makePlayer('Casey')],
          team1Score: 1,
          team2Score: 1,
        }),
      ];

      const flattenedPointLines = games.flatMap((game) => game.pointLines ?? []);
      const flattenedEvents = games.flatMap((game) => game.events);
      const metrics = computeRelativePlayingTimeStats(
        'Dan',
        flattenedPointLines,
        flattenedEvents,
        null,
        15,
        true,
        games,
      );

      const pointsPlayed = metrics.find((metric) => metric.key === 'pointsPlayed');
      const oEfficiency = metrics.find((metric) => metric.key === 'oEfficiency');
      const dEfficiency = metrics.find((metric) => metric.key === 'dEfficiency');

      expect(pointsPlayed?.raw).toBe(2);
      expect(oEfficiency?.detail).toBe('1/1');
      expect(dEfficiency?.detail).toBe('1/1');
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
