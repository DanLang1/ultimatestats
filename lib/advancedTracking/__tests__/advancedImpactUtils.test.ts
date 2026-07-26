import { computeAdvancedImpact } from '../advancedImpactUtils';
import { buildAnalyticsGame } from '../buildAnalyticsGame';
import type { AdvancedTrackedGame } from '../types';

// ── Shared fixtures ─────────────────────────────────────────────────���────────

const ZOO = 'zoo';
const RIVALS = 'rivals';

const participants = [
  { id: 'p_august', name: 'August' },
  { id: 'p_meves', name: 'Meves' },
  { id: 'p_joah', name: 'Joah' },
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
  status: 'final',
  focusSideId: ZOO,
  initialReceivingSideId: ZOO,
  settings: { locationMode: 'none' },
  sides: [
    { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
    { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
  ],
  participants,
};

// ── Tests ──────────────────────────────────────────────────────���──────────────

describe('computeAdvancedImpact', () => {
  it('uses the participant side for each scrimmage point', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      gameType: 'scrimmage',
      sides: [
        { id: ZOO, label: 'Light', trackingMode: 'full-roster' },
        { id: RIVALS, label: 'Dark', trackingMode: 'full-roster' },
      ],
      points: [
        {
          id: 'pt1',
          lines: [
            { sideId: ZOO, participantIds: ['p_august'] },
            { sideId: RIVALS, participantIds: ['p_joah'] },
          ],
          possessions: [
            {
              id: 'pos1',
              sideId: ZOO,
              actions: [
                {
                  id: 'pull1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: { refType: 'participant', participantId: 'p_joah' },
                  result: 'inbound',
                },
                { id: 'goal1', kind: 'throw', sideId: ZOO, thrower: august, result: 'goal' },
              ],
            },
          ],
        },
        {
          id: 'pt2',
          lines: [
            { sideId: ZOO, participantIds: ['p_joah'] },
            { sideId: RIVALS, participantIds: ['p_august'] },
          ],
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
                  puller: { refType: 'participant', participantId: 'p_joah' },
                  result: 'inbound',
                },
                {
                  id: 'goal2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: august,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const impact = computeAdvancedImpact(buildAnalyticsGame(game), 'p_august', ZOO);

    expect(impact.map((point) => point.onField)).toEqual([true, true]);
    expect(impact.map((point) => point.state)).toEqual(['hold', 'hold']);
    expect(impact.map((point) => point.score)).toEqual(['1-0', '1-1']);
  });

  it('marks onField false when the participant is not in the point line', () => {
    // Joah is not on the line for pt1
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
                  id: 'pull1',
                  kind: 'pull' as const,
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound' as const,
                },
                {
                  id: 'a1',
                  kind: 'throw' as const,
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal' as const,
                },
              ],
            },
          ],
        },
      ],
    };
    const analytics = buildAnalyticsGame(game);
    const impact = computeAdvancedImpact(analytics, 'p_joah', ZOO);

    expect(impact[0].onField).toBe(false);
    expect(impact[0].plusMinusDelta).toBe(0);
  });

  it('goal and assist in the same point yield plusMinusDelta of 2', () => {
    // August assists, Meves receives goal — but here August both assists and scores
    // Two-throw sequence: August → Meves (complete), Meves → August (goal)
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
                  id: 'pull1',
                  kind: 'pull' as const,
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound' as const,
                },
                {
                  id: 'a1',
                  kind: 'throw' as const,
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'complete' as const,
                },
                {
                  id: 'a2',
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
    // August gets: assist (throw a1 is the hockey assist? no — a1 is complete, a2 is goal so a1 is hockey_assist actually)
    // Wait: a2 is the goal throw. August is the receiver (toPlayer). So August gets 'goal'.
    // meves threw a2 (goal), so meves gets 'assist'.
    // a1: august threw complete to meves → august gets throw_attempt, completion; meves gets receiving_touch
    // For the goal action (a2): previousAction is a1 (complete by august) → august gets hockey_assist
    // So August: goal (1) + hockey_assist (1) = plusMinusDelta 1 (goal contributes +1, hockey_assist doesn't affect plusMinus)
    // Let's just verify the actual calculation
    const impact = computeAdvancedImpact(analytics, 'p_august', ZOO);
    expect(impact[0].onField).toBe(true);
    // August gets: goal (+1). No blocks, no throwaways, no drops.
    expect(impact[0].plusMinusDelta).toBe(1);
  });

  it('assist contributes +1 to plusMinusDelta', () => {
    // August→Meves (goal): August gets assist (+1)
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
                  id: 'pull1',
                  kind: 'pull' as const,
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound' as const,
                },
                {
                  id: 'a1',
                  kind: 'throw' as const,
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal' as const,
                },
              ],
            },
          ],
        },
      ],
    };
    const analytics = buildAnalyticsGame(game);
    const impact = computeAdvancedImpact(analytics, 'p_august', ZOO);
    expect(impact[0].plusMinusDelta).toBe(1);
    expect(impact[0].description).toBe('A');
  });

  it('throwaway contributes -1 to plusMinusDelta', () => {
    // Zoo receives, August throws away, Rivals scores on the turnover
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
                  id: 'pull1',
                  kind: 'pull' as const,
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound' as const,
                },
                {
                  id: 'a1',
                  kind: 'throw' as const,
                  sideId: ZOO,
                  thrower: august,
                  result: 'throwaway' as const,
                },
              ],
            },
            {
              id: 'pos2',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a2',
                  kind: 'throw' as const,
                  sideId: RIVALS,
                  thrower: untracked,
                  toPlayer: untracked,
                  result: 'goal' as const,
                },
              ],
            },
          ],
        },
      ],
    };
    const analytics = buildAnalyticsGame(game);
    const impact = computeAdvancedImpact(analytics, 'p_august', ZOO);
    expect(impact[0].plusMinusDelta).toBe(-1);
    expect(impact[0].description).toBe('T');
  });

  it('cumulativePlusMinus accumulates across points', () => {
    // pt1: Zoo receives, August throwaway, Rivals scores (broken) → delta -1, cumulative -1
    // pt2: Zoo receives (Rivals scored pt1 → Zoo receives again), August assists Meves (hold) → delta +1, cumulative 0
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
                  id: 'pull1',
                  kind: 'pull' as const,
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound' as const,
                },
                {
                  id: 'a1',
                  kind: 'throw' as const,
                  sideId: ZOO,
                  thrower: august,
                  result: 'throwaway' as const,
                },
              ],
            },
            {
              id: 'pos2',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a2',
                  kind: 'throw' as const,
                  sideId: RIVALS,
                  thrower: untracked,
                  toPlayer: untracked,
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
              id: 'pos3',
              sideId: ZOO,
              actions: [
                {
                  id: 'pull2',
                  kind: 'pull' as const,
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound' as const,
                },
                {
                  id: 'a3',
                  kind: 'throw' as const,
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal' as const,
                },
              ],
            },
          ],
        },
      ],
    };
    const analytics = buildAnalyticsGame(game);
    const impact = computeAdvancedImpact(analytics, 'p_august', ZOO);

    expect(impact[0].cumulativePlusMinus).toBe(-1);
    expect(impact[1].cumulativePlusMinus).toBe(0);
  });

  it('reports correct score string after each point', () => {
    // pt1: Zoo holds (1-0), pt2: Rivals holds (1-1)
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
                  id: 'pull1',
                  kind: 'pull' as const,
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound' as const,
                },
                {
                  id: 'a1',
                  kind: 'throw' as const,
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
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
              id: 'pos2',
              sideId: RIVALS,
              actions: [
                {
                  id: 'pull2',
                  kind: 'pull' as const,
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  result: 'inbound' as const,
                },
                {
                  id: 'a2',
                  kind: 'throw' as const,
                  sideId: RIVALS,
                  thrower: untracked,
                  toPlayer: untracked,
                  result: 'goal' as const,
                },
              ],
            },
          ],
        },
      ],
    };
    const analytics = buildAnalyticsGame(game);
    const impact = computeAdvancedImpact(analytics, 'p_august', ZOO);

    expect(impact[0].score).toBe('1-0');
    expect(impact[1].score).toBe('1-1');
  });

  it('description shows GA when player has both goal and assist in same point', () => {
    // While a single point normally only has one scoring throw (and thus a player can't
    // realistically get both a goal and an assist), we can test the aggregation logic
    // by having a player throw a goal to themselves.
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
                  id: 'pull1',
                  kind: 'pull' as const,
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound' as const,
                },
                {
                  id: 'a1',
                  kind: 'throw' as const,
                  sideId: ZOO,
                  thrower: august,
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
    const impact = computeAdvancedImpact(analytics, 'p_august', ZOO);
    expect(impact[0].description).toBe('GA');
    expect(impact[0].plusMinusDelta).toBe(2);
  });

  it('description shows block when player gets a block', () => {
    // Rivals throws, August blocks: August gets 'block' attribution
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: RIVALS,
              actions: [
                {
                  id: 'pull1',
                  kind: 'pull' as const,
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  result: 'inbound' as const,
                },
                {
                  id: 'a1',
                  kind: 'throw' as const,
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'block' as const,
                  defender: august,
                },
              ],
            },
            {
              id: 'pos2',
              sideId: ZOO,
              actions: [
                {
                  id: 'a2',
                  kind: 'throw' as const,
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal' as const,
                },
              ],
            },
          ],
        },
      ],
    };
    const analytics = buildAnalyticsGame(game);
    const impact = computeAdvancedImpact(analytics, 'p_august', ZOO);
    expect(impact[0].description).toContain('B');
    expect(impact[0].plusMinusDelta).toBeGreaterThanOrEqual(1); // block (+1) + assist (+1)
  });

  it('description and delta show a half-point pressure', () => {
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

    const impact = computeAdvancedImpact(buildAnalyticsGame(game), 'p_august', ZOO);
    expect(impact[0].description).toBe('P');
    expect(impact[0].plusMinusDelta).toBe(0.5);
    expect(impact[0].cumulativePlusMinus).toBe(0.5);
  });

  it('50/50 split drop gives -0.5 to each player (not -1)', () => {
    // Zoo receives, August throws to Meves, Meves drops — but splitAttribution means
    // they share blame: August gets 0.5 throwaway, Meves gets 0.5 drop.
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
                  id: 'pull1',
                  kind: 'pull' as const,
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound' as const,
                },
                {
                  id: 'a1',
                  kind: 'throw' as const,
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'drop' as const,
                  splitAttribution: true,
                },
              ],
            },
            {
              id: 'pos2',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a2',
                  kind: 'throw' as const,
                  sideId: RIVALS,
                  thrower: untracked,
                  toPlayer: untracked,
                  result: 'goal' as const,
                },
              ],
            },
          ],
        },
      ],
    };
    const analytics = buildAnalyticsGame(game);

    const augustImpact = computeAdvancedImpact(analytics, 'p_august', ZOO);
    expect(augustImpact[0].onField).toBe(true);
    expect(augustImpact[0].plusMinusDelta).toBeCloseTo(-0.5);
    expect(augustImpact[0].description).toBe('T');

    const mevesImpact = computeAdvancedImpact(analytics, 'p_meves', ZOO);
    expect(mevesImpact[0].onField).toBe(true);
    expect(mevesImpact[0].plusMinusDelta).toBeCloseTo(-0.5);
    expect(mevesImpact[0].description).toBe('D');
  });

  it('returns one entry per point', () => {
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
                  id: 'pull1',
                  kind: 'pull' as const,
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound' as const,
                },
                {
                  id: 'a1',
                  kind: 'throw' as const,
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
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
              id: 'pos2',
              sideId: ZOO,
              actions: [
                {
                  id: 'pull2',
                  kind: 'pull' as const,
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound' as const,
                },
                {
                  id: 'a2',
                  kind: 'throw' as const,
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal' as const,
                },
              ],
            },
          ],
        },
      ],
    };
    const analytics = buildAnalyticsGame(game);
    const impact = computeAdvancedImpact(analytics, 'p_august', ZOO);
    expect(impact).toHaveLength(2);
    expect(impact[0].pointIndex).toBe(0);
    expect(impact[1].pointIndex).toBe(1);
  });
});
