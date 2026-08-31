import { defineAdvancedGameTestContext } from '@/test/fixtures/advancedGameBuilder';

import {
  computeAdvancedChemistry,
  computeAdvancedPassConnections,
  getVisibleAdvancedChemistryMode,
} from '../advancedChemistryUtils';
import { buildAnalyticsGame } from '../buildAnalyticsGame';
import type { AdvancedTrackedGame, PlayerRef } from '../types';

// ── Shared fixtures ──────────────────────────────────────────────────────────

const ZOO = 'zoo';
const RIVALS = 'rivals';

const chemistryFixtures = defineAdvancedGameTestContext({
  id: 'g1',
  createdAt: 0,
  updatedAt: 0,
  status: 'final',
  focusSideId: ZOO,
  initialReceivingSideId: ZOO,
  sides: [
    { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
    { id: RIVALS, label: 'Rivals', trackingMode: 'anonymous' },
  ],
  players: {
    august: { id: 'p_august', name: 'August' },
    meves: { id: 'p_meves', name: 'Meves' },
    joah: { id: 'p_joah', name: 'Joah' },
  },
  defaultLines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah'] }],
});

const { august, meves, joah } = chemistryFixtures.players;
const untracked = chemistryFixtures.untracked;
const baseGame = chemistryFixtures.fixture();

describe('getVisibleAdvancedChemistryMode', () => {
  it('keeps scoring when scoring chemistry is available', () => {
    expect(getVisibleAdvancedChemistryMode('scoring', true, true)).toBe('scoring');
    expect(getVisibleAdvancedChemistryMode('scoring', true, false)).toBe('scoring');
  });

  it('keeps passing when pass connections are available', () => {
    expect(getVisibleAdvancedChemistryMode('passing', true, true)).toBe('passing');
    expect(getVisibleAdvancedChemistryMode('passing', false, true)).toBe('passing');
  });

  it('falls back to passing when scoring is requested but only passing has data', () => {
    expect(getVisibleAdvancedChemistryMode('scoring', false, true)).toBe('passing');
  });

  it('falls back to scoring when passing is requested but only scoring has data', () => {
    expect(getVisibleAdvancedChemistryMode('passing', true, false)).toBe('scoring');
  });

  it('keeps the requested mode when neither mode has data', () => {
    expect(getVisibleAdvancedChemistryMode('scoring', false, false)).toBe('scoring');
    expect(getVisibleAdvancedChemistryMode('passing', false, false)).toBe('passing');
  });
});

function chemistryScenario(id: string, initialReceivingSideId = ZOO) {
  return chemistryFixtures
    .scenario({ id, initialReceivingSideId })
    .startPoint({ puller: untracked });
}

function makeScoredPoint(id: string, thrower: PlayerRef, scorer: PlayerRef) {
  return chemistryScenario(id).goal(scorer, { thrower }).buildPoint();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('computeAdvancedChemistry', () => {
  it('returns empty array when the participant has no connections', () => {
    // August scored unassisted (no assist attribution on the goal action)
    // Use a Callahan so no assist is recorded
    const analytics = chemistryFixtures
      .scenario({ initialReceivingSideId: RIVALS })
      .startPoint({
        lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
        puller: august,
      })
      .callahan(august, { thrower: untracked })
      .buildAnalytics();
    // August got a callahan (goal + block), but there's no assist — no connections
    expect(computeAdvancedChemistry(analytics, 'p_august', analytics.participantNames)).toEqual([]);
  });

  it('records goalsFrom when the participant scored and another player assisted', () => {
    // Meves→August (goal): August gets goal, Meves gets assist
    // From August's perspective: goalsFrom Meves = 1
    const analytics = chemistryFixtures.analyticsFromPoints([
      makeScoredPoint('pt1', meves, august),
    ]);
    const connections = computeAdvancedChemistry(analytics, 'p_august', analytics.participantNames);

    expect(connections).toHaveLength(1);
    expect(connections[0].participantId).toBe('p_meves');
    expect(connections[0].participantName).toBe('Meves');
    expect(connections[0].goalsFrom).toBe(1);
    expect(connections[0].assistsTo).toBe(0);
  });

  it('records assistsTo when the participant assisted and another player scored', () => {
    // August→Meves (goal): Meves scores, August assists
    // From August's perspective: assistsTo Meves = 1
    const analytics = chemistryFixtures.analyticsFromPoints([
      makeScoredPoint('pt1', august, meves),
    ]);
    const connections = computeAdvancedChemistry(analytics, 'p_august', analytics.participantNames);

    expect(connections).toHaveLength(1);
    expect(connections[0].participantId).toBe('p_meves');
    expect(connections[0].goalsFrom).toBe(0);
    expect(connections[0].assistsTo).toBe(1);
  });

  it('accumulates both directions on the same connection', () => {
    // pt1: August scores off Meves assist (goalsFrom Meves +1)
    // pt2: August assists Meves goal (assistsTo Meves +1)
    const analytics = chemistryFixtures.analyticsFromPoints([
      makeScoredPoint('pt1', meves, august),
      makeScoredPoint('pt2', august, meves),
    ]);
    const connections = computeAdvancedChemistry(analytics, 'p_august', analytics.participantNames);

    expect(connections).toHaveLength(1);
    expect(connections[0].participantId).toBe('p_meves');
    expect(connections[0].goalsFrom).toBe(1);
    expect(connections[0].assistsTo).toBe(1);
    expect(connections[0].totalConnections).toBe(2);
  });

  it('returns connections for multiple distinct partners', () => {
    // August assists Meves (pt1) and assists Joah (pt2)
    const analytics = chemistryFixtures.analyticsFromPoints([
      makeScoredPoint('pt1', august, meves),
      makeScoredPoint('pt2', august, joah),
    ]);
    const connections = computeAdvancedChemistry(analytics, 'p_august', analytics.participantNames);

    expect(connections).toHaveLength(2);
    const mevesConn = connections.find((c) => c.participantId === 'p_meves');
    const joahConn = connections.find((c) => c.participantId === 'p_joah');
    expect(mevesConn?.assistsTo).toBe(1);
    expect(joahConn?.assistsTo).toBe(1);
  });

  it('sorts by totalConnections descending', () => {
    // August→Meves goal (x2), August→Joah goal (x1) — Meves should come first
    const analytics = chemistryFixtures.analyticsFromPoints([
      makeScoredPoint('pt1', august, meves),
      makeScoredPoint('pt2', august, meves),
      makeScoredPoint('pt3', august, joah),
    ]);
    const connections = computeAdvancedChemistry(analytics, 'p_august', analytics.participantNames);

    expect(connections[0].participantId).toBe('p_meves');
    expect(connections[0].totalConnections).toBe(2);
    expect(connections[1].participantId).toBe('p_joah');
    expect(connections[1].totalConnections).toBe(1);
  });

  it('does not count a connection to oneself', () => {
    // If somehow the same player appears as both thrower and receiver (shouldn't happen in real games)
    // this tests the `assistId !== participantId` guard
    const analytics = chemistryFixtures.analyticsFromPoints([
      makeScoredPoint('pt1', august, meves),
    ]);
    // From Meves's perspective: only connection is to August (assister)
    const connections = computeAdvancedChemistry(analytics, 'p_meves', analytics.participantNames);
    expect(connections.every((c) => c.participantId !== 'p_meves')).toBe(true);
  });
});

describe('computeAdvancedPassConnections', () => {
  it('counts completed pass connections in both directions', () => {
    const analytics = chemistryFixtures.analyticsFromPoints([
      chemistryScenario('pt1')
        .complete(august, { thrower: meves })
        .complete(joah, { thrower: august })
        .goal(meves, { thrower: august })
        .buildPoint(),
    ]);
    const connections = computeAdvancedPassConnections(
      analytics,
      'p_august',
      analytics.participantNames,
    );

    const mevesConn = connections.find((connection) => connection.participantId === 'p_meves');
    const joahConn = connections.find((connection) => connection.participantId === 'p_joah');

    expect(mevesConn).toMatchObject({
      participantName: 'Meves',
      caughtFrom: 1,
      threwTo: 1,
      totalPasses: 2,
    });
    expect(joahConn).toMatchObject({
      participantName: 'Joah',
      caughtFrom: 0,
      threwTo: 1,
      totalPasses: 1,
    });
  });

  it('ignores incomplete throws and unknown passing partners', () => {
    const unknown = { refType: 'unknown' as const };
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
                  result: 'throwaway' as const,
                },
              ],
            },
            {
              id: 'pos3',
              sideId: ZOO,
              actions: [
                {
                  id: 'pickup1',
                  kind: 'disc_pickup' as const,
                  sideId: ZOO,
                  player: august,
                },
                {
                  id: 'a3',
                  kind: 'throw' as const,
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: unknown,
                  result: 'complete' as const,
                },
                {
                  id: 'a4',
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
    const connections = computeAdvancedPassConnections(
      analytics,
      'p_august',
      analytics.participantNames,
    );

    expect(connections).toHaveLength(1);
    expect(connections[0]).toMatchObject({
      participantId: 'p_meves',
      caughtFrom: 0,
      threwTo: 1,
      totalPasses: 1,
    });
  });

  it('sorts by total completed passes descending', () => {
    const analytics = chemistryFixtures.analyticsFromPoints([
      chemistryScenario('pt1')
        .complete(joah, { thrower: august })
        .complete(meves, { thrower: august })
        .complete(august, { thrower: meves })
        .goal(meves, { thrower: august })
        .buildPoint(),
    ]);
    const connections = computeAdvancedPassConnections(
      analytics,
      'p_august',
      analytics.participantNames,
    );

    expect(connections[0].participantId).toBe('p_meves');
    expect(connections[0].totalPasses).toBe(3);
    expect(connections[1].participantId).toBe('p_joah');
    expect(connections[1].totalPasses).toBe(1);
  });
});

describe('side-filtered connections', () => {
  const switchingSidesGame: AdvancedTrackedGame = {
    ...baseGame,
    gameType: 'scrimmage',
    sides: [
      { id: ZOO, label: 'Light', trackingMode: 'full-roster' },
      { id: RIVALS, label: 'Dark', trackingMode: 'full-roster' },
    ],
    points: [
      {
        id: 'pt_light',
        lines: [
          { sideId: ZOO, participantIds: ['p_august', 'p_meves'] },
          { sideId: RIVALS, participantIds: ['p_joah'] },
        ],
        possessions: [
          {
            id: 'pos_light',
            sideId: ZOO,
            actions: [
              {
                id: 'pull_light',
                kind: 'pull',
                sideId: RIVALS,
                receivingSideId: ZOO,
                puller: joah,
                receiver: august,
                result: 'inbound',
              },
              {
                id: 'goal_light',
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
        id: 'pt_dark',
        lines: [
          { sideId: ZOO, participantIds: ['p_joah'] },
          { sideId: RIVALS, participantIds: ['p_august', 'p_meves'] },
        ],
        possessions: [
          {
            id: 'pos_dark',
            sideId: RIVALS,
            actions: [
              {
                id: 'pull_dark',
                kind: 'pull',
                sideId: ZOO,
                receivingSideId: RIVALS,
                puller: joah,
                receiver: august,
                result: 'inbound',
              },
              {
                id: 'goal_dark',
                kind: 'throw',
                sideId: RIVALS,
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

  it('limits scoring chemistry to the selected side', () => {
    const analytics = buildAnalyticsGame(switchingSidesGame);
    const overall = computeAdvancedChemistry(analytics, 'p_august', analytics.participantNames);
    const light = computeAdvancedChemistry(analytics, 'p_august', analytics.participantNames, ZOO);
    const dark = computeAdvancedChemistry(
      analytics,
      'p_august',
      analytics.participantNames,
      RIVALS,
    );

    expect(overall[0].assistsTo).toBe(2);
    expect(light[0].assistsTo).toBe(1);
    expect(dark[0].assistsTo).toBe(1);
  });

  it('limits completed-pass connections to the selected side', () => {
    const analytics = buildAnalyticsGame(switchingSidesGame);
    const overall = computeAdvancedPassConnections(
      analytics,
      'p_august',
      analytics.participantNames,
    );
    const light = computeAdvancedPassConnections(
      analytics,
      'p_august',
      analytics.participantNames,
      ZOO,
    );
    const dark = computeAdvancedPassConnections(
      analytics,
      'p_august',
      analytics.participantNames,
      RIVALS,
    );

    expect(overall[0].threwTo).toBe(2);
    expect(light[0].threwTo).toBe(1);
    expect(dark[0].threwTo).toBe(1);
  });
});
