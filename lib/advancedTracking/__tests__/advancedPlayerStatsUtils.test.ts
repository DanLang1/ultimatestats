import {
  computeAdvancedPlayerStats,
  computeAdvancedPlayerStatsForParticipant,
} from '../advancedPlayerStatsUtils';
import type { AnalyticsGame, AnalyticsPoint, AttributionType, PointState } from '../analyticsTypes';
import { buildAnalyticsGame } from '../buildAnalyticsGame';
import type { AdvancedTrackedGame, PlayerRef } from '../types';

// ── Shared fixtures ──────────────────────────────────────────────────────────

const ZOO = 'Zoo';
const RIVALS = 'rivals';

const participants = [
  { id: 'p_august', name: 'August' },
  { id: 'p_meves', name: 'Meves' },
  { id: 'p_joah', name: 'Joah' },
  { id: 'p_max', name: 'Max' },
];

const august: PlayerRef = { refType: 'participant', participantId: 'p_august' };
const meves: PlayerRef = { refType: 'participant', participantId: 'p_meves' };
const joah: PlayerRef = { refType: 'participant', participantId: 'p_joah' };
const max: PlayerRef = { refType: 'participant', participantId: 'p_max' };
const untracked: PlayerRef = { refType: 'untracked' };

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

function findStats(stats: ReturnType<typeof computeAdvancedPlayerStats>, participantId: string) {
  const playerStats = stats.find((candidate) => candidate.participantId === participantId);
  if (!playerStats) throw new Error(`No stats found for ${participantId}`);
  return playerStats;
}

interface PointOutcomeFixture {
  state: PointState;
  receivingSideId: string;
  scoringSideId: string | null;
}

interface PointPlusMinusCase extends PointOutcomeFixture {
  name: string;
  scoringSideId: string;
  zooValue: number;
  rivalValue: number;
}

function getFixtureCleanHold(state: PointState): boolean | null {
  if (state === 'terminated' || state === 'in_progress') return null;
  return state === 'hold' || state === 'opp_hold';
}

function createPointOutcomeAnalyticsGame(fixtures: PointOutcomeFixture[]): AnalyticsGame {
  const points: AnalyticsPoint[] = fixtures.map((fixture, index) => {
    return {
      id: `pt${index + 1}`,
      pointIndex: index + 1,
      half: 1,
      receivingSideId: fixture.receivingSideId,
      pullingSideId: fixture.receivingSideId === ZOO ? RIVALS : ZOO,
      scoringSideId: fixture.scoringSideId,
      state: fixture.state,
      linesBySide: {
        [ZOO]: ['p_august'],
        [RIVALS]: ['p_rival1'],
      },
      scoresBySide: { [ZOO]: 0, [RIVALS]: 0 },
      durationMs: null,
      isCleanHold: getFixtureCleanHold(fixture.state),
    };
  });

  return {
    gameType: 'scrimmage',
    focusSideId: ZOO,
    oppSideId: RIVALS,
    initialReceivingSideId: ZOO,
    sideLabels: { [ZOO]: 'Zoo', [RIVALS]: 'Rivals' },
    participantNames: new Map([
      ['p_august', 'August'],
      ['p_rival1', 'Rival1'],
    ]),
    createdAt: 0,
    points,
    possessions: [],
    actions: [],
    attributions: [],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('advancedPlayerStatsUtils', () => {
  describe('point plus/minus', () => {
    const cases: PointPlusMinusCase[] = [
      {
        name: 'hold',
        state: 'hold',
        receivingSideId: ZOO,
        scoringSideId: ZOO,
        zooValue: 0.5,
        rivalValue: -0.5,
      },
      {
        name: 'broken',
        state: 'broken',
        receivingSideId: ZOO,
        scoringSideId: RIVALS,
        zooValue: -1,
        rivalValue: 1,
      },
      {
        name: 'break',
        state: 'break',
        receivingSideId: RIVALS,
        scoringSideId: ZOO,
        zooValue: 1,
        rivalValue: -1,
      },
      {
        name: 'opponent hold',
        state: 'opp_hold',
        receivingSideId: RIVALS,
        scoringSideId: RIVALS,
        zooValue: -0.5,
        rivalValue: 0.5,
      },
    ];

    it.each(cases)(
      'weights $name correctly from either side perspective',
      ({ state, receivingSideId, scoringSideId, zooValue, rivalValue }) => {
        const game = createPointOutcomeAnalyticsGame([{ state, receivingSideId, scoringSideId }]);
        const stats = computeAdvancedPlayerStats(game);

        expect(findStats(stats, 'p_august').pointPlusMinus).toBe(zooValue);
        expect(findStats(stats, 'p_rival1').pointPlusMinus).toBe(rivalValue);
      },
    );

    it('accumulates outcomes and preserves half-point values', () => {
      const game = createPointOutcomeAnalyticsGame([
        { state: 'hold', receivingSideId: ZOO, scoringSideId: ZOO },
        { state: 'hold', receivingSideId: ZOO, scoringSideId: ZOO },
        { state: 'break', receivingSideId: RIVALS, scoringSideId: ZOO },
        { state: 'opp_hold', receivingSideId: RIVALS, scoringSideId: RIVALS },
      ]);
      const stats = findStats(computeAdvancedPlayerStats(game), 'p_august');

      expect(stats.pointPlusMinus).toBe(1.5);
      expect(stats.plusMinus).toBe(0);
    });

    it('does not score terminated or in-progress points', () => {
      const game = createPointOutcomeAnalyticsGame([
        { state: 'terminated', receivingSideId: ZOO, scoringSideId: null },
        { state: 'in_progress', receivingSideId: RIVALS, scoringSideId: null },
      ]);
      const stats = findStats(computeAdvancedPlayerStats(game), 'p_august');

      expect(stats.pointsPlayed).toBe(2);
      expect(stats.pointPlusMinus).toBe(0);
    });
  });

  describe('pull summary', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: RIVALS,
              actions: [
                {
                  id: 'pull1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  result: 'inbound',
                  hangTimeMs: 6000,
                },
                {
                  id: 'goal1',
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
        {
          id: 'pt2',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos2',
              sideId: RIVALS,
              actions: [
                {
                  id: 'pull2',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  result: 'ob',
                  hangTimeMs: 8000,
                },
                {
                  id: 'goal2',
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
        {
          id: 'pt3',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos3',
              sideId: RIVALS,
              actions: [
                {
                  id: 'pull3',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  result: 'roller',
                  hangTimeMs: 9000,
                },
                {
                  id: 'goal3',
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
        {
          id: 'pt4',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos4',
              sideId: RIVALS,
              actions: [
                {
                  id: 'pull4',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  result: 'dropped',
                },
              ],
            },
          ],
        },
      ],
    };

    it('computes outcomes and hangtime from tracked pulls', () => {
      const stats = findStats(computeAdvancedPlayerStats(buildAnalyticsGame(game)), 'p_august');

      expect(stats.pulls).toBe(4);
      expect(stats.inboundPulls).toBe(2);
      expect(stats.outOfBoundsPulls).toBe(1);
      expect(stats.droppedPulls).toBe(1);
      expect(stats.rollerPulls).toBe(1);
      expect(stats.avgPullHangTimeMs).toBe(6000);
      expect(stats.maxPullHangTimeMs).toBe(6000);
      expect(stats.minPullHangTimeMs).toBe(6000);
    });
  });

  describe('clean offensive hold', () => {
    // August catches pull → August→Meves (complete) → Meves→Joah (complete) → Joah→Max (goal)
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_max', 'p_joah'] }],
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
                  result: 'complete',
                },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: joah,
                  result: 'complete',
                },
                {
                  id: 'a4',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: joah,
                  toPlayer: max,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedPlayerStats(analytics);

    it('Max gets 1 goal, 1 reception', () => {
      const s = findStats(stats, 'p_max');
      expect(s.goals).toBe(1);
      expect(s.receptions).toBe(1);
    });

    it('Joah gets 1 assist, 1 completion, 1 reception', () => {
      const s = findStats(stats, 'p_joah');
      expect(s.assists).toBe(1);
      expect(s.completions).toBe(1);
      expect(s.receptions).toBe(1);
    });

    it('Meves gets hockey assist, 1 completion, 1 reception', () => {
      const s = findStats(stats, 'p_meves');
      expect(s.hockeyAssists).toBe(1);
      expect(s.assists).toBe(0);
      expect(s.completions).toBe(1);
      expect(s.receptions).toBe(1);
    });

    it('August gets 1 completion, 1 pull reception, 0 receptions, 0 hockey assists', () => {
      // August is 2 throws before the goal — too far back for a hockey assist
      const s = findStats(stats, 'p_august');
      expect(s.completions).toBe(1);
      expect(s.pullReceptions).toBe(1);
      expect(s.receptions).toBe(0);
      expect(s.hockeyAssists).toBe(0);
    });

    it('completion pct', () => {
      expect(findStats(stats, 'p_august').completionPct).toBeCloseTo(1.0); // 1/1
      expect(findStats(stats, 'p_meves').completionPct).toBeCloseTo(1.0); // 1/1
      expect(findStats(stats, 'p_joah').completionPct).toBeCloseTo(1.0); // 1/1
      expect(findStats(stats, 'p_max').completionPct).toBeNull(); // 0 attempts
    });

    it('total touches', () => {
      // August: 0 receptions + 0 disc_pickup + 1 pull_reception = 1
      expect(findStats(stats, 'p_august').totalTouches).toBe(1);
      // Meves: 1 reception = 1
      expect(findStats(stats, 'p_meves').totalTouches).toBe(1);
      // Joah: 1 reception = 1
      expect(findStats(stats, 'p_joah').totalTouches).toBe(1);
      // Max: 1 reception = 1
      expect(findStats(stats, 'p_max').totalTouches).toBe(1);
    });

    it('points played = 1 for all players on the line', () => {
      expect(findStats(stats, 'p_august').pointsPlayed).toBe(1);
      expect(findStats(stats, 'p_meves').pointsPlayed).toBe(1);
      expect(findStats(stats, 'p_max').pointsPlayed).toBe(1);
    });

    it('O-points = 1 (Zoo received)', () => {
      expect(findStats(stats, 'p_august').oPoints).toBe(1);
      expect(findStats(stats, 'p_august').dPoints).toBe(0);
    });

    it('plus/minus', () => {
      expect(findStats(stats, 'p_august').plusMinus).toBe(0); // 0+0+0-0-0
      expect(findStats(stats, 'p_meves').plusMinus).toBe(0); // hockey assist doesn't count
      expect(findStats(stats, 'p_joah').plusMinus).toBe(1); // 0+1+0-0-0
      expect(findStats(stats, 'p_max').plusMinus).toBe(1); // 1+0+0-0-0
    });
  });

  describe('throwaway', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
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
                { id: 'a2', kind: 'throw', sideId: ZOO, thrower: august, result: 'throwaway' },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedPlayerStats(analytics);

    it('August gets 1 throwaway, 50% completion', () => {
      const s = findStats(stats, 'p_august');
      expect(s.throwaways).toBe(1);
      expect(s.throwAttempts).toBe(1);
      expect(s.completionPct).toBeCloseTo(0);
    });

    it('August plus/minus = -1', () => {
      expect(findStats(stats, 'p_august').plusMinus).toBe(-1);
    });
  });

  describe('split attribution (50/50 drop)', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
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
                  result: 'drop',
                  splitAttribution: true,
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedPlayerStats(analytics);

    it('August gets 0.5 throwaway, Meves gets 0.5 drop', () => {
      expect(findStats(stats, 'p_august').throwaways).toBeCloseTo(0.5);
      expect(findStats(stats, 'p_meves').drops).toBeCloseTo(0.5);
    });

    it('plus/minus reflects split weights', () => {
      // August: 0+0+0 - 0.5 - 0 = -0.5
      expect(findStats(stats, 'p_august').plusMinus).toBeCloseTo(-0.5);
      // Meves: 0+0+0 - 0 - 0.5 = -0.5
      expect(findStats(stats, 'p_meves').plusMinus).toBeCloseTo(-0.5);
    });
  });

  describe('pressure', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: RIVALS,
              actions: [
                {
                  id: 'pull1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
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
          ],
        },
      ],
    };

    const stats = computeAdvancedPlayerStats(buildAnalyticsGame(game));

    it('counts one pressure worth half a plus/minus point', () => {
      const s = findStats(stats, 'p_august');
      expect(s.pressures).toBe(1);
      expect(s.blocks).toBe(0);
      expect(s.plusMinus).toBe(0.5);
    });
  });

  describe('callahan', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_max'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
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
    const stats = computeAdvancedPlayerStats(analytics);

    it('Max gets callahan, goal, and block', () => {
      const s = findStats(stats, 'p_max');
      expect(s.callahans).toBe(1);
      expect(s.goals).toBe(1);
      expect(s.blocks).toBe(1);
    });

    it('August gets 1 pull', () => {
      expect(findStats(stats, 'p_august').pulls).toBe(1);
    });

    it('D-points = 1 for Zoo players (Zoo was pulling)', () => {
      expect(findStats(stats, 'p_august').dPoints).toBe(1);
      expect(findStats(stats, 'p_august').oPoints).toBe(0);
    });
  });

  describe('multi-point game — O/D split', () => {
    // Pt1: Zoo receives (O-point) and scores
    // Pt2: Zoo pulls (D-point) and opponent scores
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: ZOO,
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
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        {
          id: 'pt2',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos2',
              sideId: RIVALS,
              actions: [
                {
                  id: 'b1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'b2',
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
    const stats = computeAdvancedPlayerStats(analytics);

    it('August has 2 points played, 1 O and 1 D', () => {
      const s = findStats(stats, 'p_august');
      expect(s.pointsPlayed).toBe(2);
      expect(s.oPoints).toBe(1);
      expect(s.dPoints).toBe(1);
    });

    it('August has 2 pulls total (1 each point where he pulled)', () => {
      // Pt1: untracked pulled. Pt2: August pulled.
      expect(findStats(stats, 'p_august').pulls).toBe(1);
    });
  });

  describe('sideId filter', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      sides: [
        { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
        { id: RIVALS, label: 'Rivals', trackingMode: 'full-roster' },
      ],
      participants: [...participants, { id: 'p_rival1', name: 'Rival1' }],
      points: [
        {
          id: 'pt1',
          lines: [
            { sideId: ZOO, participantIds: ['p_august'] },
            { sideId: RIVALS, participantIds: ['p_rival1'] },
          ],
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
                  puller: { refType: 'participant', participantId: 'p_rival1' },
                  receiver: august,
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
              ],
            },
          ],
        },
      ],
    };

    it('returns only Zoo players when sideId=Zoo', () => {
      const analytics = buildAnalyticsGame(game);
      const stats = computeAdvancedPlayerStats(analytics, ZOO);
      const ids = stats.map((s) => s.participantId);
      expect(ids).toContain('p_august');
      expect(ids).not.toContain('p_rival1');
    });

    it('returns only Rivals players when sideId=Rivals', () => {
      const analytics = buildAnalyticsGame(game);
      const stats = computeAdvancedPlayerStats(analytics, RIVALS);
      const ids = stats.map((s) => s.participantId);
      expect(ids).toContain('p_rival1');
      expect(ids).not.toContain('p_august');
    });

    it('filters attributions by point-side when the game is a scrimmage', () => {
      const scrimmageGame: AdvancedTrackedGame = {
        ...baseGame,
        gameType: 'scrimmage',
        sides: [
          { id: ZOO, label: 'White', trackingMode: 'full-roster' },
          { id: RIVALS, label: 'Dark', trackingMode: 'full-roster' },
        ],
        participants: [...participants, { id: 'p_rival1', name: 'Rival1' }],
        initialReceivingSideId: ZOO,
        points: [
          {
            id: 'pt1',
            lines: [
              { sideId: ZOO, participantIds: ['p_august', 'p_meves'] },
              { sideId: RIVALS, participantIds: ['p_rival1'] },
            ],
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
                    puller: { refType: 'participant', participantId: 'p_rival1' },
                    receiver: august,
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
                ],
              },
            ],
          },
          {
            id: 'pt2',
            lines: [
              { sideId: ZOO, participantIds: ['p_meves'] },
              { sideId: RIVALS, participantIds: ['p_august', 'p_rival1'] },
            ],
            possessions: [
              {
                id: 'pos2',
                sideId: RIVALS,
                actions: [
                  {
                    id: 'b1',
                    kind: 'pull',
                    sideId: ZOO,
                    receivingSideId: RIVALS,
                    puller: meves,
                    receiver: august,
                    result: 'inbound',
                  },
                  {
                    id: 'b2',
                    kind: 'throw',
                    sideId: RIVALS,
                    thrower: august,
                    toPlayer: { refType: 'participant', participantId: 'p_rival1' },
                    result: 'goal',
                  },
                ],
              },
            ],
          },
        ],
      };

      const analytics = buildAnalyticsGame(scrimmageGame);

      const zooStats = findStats(computeAdvancedPlayerStats(analytics, ZOO), 'p_august');
      expect(zooStats.assists).toBe(1);
      expect(zooStats.goals).toBe(0);
      expect(zooStats.oPoints).toBe(1);
      expect(zooStats.dPoints).toBe(0);

      const rivalsStats = findStats(computeAdvancedPlayerStats(analytics, RIVALS), 'p_august');
      expect(rivalsStats.assists).toBe(1);
      expect(rivalsStats.goals).toBe(0);
      expect(rivalsStats.oPoints).toBe(1);
      expect(rivalsStats.dPoints).toBe(0);

      const overallStats = findStats(computeAdvancedPlayerStats(analytics), 'p_august');
      expect(overallStats.assists).toBe(2);
      expect(overallStats.pointsPlayed).toBe(2);
    });
  });

  describe('stall — does not count as a throw attempt', () => {
    // August: 2 completions, 2 throwaways, 1 stall = 5 disc actions, 4 throw attempts
    // completionPct should be 50%, NOT 40% (stall must not inflate throwAttempts)
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah'] }],
          possessions: [
            {
              // ZOO possession 1: August completes twice, then throwaway
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
                  result: 'complete',
                },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: august,
                  result: 'complete',
                },
                {
                  id: 'a4',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'complete',
                },
                {
                  id: 'a5',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: august,
                  result: 'complete',
                },
                { id: 'a6', kind: 'throw', sideId: ZOO, thrower: august, result: 'throwaway' },
              ],
            },
            {
              // RIVALS possession: block gives disc back to ZOO
              id: 'pos2',
              sideId: RIVALS,
              actions: [
                {
                  id: 'b1',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'block',
                  defender: joah,
                },
              ],
            },
            {
              // ZOO possession 2: August throwaway
              id: 'pos3',
              sideId: ZOO,
              actions: [
                { id: 'c1', kind: 'disc_pickup', sideId: ZOO, player: august },
                { id: 'c2', kind: 'throw', sideId: ZOO, thrower: august, result: 'throwaway' },
              ],
            },
            {
              // RIVALS possession: block gives disc back to ZOO
              id: 'pos4',
              sideId: RIVALS,
              actions: [
                {
                  id: 'd1',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'block',
                  defender: joah,
                },
              ],
            },
            {
              // ZOO possession 3: August gets stalled — game ends
              id: 'pos5',
              sideId: ZOO,
              actions: [
                { id: 'e1', kind: 'disc_pickup', sideId: ZOO, player: august },
                { id: 'e2', kind: 'throw', sideId: ZOO, thrower: august, result: 'stall' },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedPlayerStats(analytics);

    it('August has 4 throw attempts (stall excluded), 2 completions, 50% completion pct', () => {
      const s = findStats(stats, 'p_august');
      expect(s.throwAttempts).toBe(4);
      expect(s.completions).toBe(2);
      expect(s.completionPct).toBeCloseTo(0.5);
    });

    it('August has 1 stallsConceded (was stalled out)', () => {
      expect(findStats(stats, 'p_august').stallsConceded).toBe(1);
      expect(findStats(stats, 'p_august').stalls).toBe(0);
    });

    it('throw attempts + stallsConceded = 5 total disc actions', () => {
      const s = findStats(stats, 'p_august');
      expect(s.throwAttempts + s.stallsConceded).toBe(5);
    });
  });

  describe('computeAdvancedPlayerStatsForParticipant', () => {
    it('returns stats for a specific participant', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
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
                    result: 'goal',
                  },
                ],
              },
            ],
          },
        ],
      };

      const analytics = buildAnalyticsGame(game);
      const s = computeAdvancedPlayerStatsForParticipant(analytics, 'p_meves');
      expect(s.goals).toBe(1);
      expect(s.assists).toBe(0);
    });

    it('returns empty stats for unknown participant', () => {
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
      const s = computeAdvancedPlayerStatsForParticipant(analytics, 'p_unknown');
      expect(s.goals).toBe(0);
      expect(s.pointsPlayed).toBe(0);
      expect(s.pointPlusMinus).toBe(0);
    });
  });

  describe('timing stats', () => {
    it('computes playing time when timestamps present', () => {
      const game: AdvancedTrackedGame = {
        ...baseGame,
        points: [
          {
            id: 'pt1',
            startedAt: 1000,
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
                    recordedAt: 1000,
                  },
                  {
                    id: 'a2',
                    kind: 'throw',
                    sideId: ZOO,
                    thrower: august,
                    toPlayer: meves,
                    result: 'goal',
                    recordedAt: 61000, // 60 seconds later
                  },
                ],
              },
            ],
          },
        ],
      };

      const analytics = buildAnalyticsGame(game);
      const stats = computeAdvancedPlayerStats(analytics);
      const s = findStats(stats, 'p_august');
      expect(s.pointDurationMs).toBe(60000);
      expect(s.playingTimePct).toBeCloseTo(1.0); // Only point in game
    });

    it('returns null when no timing data', () => {
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
      const stats = computeAdvancedPlayerStats(analytics);
      const s = findStats(stats, 'p_august');
      expect(s.pointDurationMs).toBeNull();
      expect(s.playingTimePct).toBeNull();
    });
  });

  describe('comprehensive all-stats fixture', () => {
    // A 6-point game designed to exercise every attribution type.
    // Players: August, Meves, Joah, Max, Sam
    const participantsAll = [
      { id: 'p_august', name: 'August' },
      { id: 'p_meves', name: 'Meves' },
      { id: 'p_joah', name: 'Joah' },
      { id: 'p_max', name: 'Max' },
      { id: 'p_sam', name: 'Sam' },
    ];

    const augustAll: PlayerRef = { refType: 'participant', participantId: 'p_august' };
    const mevesAll: PlayerRef = { refType: 'participant', participantId: 'p_meves' };
    const joahAll: PlayerRef = { refType: 'participant', participantId: 'p_joah' };
    const maxAll: PlayerRef = { refType: 'participant', participantId: 'p_max' };
    const untrackedAll: PlayerRef = { refType: 'untracked' };

    const game: AdvancedTrackedGame = {
      id: 'g_all_stats',
      schemaVersion: 1,
      createdAt: 0,
      updatedAt: 0,
      gameType: 'game',
      status: 'final',
      focusSideId: ZOO,
      initialReceivingSideId: ZOO,
      settings: { locationMode: 'none' },
      sides: [
        { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
        { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
      ],
      participants: participantsAll,
      points: [
        // Pt1 — O-point hold: pull reception, completions, goal, assist, hockey assist
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
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
                  puller: untrackedAll,
                  receiver: augustAll,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: augustAll,
                  toPlayer: mevesAll,
                  result: 'complete',
                },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: mevesAll,
                  toPlayer: joahAll,
                  result: 'complete',
                },
                {
                  id: 'a4',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: joahAll,
                  toPlayer: maxAll,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        // Pt2 — D-point break: pull, block, disc pickup, goal
        {
          id: 'pt2',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
          possessions: [
            {
              id: 'pos2a',
              sideId: RIVALS,
              actions: [
                {
                  id: 'b1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: augustAll,
                  receiver: untrackedAll,
                  result: 'inbound',
                },
                {
                  id: 'b2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untrackedAll,
                  result: 'block',
                  defender: joahAll,
                },
              ],
            },
            {
              id: 'pos2b',
              sideId: ZOO,
              actions: [
                { id: 'b3', kind: 'disc_pickup', sideId: ZOO, player: mevesAll },
                {
                  id: 'b4',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: mevesAll,
                  toPlayer: maxAll,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        // Pt3 — O-point broken: drop (clean), turnover, opponent goal
        {
          id: 'pt3',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
          possessions: [
            {
              id: 'pos3a',
              sideId: ZOO,
              actions: [
                {
                  id: 'c1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untrackedAll,
                  receiver: augustAll,
                  result: 'inbound',
                },
                {
                  id: 'c2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: augustAll,
                  toPlayer: mevesAll,
                  result: 'drop',
                },
              ],
            },
            {
              id: 'pos3b',
              sideId: RIVALS,
              actions: [
                { id: 'c3', kind: 'disc_pickup', sideId: RIVALS, player: untrackedAll },
                {
                  id: 'c4',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untrackedAll,
                  toPlayer: untrackedAll,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        // Pt4 — D-point hold (opp hold): split attribution drop, stall on tracked player
        {
          id: 'pt4',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
          possessions: [
            {
              id: 'pos4a',
              sideId: RIVALS,
              actions: [
                {
                  id: 'd1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: augustAll,
                  receiver: untrackedAll,
                  result: 'inbound',
                },
                {
                  id: 'd2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untrackedAll,
                  toPlayer: untrackedAll,
                  result: 'stall',
                  defender: joahAll,
                },
              ],
            },
            {
              id: 'pos4b',
              sideId: ZOO,
              actions: [
                { id: 'd3', kind: 'disc_pickup', sideId: ZOO, player: mevesAll },
                {
                  id: 'd4',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: mevesAll,
                  toPlayer: maxAll,
                  result: 'drop',
                  splitAttribution: true,
                },
              ],
            },
            {
              id: 'pos4c',
              sideId: RIVALS,
              actions: [
                { id: 'd5', kind: 'disc_pickup', sideId: RIVALS, player: untrackedAll },
                {
                  id: 'd6',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untrackedAll,
                  toPlayer: untrackedAll,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        // Pt5 — D-point break: callahan
        {
          id: 'pt5',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
          possessions: [
            {
              id: 'pos5',
              sideId: RIVALS,
              actions: [
                {
                  id: 'e1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: augustAll,
                  receiver: untrackedAll,
                  result: 'inbound',
                },
                {
                  id: 'e2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untrackedAll,
                  result: 'callahan',
                  defender: maxAll,
                },
              ],
            },
          ],
        },
        // Pt6 — O-point: stall on tracked player (August) to cover stall_conceded
        {
          id: 'pt6',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
          possessions: [
            {
              id: 'pos6a',
              sideId: ZOO,
              actions: [
                {
                  id: 'f1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untrackedAll,
                  receiver: augustAll,
                  result: 'inbound',
                },
                {
                  id: 'f2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: augustAll,
                  toPlayer: mevesAll,
                  result: 'complete',
                },
                {
                  id: 'f3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: mevesAll,
                  result: 'stall',
                  defender: joahAll,
                },
              ],
            },
            {
              id: 'pos6b',
              sideId: RIVALS,
              actions: [
                { id: 'f4', kind: 'disc_pickup', sideId: RIVALS, player: untrackedAll },
                {
                  id: 'f5',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untrackedAll,
                  toPlayer: untrackedAll,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const analytics = buildAnalyticsGame(game);
    const stats = computeAdvancedPlayerStats(analytics);

    it('covers all attribution types across the fixture', () => {
      // Ensure every attribution type is represented at least once
      const allTypes = new Set(analytics.attributions.map((a) => a.type));
      const expectedTypes = [
        'goal',
        'assist',
        'hockey_assist',
        'completion',
        'throw_attempt',
        'receiving_touch',
        'throwaway',
        'drop',
        'stall',
        'stall_conceded',
        'block',
        'callahan',
        'pull',
        'pull_reception',
        'disc_pickup',
      ];
      for (const t of expectedTypes as AttributionType[]) {
        expect(allTypes.has(t)).toBe(true);
      }
    });

    it('August stats are correct', () => {
      const s = findStats(stats, 'p_august');
      expect(s.pulls).toBe(3); // pt2, pt4, pt5
      expect(s.pullReceptions).toBe(3); // pt1, pt3, pt6
      expect(s.completions).toBe(2); // pt1 a2, pt6 f2
      expect(s.throwAttempts).toBe(3); // pt1 a2, pt3 c2, pt6 f2
      expect(s.throwaways).toBe(0);
      expect(s.drops).toBe(0);
      expect(s.goals).toBe(0);
      expect(s.assists).toBe(0);
      expect(s.hockeyAssists).toBe(0);
      expect(s.blocks).toBe(0);
      expect(s.callahans).toBe(0);
      expect(s.stallsConceded).toBe(0);
      expect(s.stalls).toBe(0);
      expect(s.receptions).toBe(0);
      expect(s.pointsPlayed).toBe(6);
      expect(s.oPoints).toBe(3); // pt1, pt3, pt6
      expect(s.dPoints).toBe(3); // pt2, pt4, pt5
      // 2 holds (+1), 1 break (+1), 1 broken (-1), 2 opponent holds (-1)
      expect(s.pointPlusMinus).toBe(0);
      expect(s.plusMinus).toBe(0);
    });

    it('Meves stats are correct', () => {
      const s = findStats(stats, 'p_meves');
      expect(s.completions).toBe(2); // pt1 a3 (complete), pt2 b4 (goal)
      // throwAttempts: pt1 a3 (complete), pt2 b4 (goal), pt4 d4 (split drop)
      // pt6 f3 is a stall — stalls do NOT count as throw attempts
      expect(s.throwAttempts).toBe(3);
      expect(s.throwaways).toBeCloseTo(0.5); // pt4 split drop
      expect(s.drops).toBe(1); // pt3 clean drop
      expect(s.hockeyAssists).toBe(1); // pt1 a3 is hockey assist to a4
      expect(s.assists).toBe(1); // pt2 b4
      expect(s.goals).toBe(0);
      expect(s.receptions).toBe(2); // pt1 a2, pt6 f2
      expect(s.stallsConceded).toBe(1); // pt6 f3
      expect(s.pointsPlayed).toBe(6);
    });

    it('Joah stats are correct', () => {
      const s = findStats(stats, 'p_joah');
      expect(s.assists).toBe(1); // pt1 a4
      expect(s.completions).toBe(1); // pt1 a4
      expect(s.receptions).toBe(1); // pt1 a3
      expect(s.blocks).toBe(1); // pt2 b2
      expect(s.stalls).toBe(2); // pt4 d2, pt6 f3
      expect(s.goals).toBe(0);
      expect(s.pointsPlayed).toBe(6);
    });

    it('Max stats are correct', () => {
      const s = findStats(stats, 'p_max');
      expect(s.goals).toBe(3); // pt1 a4, pt2 b4, pt5 e2 callahan
      expect(s.receptions).toBe(2); // pt1 a4, pt2 b4
      expect(s.callahans).toBe(1); // pt5 e2
      expect(s.blocks).toBe(1); // pt5 e2 (callahan implies block)
      expect(s.drops).toBeCloseTo(0.5); // pt4 d4 split
      expect(s.pointsPlayed).toBe(6);
    });

    it('team stats are derivable from the fixture', () => {
      expect(analytics.points).toHaveLength(6);
      const stateCounts = new Map<string, number>();
      for (const p of analytics.points) {
        stateCounts.set(p.state, (stateCounts.get(p.state) ?? 0) + 1);
      }
      expect(stateCounts.get('hold')).toBe(2);
      expect(stateCounts.get('break')).toBe(1);
      expect(stateCounts.get('broken')).toBe(1);
      expect(stateCounts.get('opp_hold')).toBe(2);
    });
  });
});
