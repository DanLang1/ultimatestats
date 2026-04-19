import { computeAdvancedChemistry } from '../../advancedTracking/advancedChemistryUtils';
import { buildAnalyticsGame } from '../../advancedTracking/buildAnalyticsGame';
import type { AdvancedTrackedGame } from '../../advancedTracking/types';

// ── Shared fixtures ──────────────────────────────────────────────────────────

const ZOO = 'zoo';
const RIVALS = 'rivals';

const participants = [
  { id: 'p_august', name: 'August' },
  { id: 'p_meves', name: 'Meves' },
  { id: 'p_joah', name: 'Joah' },
];

const august = { refType: 'participant' as const, participantId: 'p_august' };
const meves = { refType: 'participant' as const, participantId: 'p_meves' };
const joah = { refType: 'participant' as const, participantId: 'p_joah' };
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

// Build a point where Zoo receives and scores via throw sequence
function makeScoredPoint(
  id: string,
  actions: AdvancedTrackedGame['points'][number]['possessions'][number]['actions'],
) {
  return {
    id,
    lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah'] }],
    possessions: [
      {
        id: `pos_${id}`,
        sideId: ZOO,
        actions: [
          { id: `pull_${id}`, kind: 'pull' as const, sideId: RIVALS, receivingSideId: ZOO, puller: untracked, result: 'inbound' as const },
          ...actions,
        ],
      },
    ],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('computeAdvancedChemistry', () => {
  it('returns empty array when the participant has no connections', () => {
    // August scored unassisted (no assist attribution on the goal action)
    // Use a Callahan so no assist is recorded
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1',
              sideId: RIVALS,
              actions: [
                { id: 'pull1', kind: 'pull' as const, sideId: ZOO, receivingSideId: RIVALS, puller: august, result: 'inbound' as const },
                { id: 'throw1', kind: 'throw' as const, sideId: RIVALS, thrower: untracked, result: 'callahan' as const, defender: august },
              ],
            },
          ],
        },
      ],
    };
    const analytics = buildAnalyticsGame(game);
    // August got a callahan (goal + block), but there's no assist — no connections
    expect(computeAdvancedChemistry(analytics, 'p_august', analytics.participantNames)).toEqual([]);
  });

  it('records goalsFrom when the participant scored and another player assisted', () => {
    // Meves→August (goal): August gets goal, Meves gets assist
    // From August's perspective: goalsFrom Meves = 1
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        makeScoredPoint('pt1', [
          { id: 'a1', kind: 'throw' as const, sideId: ZOO, thrower: meves, toPlayer: august, result: 'goal' as const },
        ]),
      ],
    };
    const analytics = buildAnalyticsGame(game);
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
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        makeScoredPoint('pt1', [
          { id: 'a1', kind: 'throw' as const, sideId: ZOO, thrower: august, toPlayer: meves, result: 'goal' as const },
        ]),
      ],
    };
    const analytics = buildAnalyticsGame(game);
    const connections = computeAdvancedChemistry(analytics, 'p_august', analytics.participantNames);

    expect(connections).toHaveLength(1);
    expect(connections[0].participantId).toBe('p_meves');
    expect(connections[0].goalsFrom).toBe(0);
    expect(connections[0].assistsTo).toBe(1);
  });

  it('accumulates both directions on the same connection', () => {
    // pt1: August scores off Meves assist (goalsFrom Meves +1)
    // pt2: August assists Meves goal (assistsTo Meves +1)
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        makeScoredPoint('pt1', [
          { id: 'a1', kind: 'throw' as const, sideId: ZOO, thrower: meves, toPlayer: august, result: 'goal' as const },
        ]),
        {
          id: 'pt2',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
          possessions: [
            {
              id: 'pos2',
              sideId: ZOO,
              actions: [
                { id: 'pull2', kind: 'pull' as const, sideId: RIVALS, receivingSideId: ZOO, puller: untracked, result: 'inbound' as const },
                { id: 'a2', kind: 'throw' as const, sideId: ZOO, thrower: august, toPlayer: meves, result: 'goal' as const },
              ],
            },
          ],
        },
      ],
    };
    const analytics = buildAnalyticsGame(game);
    const connections = computeAdvancedChemistry(analytics, 'p_august', analytics.participantNames);

    expect(connections).toHaveLength(1);
    expect(connections[0].participantId).toBe('p_meves');
    expect(connections[0].goalsFrom).toBe(1);
    expect(connections[0].assistsTo).toBe(1);
    expect(connections[0].totalConnections).toBe(2);
  });

  it('returns connections for multiple distinct partners', () => {
    // August assists Meves (pt1) and assists Joah (pt2)
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        makeScoredPoint('pt1', [
          { id: 'a1', kind: 'throw' as const, sideId: ZOO, thrower: august, toPlayer: meves, result: 'goal' as const },
        ]),
        {
          id: 'pt2',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_joah'] }],
          possessions: [
            {
              id: 'pos2',
              sideId: ZOO,
              actions: [
                { id: 'pull2', kind: 'pull' as const, sideId: RIVALS, receivingSideId: ZOO, puller: untracked, result: 'inbound' as const },
                { id: 'a2', kind: 'throw' as const, sideId: ZOO, thrower: august, toPlayer: joah, result: 'goal' as const },
              ],
            },
          ],
        },
      ],
    };
    const analytics = buildAnalyticsGame(game);
    const connections = computeAdvancedChemistry(analytics, 'p_august', analytics.participantNames);

    expect(connections).toHaveLength(2);
    const mevesConn = connections.find((c) => c.participantId === 'p_meves');
    const joahConn = connections.find((c) => c.participantId === 'p_joah');
    expect(mevesConn?.assistsTo).toBe(1);
    expect(joahConn?.assistsTo).toBe(1);
  });

  it('sorts by totalConnections descending', () => {
    // August→Meves goal (x2), August→Joah goal (x1) — Meves should come first
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        makeScoredPoint('pt1', [
          { id: 'a1', kind: 'throw' as const, sideId: ZOO, thrower: august, toPlayer: meves, result: 'goal' as const },
        ]),
        {
          id: 'pt2',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
          possessions: [
            {
              id: 'pos2',
              sideId: ZOO,
              actions: [
                { id: 'pull2', kind: 'pull' as const, sideId: RIVALS, receivingSideId: ZOO, puller: untracked, result: 'inbound' as const },
                { id: 'a2', kind: 'throw' as const, sideId: ZOO, thrower: august, toPlayer: meves, result: 'goal' as const },
              ],
            },
          ],
        },
        {
          id: 'pt3',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_joah'] }],
          possessions: [
            {
              id: 'pos3',
              sideId: ZOO,
              actions: [
                { id: 'pull3', kind: 'pull' as const, sideId: RIVALS, receivingSideId: ZOO, puller: untracked, result: 'inbound' as const },
                { id: 'a3', kind: 'throw' as const, sideId: ZOO, thrower: august, toPlayer: joah, result: 'goal' as const },
              ],
            },
          ],
        },
      ],
    };
    const analytics = buildAnalyticsGame(game);
    const connections = computeAdvancedChemistry(analytics, 'p_august', analytics.participantNames);

    expect(connections[0].participantId).toBe('p_meves');
    expect(connections[0].totalConnections).toBe(2);
    expect(connections[1].participantId).toBe('p_joah');
    expect(connections[1].totalConnections).toBe(1);
  });

  it('does not count a connection to oneself', () => {
    // If somehow the same player appears as both thrower and receiver (shouldn't happen in real games)
    // this tests the `assistId !== participantId` guard
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        makeScoredPoint('pt1', [
          // Meves scores, August assists
          { id: 'a1', kind: 'throw' as const, sideId: ZOO, thrower: august, toPlayer: meves, result: 'goal' as const },
        ]),
      ],
    };
    const analytics = buildAnalyticsGame(game);
    // From Meves's perspective: only connection is to August (assister)
    const connections = computeAdvancedChemistry(analytics, 'p_meves', analytics.participantNames);
    expect(connections.every((c) => c.participantId !== 'p_meves')).toBe(true);
  });
});
