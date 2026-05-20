import type { AnalyticsAttribution, AnalyticsGame, AttributionType } from '../analyticsTypes';
import {
  UNKNOWN_PARTICIPANT_ID,
  buildAnalyticsGame,
  getFinalScores,
  getPointStateForSide,
} from '../buildAnalyticsGame';
import type { AdvancedTrackedGame } from '../types';

// ── Shared fixtures ──────────────────────────────────────────────────────────

const ZOO = 'Zoo';
const RIVALS = 'rivals';

const participants = [
  { id: 'p_august', name: 'August' },
  { id: 'p_meves', name: 'Meves' },
  { id: 'p_joah', name: 'Joah' },
  { id: 'p_max', name: 'Max' },
  { id: 'p_sam', name: 'Sam' },
];

const august = { refType: 'participant' as const, participantId: 'p_august' };
const meves = { refType: 'participant' as const, participantId: 'p_meves' };
const joah = { refType: 'participant' as const, participantId: 'p_joah' };
const max = { refType: 'participant' as const, participantId: 'p_max' };
const sam = { refType: 'participant' as const, participantId: 'p_sam' };
const untracked = { refType: 'untracked' as const };

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

// Helper: sum attribution weights for a player + type
function sumAttributions(
  attributions: AnalyticsAttribution[],
  participantId: string,
  type: AttributionType,
): number {
  return attributions
    .filter((c) => c.participantId === participantId && c.type === type)
    .reduce((acc, c) => acc + c.weight, 0);
}

function buildAnalyticsGameWithLog(game: AdvancedTrackedGame) {
  const analytics = buildAnalyticsGame(game);
  console.log('\n=== RAW ANALYTICS JSON ===\n');
  console.log(JSON.stringify(analytics));
  return analytics;
}

// ── Point states ─────────────────────────────────────────────────────────────

describe('point states', () => {
  it('hold — Zoo receives and scores', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: ZOO,
      points: [
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
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: max,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };
    const { points } = buildAnalyticsGameWithLog(game);
    expect(points[0].state).toBe('hold');
    expect(points[0].receivingSideId).toBe(ZOO);
  });

  it('break — Zoo pulls and scores', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
          possessions: [
            {
              id: 'pos1a',
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
                  result: 'throwaway',
                },
              ],
            },
            {
              id: 'pos1b',
              sideId: ZOO,
              actions: [
                { id: 'a3', kind: 'disc_pickup', sideId: ZOO, player: meves },
                {
                  id: 'a4',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: joah,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };
    const { points } = buildAnalyticsGameWithLog(game);
    expect(points[0].state).toBe('break');
  });

  it('broken — Zoo receives, opponent scores', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: ZOO,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
          possessions: [
            {
              id: 'pos1a',
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
            {
              id: 'pos1b',
              sideId: RIVALS,
              actions: [
                { id: 'a3', kind: 'disc_pickup', sideId: RIVALS, player: untracked },
                {
                  id: 'a4',
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
    const { points } = buildAnalyticsGameWithLog(game);
    expect(points[0].state).toBe('broken');
  });

  it('terminated — game ended mid-point, no goal recorded', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      endReason: 'weather',
      points: [
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
              ],
            },
          ],
        },
      ],
    };
    const { points, attributions } = buildAnalyticsGameWithLog(game);
    expect(points[0].state).toBe('terminated');
    // Stats within the terminated point are still valid
    expect(sumAttributions(attributions, 'p_august', 'completion')).toBe(1);
  });

  it('receiving side advances correctly across two points', () => {
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
          // Zoo scored pt1, so Rivals receive pt2
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
    const { points } = buildAnalyticsGameWithLog(game);
    expect(points[0].receivingSideId).toBe(ZOO);
    expect(points[1].receivingSideId).toBe(RIVALS); // Zoo scored, Rivals receive next
    expect(points[0].state).toBe('hold');
    expect(points[1].state).toBe('opp_hold');
  });

  it('halftime flips receiving side — pulling team at start now receives', () => {
    // Zoo receives to open. Zoo holds pt1, then Zoo holds pt2 (breaks in this case).
    // After pt2 scoring normally: Zoo scored → Rivals receive pt3.
    // But halftime after pt2 overrides: initialReceiving=Zoo, so halftime sets
    // receiving to otherSide(Zoo) = Rivals. Same result here — both agree.
    //
    // To show halftime actually matters, we need it to disagree with scoring flow.
    // Zoo receives pt1, Zoo scores. Rivals receive pt2, Zoo breaks (scores again).
    // Normal: Zoo scored pt2 → Rivals receive pt3.
    // Halftime after pt1: overrides to otherSide(Zoo) = Rivals for pt2.
    // That also agrees. The real test: halftime after a point where the OTHER side scored.
    //
    // Simplest: Zoo receives pt1, Rivals break (score). Normal: Rivals scored → Zoo receives pt2.
    // Halftime after pt1: overrides to otherSide(Zoo) = Rivals. Now pt2 = Rivals receive.
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: ZOO,
      gameTransitions: [{ id: 'gt1', transitionType: 'halftime', afterPointId: 'pt1' }],
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos1a',
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
            {
              id: 'pos1b',
              sideId: RIVALS,
              actions: [
                { id: 'a3', kind: 'disc_pickup', sideId: RIVALS, player: untracked },
                {
                  id: 'a4',
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
          // Without halftime: Rivals scored pt1 → Zoo receives pt2.
          // With halftime after pt1: receivingSideId = otherSide(Zoo) = Rivals.
          // Halftime overrides normal scoring flow.
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
    const { points } = buildAnalyticsGameWithLog(game);
    expect(points[0].receivingSideId).toBe(ZOO); // pt1: Zoo receives (initial)
    expect(points[0].state).toBe('broken'); // Zoo received, Rivals scored
    expect(points[0].half).toBe(1);
    // Without halftime pt2 would be Zoo receiving (Rivals scored → Zoo receives).
    // Halftime flips: otherSide(initialReceiving=Zoo) = Rivals now receive.
    expect(points[1].receivingSideId).toBe(RIVALS); // pt2: halftime override → Rivals receive
    expect(points[1].state).toBe('opp_hold'); // Rivals received and scored
    expect(points[1].half).toBe(2);
  });

  it('returns in_progress state when a live game has an unfinished point', () => {
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
                  result: 'complete',
                },
              ],
            },
          ],
        },
      ],
    };
    const { points, possessions, attributions } = buildAnalyticsGameWithLog(game);
    expect(points[0].state).toBe('in_progress');
    expect(possessions[0].result).toBe('in_progress');
    // Actions from the current possession are still compiled
    expect(sumAttributions(attributions, 'p_august', 'throw_attempt')).toBe(1);
    expect(sumAttributions(attributions, 'p_august', 'completion')).toBe(1);
    expect(sumAttributions(attributions, 'p_meves', 'receiving_touch')).toBe(1);
  });

  it('callahan — receivingSideId advances: Zoo scored, Rivals receive next', () => {
    // Zoo pulls to Rivals endzone, Rivals throw, Max (Zoo) catches callahan.
    // Zoo scored → Rivals receive pt2, same as any Zoo goal.
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
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
    const { points } = buildAnalyticsGameWithLog(game);
    expect(points[0].state).toBe('break'); // Zoo D-line scored
    expect(points[1].receivingSideId).toBe(RIVALS); // Zoo scored → Rivals receive next
  });
});

// ── Attributions: goals, assists, hockey assists ────────────────────────────

describe('goal and assist attributions', () => {
  it('clean hold — goal, assist, hockey assist, completions, receiving touches', () => {
    // August → Meves → Joah → Max (goal)
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
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
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, 'p_max', 'goal')).toBe(1); // Max scores
    expect(sumAttributions(attributions, 'p_joah', 'assist')).toBe(1); // Joah assists
    expect(sumAttributions(attributions, 'p_meves', 'hockey_assist')).toBe(1); // Meves hockey assist
    expect(sumAttributions(attributions, 'p_august', 'hockey_assist')).toBe(0); // August is too far back
    expect(sumAttributions(attributions, 'p_august', 'completion')).toBe(1);
    expect(sumAttributions(attributions, 'p_meves', 'completion')).toBe(1); // Meves: only a3 (complete throw)
    expect(sumAttributions(attributions, 'p_joah', 'completion')).toBe(1); // Joah: goal throw counts
    expect(sumAttributions(attributions, 'p_meves', 'receiving_touch')).toBe(1);
    expect(sumAttributions(attributions, 'p_joah', 'receiving_touch')).toBe(1);
    expect(sumAttributions(attributions, 'p_max', 'receiving_touch')).toBe(1);
  });

  it('hockey assist — not awarded when previous action was a disc_pickup', () => {
    // disc_pickup (Meves) → Meves throws goal directly: previousActionId of goal = disc_pickup,
    // which is not a complete throw, so no hockey assist is awarded.
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
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
                  puller: untracked,
                  result: 'inbound',
                },
                { id: 'a2', kind: 'disc_pickup', sideId: ZOO, player: meves },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: max,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, 'p_meves', 'assist')).toBe(1); // Meves threw the goal
    expect(sumAttributions(attributions, 'p_max', 'goal')).toBe(1);
    // previousActionId of a3 is a2 (disc_pickup) — not a complete throw, no hockey assist
    expect(attributions.filter((c) => c.type === 'hockey_assist')).toHaveLength(0);
  });

  it('hockey assist fires through a stoppage — stoppage does not block the look-back', () => {
    // August → Meves (complete) → stoppage → Meves → Joah (goal)
    // The stoppage sits between the assist and goal throw but should not prevent
    // August from receiving a hockey assist.
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah'] }],
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
                { id: 'a3', kind: 'stoppage', sideId: ZOO, reason: 'timeout' },
                {
                  id: 'a4',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: joah,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const { attributions } = buildAnalyticsGame(game);

    expect(sumAttributions(attributions, 'p_meves', 'assist')).toBe(1);
    expect(sumAttributions(attributions, 'p_joah', 'goal')).toBe(1);
    expect(sumAttributions(attributions, 'p_august', 'hockey_assist')).toBe(1); // not blocked by stoppage
  });
});

// ── Credits: turnovers ───────────────────────────────────────────────────────

describe('turnover attributions', () => {
  it('throwaway — charged to thrower', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      points: [
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
                { id: 'a3', kind: 'throw', sideId: ZOO, thrower: meves, result: 'throwaway' },
              ],
            },
          ],
        },
      ],
    };
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, 'p_meves', 'throwaway')).toBe(1);
    expect(sumAttributions(attributions, 'p_august', 'throwaway')).toBe(0);
  });

  it('block — throwaway to thrower, block to defender', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
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
                  result: 'block',
                  defender: joah,
                },
              ],
            },
          ],
        },
      ],
    };
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, 'p_joah', 'block')).toBe(1);
    // untracked Rivals thrower — no credit emitted for throwaway
    expect(attributions.filter((c) => c.type === 'throwaway')).toHaveLength(0);
  });

  it('drop — charged to receiver only (no throwaway for clean drop)', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      points: [
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
                },
              ],
            },
          ],
        },
      ],
    };
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, 'p_meves', 'drop')).toBe(1);
    expect(sumAttributions(attributions, 'p_august', 'throwaway')).toBe(0); // clean drop — thrower not charged
  });

  it('split attribution — 0.5 throwaway to thrower, 0.5 drop to receiver', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      points: [
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
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, 'p_august', 'throwaway')).toBe(0.5);
    expect(sumAttributions(attributions, 'p_meves', 'drop')).toBe(0.5);
  });

  it('split attribution — weight field is 0.5 on each affected attribution, 1.0 on all others', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      points: [
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
    const { attributions } = buildAnalyticsGameWithLog(game);

    const throwaway = attributions.find(
      (a) => a.participantId === 'p_august' && a.type === 'throwaway',
    );
    const drop = attributions.find((a) => a.participantId === 'p_meves' && a.type === 'drop');
    const throwAttempt = attributions.find(
      (a) => a.participantId === 'p_august' && a.type === 'throw_attempt',
    );

    expect(throwaway?.weight).toBe(0.5);
    expect(drop?.weight).toBe(0.5);
    // throw_attempt is always full weight, even on a split
    expect(throwAttempt?.weight).toBe(1);
  });

  it('splitAttribution on a throwaway is ignored — thrower gets full weight 1.0 (no receiver to share blame with)', () => {
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
                  result: 'throwaway',
                  splitAttribution: true, // no toPlayer — split is meaningless here
                },
              ],
            },
          ],
        },
      ],
    };

    const { attributions } = buildAnalyticsGame(game);

    // throwaway always full weight — no counterpart exists
    expect(sumAttributions(attributions, 'p_august', 'throwaway')).toBe(1);
  });

  it('stall — stall_conceded to the thrower, stall to the defender', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      points: [
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
                { id: 'a3', kind: 'throw', sideId: ZOO, thrower: meves, result: 'stall' },
              ],
            },
          ],
        },
      ],
    };
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, 'p_meves', 'stall_conceded')).toBe(1);
    expect(sumAttributions(attributions, 'p_meves', 'stall')).toBe(0);
    expect(sumAttributions(attributions, 'p_august', 'stall')).toBe(0);
  });

  it('callahan — callahan and block to defender, throwaway to offense thrower', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
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
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, 'p_max', 'callahan')).toBe(1);
    expect(sumAttributions(attributions, 'p_max', 'block')).toBe(1);
    expect(sumAttributions(attributions, 'p_max', 'goal')).toBe(1);
  });

  it('block — block to defender, throwaway to tracked thrower, no receiving_touch to defender', () => {
    // Joah blocks a Rivals throw, then picks up and throws to Max for the goal.
    // Joah should get block credit but NOT receiving_touch — the block
    // is a defensive play, not an offensive touch.
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
          possessions: [
            {
              id: 'pos1a',
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
                  result: 'block',
                  defender: joah,
                },
              ],
            },
            {
              id: 'pos1b',
              sideId: ZOO,
              actions: [
                {
                  id: 'a3',
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
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, 'p_joah', 'block')).toBe(1);
    expect(sumAttributions(attributions, 'p_joah', 'assist')).toBe(1);
    expect(sumAttributions(attributions, 'p_max', 'goal')).toBe(1);
    // untracked Rivals thrower — no throwaway credit emitted
    expect(attributions.filter((c) => c.type === 'throwaway')).toHaveLength(0);
    // intercepting defender does not receive a receiving_touch
    expect(sumAttributions(attributions, 'p_joah', 'receiving_touch')).toBe(0);
  });

  it('pull dropped — drop to receiver only, no throwaway to puller', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      points: [
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
                  puller: untracked,
                  receiver: august,
                  result: 'dropped',
                },
              ],
            },
          ],
        },
      ],
    };
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, 'p_august', 'drop')).toBe(1);
    expect(attributions.filter((c) => c.type === 'throwaway')).toHaveLength(0);
  });
});

// ── Credits: pull reception ──────────────────────────────────────────────────

describe('pull attributions', () => {
  it('pull inbound — pull to puller, pull_reception to receiver', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
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
              ],
            },
          ],
        },
      ],
    };
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, 'p_august', 'pull')).toBe(1);
    // untracked receiver — no pull_reception credit
    expect(attributions.filter((c) => c.type === 'pull_reception')).toHaveLength(0);
  });

  it('pull action sideId is the pulling side, not the receiving possession side', () => {
    // Zoo pulls to Rivals — pull action lives in Rivals' possession but sideId should be Zoo
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
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
              ],
            },
          ],
        },
      ],
    };
    const { actions } = buildAnalyticsGameWithLog(game);
    const pullAction = actions.find((a) => a.kind === 'pull');
    expect(pullAction?.sideId).toBe(ZOO); // pulling side, not the possession's sideId (RIVALS)
  });

  it('pull hangTimeMs is compiled onto analytics actions', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
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
                  hangTimeMs: 2100,
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'throwaway',
                },
              ],
            },
          ],
        },
      ],
    };
    const { actions } = buildAnalyticsGameWithLog(game);
    const pullAction = actions.find((a) => a.kind === 'pull');
    const throwAction = actions.find((a) => a.kind === 'throw');

    expect(pullAction?.hangTimeMs).toBe(2100);
    expect(throwAction && 'hangTimeMs' in throwAction).toBe(false);
  });
});

// ── disc_pickup attribution ──────────────────────────────────────────────────

describe('disc_pickup attribution', () => {
  it('disc_pickup is credited to the player who picks up the disc', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
          possessions: [
            {
              id: 'pos1a',
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
                  result: 'throwaway',
                },
              ],
            },
            {
              id: 'pos1b',
              sideId: ZOO,
              actions: [
                { id: 'a3', kind: 'disc_pickup', sideId: ZOO, player: meves },
                {
                  id: 'a4',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: august,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, 'p_meves', 'disc_pickup')).toBe(1);
    // august picked up the pull, not the ground disc
    expect(sumAttributions(attributions, 'p_august', 'disc_pickup')).toBe(0);
  });
});

describe('unknown vs untracked PlayerRef attribution', () => {
  const unknown = { refType: 'unknown' as const };

  it('goal to unknown receiver — goal attributed to UNKNOWN_PARTICIPANT_ID', () => {
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
                  toPlayer: unknown,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, UNKNOWN_PARTICIPANT_ID, 'goal')).toBe(1);
    expect(sumAttributions(attributions, UNKNOWN_PARTICIPANT_ID, 'receiving_touch')).toBe(1);
    expect(sumAttributions(attributions, 'p_august', 'assist')).toBe(1);
  });

  it('goal to untracked receiver — no goal or receiving_touch attribution', () => {
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
                  toPlayer: untracked,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, UNKNOWN_PARTICIPANT_ID, 'goal')).toBe(0);
    expect(attributions.filter((a) => a.type === 'receiving_touch')).toHaveLength(0);
    expect(sumAttributions(attributions, 'p_august', 'assist')).toBe(1);
  });

  it('drop to unknown receiver (no split) — drop attributed to UNKNOWN_PARTICIPANT_ID', () => {
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
                  toPlayer: unknown,
                  result: 'drop',
                },
              ],
            },
          ],
        },
      ],
    };
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, UNKNOWN_PARTICIPANT_ID, 'drop')).toBe(1);
    expect(sumAttributions(attributions, 'p_august', 'throw_attempt')).toBe(1);
  });

  it('hockey assist from unknown previous thrower — credited to UNKNOWN_PARTICIPANT_ID', () => {
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
                  thrower: unknown,
                  toPlayer: august,
                  result: 'complete',
                },
                {
                  id: 'a3',
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
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, UNKNOWN_PARTICIPANT_ID, 'hockey_assist')).toBe(1);
    expect(sumAttributions(attributions, 'p_august', 'assist')).toBe(1);
    expect(sumAttributions(attributions, 'p_meves', 'goal')).toBe(1);
  });

  it('unknown player pickup — disc_pickup attributed to UNKNOWN_PARTICIPANT_ID', () => {
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
              sideId: ZOO,
              actions: [{ id: 'a1', kind: 'disc_pickup', sideId: ZOO, player: unknown }],
            },
          ],
        },
      ],
    };
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, UNKNOWN_PARTICIPANT_ID, 'disc_pickup')).toBe(1);
  });

  it('unknown player stall — stall attributed to UNKNOWN_PARTICIPANT_ID', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: RIVALS, participantIds: [] }],
          possessions: [
            {
              id: 'pos1',
              sideId: RIVALS,
              actions: [
                {
                  id: 'a1',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'stall',
                  defender: unknown,
                },
              ],
            },
          ],
        },
      ],
    };
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, UNKNOWN_PARTICIPANT_ID, 'stall')).toBe(1);
  });

  it('unknown player block — block attributed to UNKNOWN_PARTICIPANT_ID', () => {
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
              sideId: ZOO,
              actions: [
                {
                  id: 'a1',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  result: 'block',
                  defender: unknown,
                },
              ],
            },
          ],
        },
      ],
    };
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, UNKNOWN_PARTICIPANT_ID, 'block')).toBe(1);
  });

  it('unknown player callahan catch — goal and callahan attributed to UNKNOWN_PARTICIPANT_ID', () => {
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
                {
                  id: 'a1',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'callahan',
                  defender: unknown,
                },
              ],
            },
          ],
        },
      ],
    };
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, UNKNOWN_PARTICIPANT_ID, 'goal')).toBe(1);
    expect(sumAttributions(attributions, UNKNOWN_PARTICIPANT_ID, 'callahan')).toBe(1);
    expect(sumAttributions(attributions, UNKNOWN_PARTICIPANT_ID, 'block')).toBe(1);
  });

  it('callahan recorded via toPlayer (tracker pattern) — resolves from receiver when defender is absent', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
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
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  toPlayer: max,
                  result: 'callahan',
                },
              ],
            },
          ],
        },
      ],
    };
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, 'p_max', 'goal')).toBe(1);
    expect(sumAttributions(attributions, 'p_max', 'callahan')).toBe(1);
    expect(sumAttributions(attributions, 'p_max', 'block')).toBe(1);
  });

  it('callahan recorded via toPlayer with unknown — resolves from receiver when defender is absent', () => {
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
                {
                  id: 'a1',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  toPlayer: unknown,
                  result: 'callahan',
                },
              ],
            },
          ],
        },
      ],
    };
    const { attributions } = buildAnalyticsGameWithLog(game);

    expect(sumAttributions(attributions, UNKNOWN_PARTICIPANT_ID, 'goal')).toBe(1);
    expect(sumAttributions(attributions, UNKNOWN_PARTICIPANT_ID, 'callahan')).toBe(1);
    expect(sumAttributions(attributions, UNKNOWN_PARTICIPANT_ID, 'block')).toBe(1);
  });
});

// ── Fail fast on invalid structure ───────────────────────────────────────────

describe('invalid structure', () => {
  it('throws when the game does not have exactly two sides', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      sides: [{ id: ZOO, label: 'Zoo', trackingMode: 'full-roster' }],
      points: [],
    };

    expect(() => buildAnalyticsGame(game)).toThrow('requires exactly 2 sides');
  });

  it('throws when a point has no possessions', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [],
        },
      ],
    };

    expect(() => buildAnalyticsGame(game)).toThrow('to have at least one possession');
  });

  it('throws when a possession has no actions', () => {
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
              actions: [],
            },
          ],
        },
      ],
    };

    expect(() => buildAnalyticsGame(game)).toThrow('to have at least one action');
  });

  it('throws when a line references an unknown side', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: 'ghost', participantIds: ['p_august'] }],
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
                { id: 'a2', kind: 'throw', sideId: ZOO, thrower: august, result: 'goal' },
              ],
            },
          ],
        },
      ],
    };

    expect(() => buildAnalyticsGame(game)).toThrow('line sideId');
  });

  it('throws when a line references an unknown participant', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['missing_player'] }],
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
                { id: 'a2', kind: 'throw', sideId: ZOO, thrower: august, result: 'goal' },
              ],
            },
          ],
        },
      ],
    };

    expect(() => buildAnalyticsGame(game)).toThrow('line participantId');
  });

  it('throws when a sub references an unknown participant', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          subs: [
            {
              id: 'sub1',
              sideId: ZOO,
              type: 'injury',
              inIds: ['missing_player'],
              outIds: ['p_august'],
              stoppageActionId: 'a2',
            },
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
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                { id: 'a2', kind: 'stoppage', reason: 'injury', sideId: ZOO },
                { id: 'a3', kind: 'throw', sideId: ZOO, thrower: august, result: 'goal' },
              ],
            },
          ],
        },
      ],
    };

    expect(() => buildAnalyticsGame(game)).toThrow('sub participantId');
  });

  it('throws when a non-pull action sideId does not match the possession side', () => {
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
                { id: 'a2', kind: 'throw', sideId: RIVALS, thrower: august, result: 'goal' },
              ],
            },
          ],
        },
      ],
    };

    expect(() => buildAnalyticsGame(game)).toThrow('throw action "a2" sideId');
  });

  it('throws when a pull receivingSideId does not match the possession side', () => {
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
                  receivingSideId: RIVALS,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                { id: 'a2', kind: 'throw', sideId: ZOO, thrower: august, result: 'goal' },
              ],
            },
          ],
        },
      ],
    };

    expect(() => buildAnalyticsGame(game)).toThrow('pull action "a1" receivingSideId');
  });

  it('throws when a final game has an unfinished last point', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'final',
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
                { id: 'a2', kind: 'disc_pickup', sideId: ZOO, player: august },
              ],
            },
          ],
        },
      ],
    };

    expect(() => buildAnalyticsGame(game)).toThrow(
      'requires every point to end with a score unless the game terminated mid-point',
    );
  });
});

// ── Point timer and elapsed time ────────────────────────────────────────────

describe('point timer', () => {
  it('elapsedMs is null when timestamps are absent', () => {
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
    const { actions } = buildAnalyticsGameWithLog(game);
    expect(actions.every((a) => a.elapsedMs === null)).toBe(true);
  });

  it('elapsedMs is derived from recordedAt - startedAt', () => {
    const start = 1000000;
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          startedAt: start,
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
                  recordedAt: start + 2000,
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'complete',
                  recordedAt: start + 10000,
                },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: max,
                  result: 'goal',
                  recordedAt: start + 90000,
                },
              ],
            },
          ],
        },
      ],
    };
    const { actions } = buildAnalyticsGameWithLog(game);
    expect(actions[0].elapsedMs).toBe(2000);
    expect(actions[1].elapsedMs).toBe(10000);
    expect(actions[2].elapsedMs).toBe(90000); // 1.5 min point
  });

  it('elapsedMs subtracts completed pause durations after a stoppage', () => {
    const start = 1000000;
    const pausedAt = start + 20000; // timeout called 20s in
    const resumedAt = start + 50000; // play resumed 30s later
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          startedAt: start,
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
                  recordedAt: start + 2000,
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'complete',
                  recordedAt: start + 15000,
                },
                {
                  id: 'a3',
                  kind: 'stoppage',
                  reason: 'timeout',
                  sideId: ZOO,
                  recordedAt: pausedAt,
                  pausedAt,
                  resumedAt,
                },
                // After 30s pause — real clock is at +60s but game clock should read +30s
                {
                  id: 'a4',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: max,
                  result: 'goal',
                  recordedAt: start + 60000,
                },
              ],
            },
          ],
        },
      ],
    };
    const { actions } = buildAnalyticsGameWithLog(game);
    expect(actions[0].elapsedMs).toBe(2000);
    expect(actions[1].elapsedMs).toBe(15000);
    expect(actions[2].elapsedMs).toBe(20000); // stoppage itself: before pause subtraction
    expect(actions[3].elapsedMs).toBe(30000); // 60s real - 30s pause = 30s game clock
  });

  it('elapsedMs subtracts multiple pause durations when several stoppages occur in one point', () => {
    const start = 1000000;
    // Pause 1 (Zoo timeout): 15s real, 20s long → resumes at real 35s
    const pause1At = start + 15000;
    const resume1At = start + 35000;
    // Pause 2 (injury): real 45s (= 25s game clock), 30s long → resumes at real 75s
    const pause2At = start + 45000;
    const resume2At = start + 75000;
    // Last action: real 90s = 90 - 20 - 30 = 40s game clock

    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          startedAt: start,
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
                  recordedAt: start + 2000,
                },
                {
                  id: 'a2',
                  kind: 'stoppage',
                  reason: 'timeout',
                  sideId: ZOO,
                  recordedAt: pause1At,
                  pausedAt: pause1At,
                  resumedAt: resume1At,
                },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'complete',
                  recordedAt: start + 40000, // real 40s, game clock 40 - 20 = 20s
                },
                {
                  id: 'a4',
                  kind: 'stoppage',
                  reason: 'injury',
                  sideId: ZOO,
                  recordedAt: pause2At,
                  pausedAt: pause2At,
                  resumedAt: resume2At,
                },
                {
                  id: 'a5',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: max,
                  result: 'goal',
                  recordedAt: start + 90000, // real 90s, game clock 90 - 20 - 30 = 40s
                },
              ],
            },
          ],
        },
      ],
    };
    const { actions } = buildAnalyticsGameWithLog(game);
    expect(actions[0].elapsedMs).toBe(2000); // before any pause
    expect(actions[1].elapsedMs).toBe(15000); // stoppage1 fires at real 15s, no prior pauses
    expect(actions[2].elapsedMs).toBe(20000); // real 40s - pause1(20s) = 20s game clock
    expect(actions[3].elapsedMs).toBe(25000); // stoppage2 fires at real 45s - pause1(20s) = 25s game clock
    expect(actions[4].elapsedMs).toBe(40000); // real 90s - pause1(20s) - pause2(30s) = 40s game clock
  });
});

// ── Stat derivation examples ─────────────────────────────────────────────────

describe('stat derivation', () => {
  // Multi-point game: pt1 Zoo hold, pt2 Zoo break.
  //
  // pt1: Rivals pull → August receives, August → Meves (complete), Meves → Joah (goal).
  //   August: pull_reception, throw_attempt, completion, hockey_assist
  //   Meves:  receiving_touch, throw_attempt, completion, assist
  //   Joah:   goal, receiving_touch
  //
  // pt2 (break): Zoo pulls (August) → Rivals catch → Joah blocks → Joah picks up →
  //   Joah → Meves (complete) → Meves → Sam (drop) → Rivals → August throwaway →
  //   Rivals → Meves picks up → Meves → Sam (goal).
  //   August: pull, disc_pickup, throw_attempt, throwaway  → +/- contribution: -1
  //   Joah:   block, disc_pickup, throw_attempt, completion → +/- contribution: +1
  //   Meves:  receiving_touch, throw_attempt×2, completion×2, assist, disc_pickup → +/- contribution: +1
  //   Sam:    drop, goal, receiving_touch → +/- contribution: 0
  //
  // Final +/-: goals + assists + blocks - throwaways - drops
  //   August:  0+0+0-1-0 = -1
  //   Meves:   0+2+0-0-0 = +2  (assist in pt1, assist in pt2)
  //   Joah:    1+0+1-0-0 = +2  (goal in pt1, block in pt2)
  //   Sam:     1+0+0-0-1 =  0  (goal in pt2, drop in pt2)
  const multiPointGame: AdvancedTrackedGame = {
    ...baseGame,
    initialReceivingSideId: ZOO,
    points: [
      {
        // pt1: Zoo hold
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
                result: 'goal',
              },
            ],
          },
        ],
      },
      {
        // pt2: Zoo break — Zoo scored pt1 → Rivals receive pt2
        id: 'pt2',
        lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_sam'] }],
        possessions: [
          {
            // Rivals first possession: Joah blocks Rivals throw
            id: 'pos2a',
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
                result: 'block',
                defender: joah,
              },
            ],
          },
          {
            // Zoo possession: Joah picks up, complete to Meves, Meves → Sam (drop)
            id: 'pos2b',
            sideId: ZOO,
            actions: [
              { id: 'b3', kind: 'disc_pickup', sideId: ZOO, player: joah },
              {
                id: 'b4',
                kind: 'throw',
                sideId: ZOO,
                thrower: joah,
                toPlayer: meves,
                result: 'complete',
              },
              {
                id: 'b5',
                kind: 'throw',
                sideId: ZOO,
                thrower: meves,
                toPlayer: sam,
                result: 'drop',
              },
            ],
          },
          {
            // Rivals possession after drop
            id: 'pos2c',
            sideId: RIVALS,
            actions: [
              { id: 'c1', kind: 'disc_pickup', sideId: RIVALS, player: untracked },
              { id: 'c2', kind: 'throw', sideId: RIVALS, thrower: untracked, result: 'throwaway' },
            ],
          },
          {
            // Zoo possession: August throwaway
            id: 'pos2d',
            sideId: ZOO,
            actions: [
              { id: 'd1', kind: 'disc_pickup', sideId: ZOO, player: august },
              { id: 'd2', kind: 'throw', sideId: ZOO, thrower: august, result: 'throwaway' },
            ],
          },
          {
            // Rivals possession after throwaway
            id: 'pos2e',
            sideId: RIVALS,
            actions: [
              { id: 'e1', kind: 'disc_pickup', sideId: RIVALS, player: untracked },
              { id: 'e2', kind: 'throw', sideId: RIVALS, thrower: untracked, result: 'throwaway' },
            ],
          },
          {
            // Zoo scores: Meves → Sam (goal)
            id: 'pos2f',
            sideId: ZOO,
            actions: [
              { id: 'f1', kind: 'disc_pickup', sideId: ZOO, player: meves },
              {
                id: 'f2',
                kind: 'throw',
                sideId: ZOO,
                thrower: meves,
                toPlayer: sam,
                result: 'goal',
              },
            ],
          },
        ],
      },
    ],
  };

  it('team holds and breaks', () => {
    const { points } = buildAnalyticsGameWithLog(multiPointGame);
    const holds = points.filter((p) => p.state === 'hold').length;
    const breaks = points.filter((p) => p.state === 'break').length;
    expect(holds).toBe(1);
    expect(breaks).toBe(1);
  });

  it('completion percentage', () => {
    const { attributions } = buildAnalyticsGameWithLog(multiPointGame);
    // August: 1 completion (a2: complete), 2 throw_attempts (a2 + d2: throwaway)
    const augustCompletions = sumAttributions(attributions, 'p_august', 'completion');
    const augustAttempts = sumAttributions(attributions, 'p_august', 'throw_attempt');
    expect(augustCompletions).toBe(1);
    expect(augustAttempts).toBe(2);
    expect(augustCompletions / augustAttempts).toBe(0.5);
  });

  it('points played derived from linesBySide', () => {
    const { points } = buildAnalyticsGameWithLog(multiPointGame);
    const mevesPointsPlayed = points.filter((p) =>
      Object.values(p.linesBySide).some((ids) => ids.includes('p_meves')),
    ).length;
    const samPointsPlayed = points.filter((p) =>
      Object.values(p.linesBySide).some((ids) => ids.includes('p_sam')),
    ).length;
    expect(mevesPointsPlayed).toBe(2); // Meves played both points
    expect(samPointsPlayed).toBe(1); // Sam only played pt2
  });

  it('plus/minus — goals + assists + blocks - throwaways - drops', () => {
    const { attributions } = buildAnalyticsGameWithLog(multiPointGame);

    function plusMinus(participantId: string): number {
      return (
        sumAttributions(attributions, participantId, 'goal') +
        sumAttributions(attributions, participantId, 'assist') +
        sumAttributions(attributions, participantId, 'block') -
        sumAttributions(attributions, participantId, 'throwaway') -
        sumAttributions(attributions, participantId, 'drop')
      );
    }

    expect(plusMinus('p_august')).toBe(-1); // 1 throwaway
    expect(plusMinus('p_meves')).toBe(2); // 2 assists (pt1 + pt2), no negatives
    expect(plusMinus('p_joah')).toBe(2); // 1 goal (pt1) + 1 block (pt2)
    expect(plusMinus('p_sam')).toBe(0); // 1 goal, 1 drop — net zero
  });
});

// ── Point durationMs ────────────────────────────────────────────────────────

describe('point durationMs', () => {
  it('null when timestamps are absent', () => {
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
    const { points } = buildAnalyticsGameWithLog(game);
    expect(points[0].durationMs).toBeNull();
  });

  it('derived from last action recordedAt minus startedAt', () => {
    const start = 1000000;
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          startedAt: start,
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
                  recordedAt: start + 2000,
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                  recordedAt: start + 90000,
                },
              ],
            },
          ],
        },
      ],
    };
    const { points } = buildAnalyticsGameWithLog(game);
    expect(points[0].durationMs).toBe(90000);
  });

  it('subtracts pause durations from stoppages', () => {
    const start = 1000000;
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          startedAt: start,
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
                  recordedAt: start + 2000,
                },
                {
                  id: 'a2',
                  kind: 'stoppage',
                  reason: 'timeout',
                  sideId: ZOO,
                  recordedAt: start + 20000,
                  pausedAt: start + 20000,
                  resumedAt: start + 50000, // 30s pause
                },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                  recordedAt: start + 60000, // 60s real time
                },
              ],
            },
          ],
        },
      ],
    };
    const { points } = buildAnalyticsGameWithLog(game);
    expect(points[0].durationMs).toBe(30000); // 60s - 30s pause = 30s
  });
});

// ── Clean / dirty hold ──────────────────────────────────────────────────────

describe('isCleanHold', () => {
  it('true for a clean hold — single possession scores', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: ZOO,
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
    const { points } = buildAnalyticsGameWithLog(game);
    expect(points[0].isCleanHold).toBe(true);
    expect(points[0].state).toBe('hold');
  });

  it('false for a dirty hold — turnover then score', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: ZOO,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
          possessions: [
            {
              id: 'pos1a',
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
            {
              id: 'pos1b',
              sideId: RIVALS,
              actions: [
                { id: 'a3', kind: 'disc_pickup', sideId: RIVALS, player: untracked },
                {
                  id: 'a4',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'throwaway',
                },
              ],
            },
            {
              id: 'pos1c',
              sideId: ZOO,
              actions: [
                { id: 'a5', kind: 'disc_pickup', sideId: ZOO, player: meves },
                {
                  id: 'a6',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: august,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };
    const { points } = buildAnalyticsGameWithLog(game);
    expect(points[0].isCleanHold).toBe(false);
    expect(points[0].state).toBe('hold');
  });

  it('false for a break — opponent always possessed first, so two sides always touched the disc', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: RIVALS,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
          possessions: [
            {
              id: 'pos1a',
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
                  result: 'throwaway',
                },
              ],
            },
            {
              id: 'pos1b',
              sideId: ZOO,
              actions: [
                { id: 'a3', kind: 'disc_pickup', sideId: ZOO, player: meves },
                {
                  id: 'a4',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: august,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };
    const { points } = buildAnalyticsGameWithLog(game);
    expect(points[0].isCleanHold).toBe(false); // two distinct sides possessed
    expect(points[0].state).toBe('break');
  });

  it('null for a terminated point', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      endReason: 'weather',
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
              ],
            },
          ],
        },
      ],
    };
    const { points } = buildAnalyticsGameWithLog(game);
    expect(points[0].isCleanHold).toBeNull();
    expect(points[0].state).toBe('terminated');
  });
});

// ── Injury subs ──────────────────────────────────────────────────────────────

describe('injury subs', () => {
  it('sub-in player is included in linesBySide for the point', () => {
    // August starts, gets injured, Sam subs in — both should appear in linesBySide
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
          subs: [
            {
              id: 'sub1',
              sideId: ZOO,
              type: 'injury',
              inIds: ['p_sam'],
              outIds: ['p_august'],
              stoppageActionId: 'a2',
            },
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
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                { id: 'a2', kind: 'stoppage', reason: 'injury', sideId: ZOO },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: joah,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };
    const { points } = buildAnalyticsGameWithLog(game);
    const line = points[0].linesBySide[ZOO];
    expect(line).toContain('p_august'); // subbed out — was in starting line
    expect(line).toContain('p_sam'); // subbed in — gets credit for having played
  });

  it('sub-in player counts toward points played', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max'] }],
          subs: [
            {
              id: 'sub1',
              sideId: ZOO,
              type: 'injury',
              inIds: ['p_sam'],
              outIds: ['p_august'],
              stoppageActionId: 'a2',
            },
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
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                { id: 'a2', kind: 'stoppage', reason: 'injury', sideId: ZOO },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: joah,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };
    const { points } = buildAnalyticsGameWithLog(game);
    const played = (id: string) =>
      points.filter((p) => Object.values(p.linesBySide).some((ids) => ids.includes(id))).length;
    expect(played('p_august')).toBe(1); // subbed out
    expect(played('p_sam')).toBe(1); // subbed in
  });

  it('injury sub is additive — sub-out and sub-in both get point credit', () => {
    // 5 starters on the line. August exits with an injury, p_extra enters.
    // Result: 6 players credited for the point (sub-out is NOT replaced, it's additive).
    const game: AdvancedTrackedGame = {
      ...baseGame,
      participants: [...baseGame.participants, { id: 'p_extra', name: 'Extra' }],
      points: [
        {
          id: 'pt1',
          lines: [
            { sideId: ZOO, participantIds: ['p_august', 'p_meves', 'p_joah', 'p_max', 'p_sam'] },
          ],
          subs: [
            {
              id: 'sub1',
              sideId: ZOO,
              type: 'injury',
              inIds: ['p_extra'], // not in starting line
              outIds: ['p_august'],
              stoppageActionId: 'a2',
            },
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
                  puller: untracked,
                  receiver: meves,
                  result: 'inbound',
                },
                { id: 'a2', kind: 'stoppage', reason: 'injury', sideId: ZOO },
                {
                  id: 'a3',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: joah,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const { points } = buildAnalyticsGame(game);
    const playersWithCredit = points[0].linesBySide[ZOO];

    // All 5 starters credited, including August who subbed out
    expect(playersWithCredit).toContain('p_august');
    expect(playersWithCredit).toContain('p_meves');
    expect(playersWithCredit).toContain('p_joah');
    expect(playersWithCredit).toContain('p_max');
    expect(playersWithCredit).toContain('p_sam');
    // Sub-in also credited — additive, not a replacement
    expect(playersWithCredit).toContain('p_extra');
    expect(playersWithCredit).toHaveLength(6);
  });
});

// ── Possession turnoverType ───────────────────────────────────────────────────

describe('possession turnoverType', () => {
  it('goal — result is scored, no turnoverType', () => {
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
    const { possessions } = buildAnalyticsGameWithLog(game);
    expect(possessions[0].result).toBe('scored');
    expect(possessions[0].turnoverType).toBeUndefined();
  });

  it('turnoverType reflects the throw result for all turnover outcomes', () => {
    // Five points each ending in a different turnover — no scores, so Zoo receives all.
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'in_progress',
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
            {
              id: 'pos1b',
              sideId: RIVALS,
              actions: [
                { id: 'a3', kind: 'disc_pickup', sideId: RIVALS, player: untracked },
                {
                  id: 'a4',
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
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
          possessions: [
            {
              id: 'pos2',
              sideId: ZOO,
              actions: [
                {
                  id: 'b1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'b2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  toPlayer: meves,
                  result: 'drop',
                },
              ],
            },
            {
              id: 'pos2b',
              sideId: RIVALS,
              actions: [
                { id: 'b3', kind: 'disc_pickup', sideId: RIVALS, player: untracked },
                {
                  id: 'b4',
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
              sideId: ZOO,
              actions: [
                {
                  id: 'c1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                { id: 'c2', kind: 'throw', sideId: ZOO, thrower: august, result: 'stall' },
              ],
            },
            {
              id: 'pos3b',
              sideId: RIVALS,
              actions: [
                { id: 'c3', kind: 'disc_pickup', sideId: RIVALS, player: untracked },
                {
                  id: 'c4',
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
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_joah'] }],
          possessions: [
            {
              id: 'pos4',
              sideId: ZOO,
              actions: [
                {
                  id: 'd1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'd2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  result: 'block',
                  defender: joah,
                },
              ],
            },
            {
              id: 'pos4b',
              sideId: RIVALS,
              actions: [
                { id: 'd3', kind: 'disc_pickup', sideId: RIVALS, player: untracked },
                {
                  id: 'd4',
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
          id: 'pt5',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_joah'] }],
          possessions: [
            {
              id: 'pos5',
              sideId: ZOO,
              actions: [
                {
                  id: 'e1',
                  kind: 'pull',
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'e2',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: august,
                  result: 'block',
                  defender: joah,
                },
              ],
            },
            {
              id: 'pos5b',
              sideId: RIVALS,
              actions: [
                { id: 'e3', kind: 'disc_pickup', sideId: RIVALS, player: untracked },
                {
                  id: 'e4',
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
    const { possessions } = buildAnalyticsGameWithLog(game);
    expect(possessions[0]).toMatchObject({ result: 'turned_over', turnoverType: 'throwaway' });
    expect(possessions[2]).toMatchObject({ result: 'turned_over', turnoverType: 'drop' });
    expect(possessions[4]).toMatchObject({ result: 'turned_over', turnoverType: 'stall' });
    expect(possessions[6]).toMatchObject({ result: 'turned_over', turnoverType: 'block' });
    expect(possessions[8]).toMatchObject({ result: 'turned_over', turnoverType: 'block' });
  });

  it('callahan — possession result is turned_over with turnoverType callahan', () => {
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
    const { possessions } = buildAnalyticsGameWithLog(game);
    expect(possessions[0].result).toBe('turned_over');
    expect(possessions[0].turnoverType).toBe('callahan');
  });

  it('dropped pull — turned_over with turnoverType drop, not masked by terminated status', () => {
    // The bug: the existing dropped-pull test used status:'terminated', which let
    // compilePossessionWithActions fall through to possResult='terminated' instead of
    // throwing. This test uses in_progress with the dropped pull followed by a scoring
    // possession, which is the case that actually hit production.
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'in_progress',
      initialReceivingSideId: ZOO,
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
                  result: 'dropped',
                },
              ],
            },
            {
              id: 'pos2',
              sideId: RIVALS,
              actions: [
                { id: 'a2', kind: 'disc_pickup', sideId: RIVALS, player: untracked },
                {
                  id: 'a3',
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
    const { possessions } = buildAnalyticsGameWithLog(game);
    expect(possessions[0].result).toBe('turned_over');
    expect(possessions[0].turnoverType).toBe('drop');
    expect(possessions[1].result).toBe('scored');
  });
});

// ── genderRatio ───────────────────────────────────────────────────────────────

describe('genderRatio', () => {
  it('genderRatio is passed through from TrackedPoint to AnalyticsPoint', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: ZOO,
      points: [
        {
          id: 'pt1',
          genderRatio: 'more-women',
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
        {
          id: 'pt2',
          genderRatio: 'more-men',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
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
    const { points } = buildAnalyticsGameWithLog(game);
    expect(points[0].genderRatio).toBe('more-women');
    expect(points[1].genderRatio).toBe('more-men');
  });

  it('genderRatio is undefined when not set on the point', () => {
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
    const { points } = buildAnalyticsGameWithLog(game);
    expect(points[0].genderRatio).toBeUndefined();
  });
});

// ── scoresBySide ──────────────────────────────────────────────────────────────

describe('scoresBySide', () => {
  it('starts at 0-0 for the first point and increments after each scored point', () => {
    // pt1: Zoo hold (0-0 at start → 1-0 after)
    // pt2: Zoo break (1-0 at start → 2-0 after)
    // pt3: Rivals hold — opp_hold for Zoo (2-0 at start → 2-1 after)
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
              id: 'pos2a',
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
                  result: 'throwaway',
                },
              ],
            },
            {
              id: 'pos2b',
              sideId: ZOO,
              actions: [
                { id: 'b3', kind: 'disc_pickup', sideId: ZOO, player: august },
                {
                  id: 'b4',
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
          id: 'pt3',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos3',
              sideId: RIVALS,
              actions: [
                {
                  id: 'c1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'c2',
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

    const { points } = buildAnalyticsGame(game);

    expect(points[0].scoresBySide).toEqual({ [ZOO]: 0, [RIVALS]: 0 }); // 0-0 before pt1
    expect(points[1].scoresBySide).toEqual({ [ZOO]: 1, [RIVALS]: 0 }); // 1-0 before pt2
    expect(points[2].scoresBySide).toEqual({ [ZOO]: 2, [RIVALS]: 0 }); // 2-0 before pt3
  });

  it('scoresBySide is perspective-neutral — both sides are tracked', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
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
                  toPlayer: untracked,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const { points } = buildAnalyticsGame(game);

    // Before pt1 both scores are 0 — the Rivals goal updates runningScores for NEXT point
    expect(points[0].scoresBySide[ZOO]).toBe(0);
    expect(points[0].scoresBySide[RIVALS]).toBe(0);
  });
});

// ── possession result for finished games ──────────────────────────────────────

describe('possession result for finished games', () => {
  it('last possession of a terminated game defaults to terminated when last action is not a throw', () => {
    const game: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      points: [
        {
          id: 'pt1',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              // First possession ended normally — turned over
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
                  result: 'throwaway',
                },
              ],
            },
            {
              // Second possession: game ended after disc_pickup, before any throw
              id: 'pos2',
              sideId: ZOO,
              actions: [{ id: 'a3', kind: 'disc_pickup', sideId: ZOO, player: august }],
            },
          ],
        },
      ],
    };

    const { possessions } = buildAnalyticsGame(game);

    expect(possessions[0].result).toBe('turned_over'); // ended with a throw
    expect(possessions[1].result).toBe('terminated'); // game ended mid-possession
  });
});

// ── getPointStateForSide ──────────────────────────────────────────────────────

describe('getPointStateForSide', () => {
  // One game, four terminal points covering all four outcomes from Zoo's perspective.
  // scoringSideId lets us derive the inverse for Rivals without recompiling.
  function makeTerminalPoint(
    receivingSideId: string,
    scoringSideId: string,
  ): Parameters<typeof getPointStateForSide>[0] {
    return {
      id: 'pt',
      pointIndex: 0,
      half: 1,
      receivingSideId,
      pullingSideId: receivingSideId === ZOO ? RIVALS : ZOO,
      scoringSideId,
      state: (() => {
        if (receivingSideId === ZOO && scoringSideId === ZOO) {
          return 'hold';
        }
        if (receivingSideId === RIVALS && scoringSideId === ZOO) {
          return 'break';
        }
        if (receivingSideId === ZOO && scoringSideId === RIVALS) {
          return 'broken';
        }
        return 'opp_hold';
      })(),
      linesBySide: {},
      scoresBySide: { [ZOO]: 0, [RIVALS]: 0 },
      durationMs: null,
      isCleanHold: null,
    };
  }

  it('returns the same state as point.state when called with focusSideId', () => {
    const hold = makeTerminalPoint(ZOO, ZOO);
    const brk = makeTerminalPoint(RIVALS, ZOO);
    const broken = makeTerminalPoint(ZOO, RIVALS);
    const opp = makeTerminalPoint(RIVALS, RIVALS);

    expect(getPointStateForSide(hold, ZOO)).toBe('hold');
    expect(getPointStateForSide(brk, ZOO)).toBe('break');
    expect(getPointStateForSide(broken, ZOO)).toBe('broken');
    expect(getPointStateForSide(opp, ZOO)).toBe('opp_hold');
  });

  it('returns the mirror state when called with the other sideId', () => {
    // Perspective inversion:
    //   hold     ↔ opp_hold  (Zoo held their O = Rivals' D got scored on)
    //   break    ↔ broken    (Zoo broke Rivals' O = Rivals' O got broken)
    const hold = makeTerminalPoint(ZOO, ZOO);
    const brk = makeTerminalPoint(RIVALS, ZOO);
    const broken = makeTerminalPoint(ZOO, RIVALS);
    const opp = makeTerminalPoint(RIVALS, RIVALS);

    expect(getPointStateForSide(hold, RIVALS)).toBe('opp_hold');
    expect(getPointStateForSide(brk, RIVALS)).toBe('broken');
    expect(getPointStateForSide(broken, RIVALS)).toBe('break');
    expect(getPointStateForSide(opp, RIVALS)).toBe('hold');
  });

  it('terminated is perspective-neutral — same for any sideId', () => {
    const terminated = {
      ...makeTerminalPoint(ZOO, ZOO),
      scoringSideId: null,
      state: 'terminated' as const,
    };

    expect(getPointStateForSide(terminated, ZOO)).toBe('terminated');
    expect(getPointStateForSide(terminated, RIVALS)).toBe('terminated');
  });

  it('scoringSideId on a compiled point matches the derived state', () => {
    // End-to-end: build a real game, verify scoringSideId is populated and
    // getPointStateForSide produces correct states for both sides.
    const game: AdvancedTrackedGame = {
      ...baseGame,
      initialReceivingSideId: ZOO,
      points: [
        {
          // pt1: Zoo hold
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
        {
          // pt2: Zoo break — Zoo scored pt1 → Rivals receive pt2
          id: 'pt2',
          lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
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
                  puller: august,
                  receiver: untracked,
                  result: 'inbound',
                },
                {
                  id: 'b2',
                  kind: 'throw',
                  sideId: RIVALS,
                  thrower: untracked,
                  result: 'throwaway',
                },
              ],
            },
            {
              id: 'pos2b',
              sideId: ZOO,
              actions: [
                { id: 'b3', kind: 'disc_pickup', sideId: ZOO, player: meves },
                {
                  id: 'b4',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: august,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const { points } = buildAnalyticsGame(game);

    // pt1: Zoo hold — scoringSideId = Zoo
    expect(points[0].scoringSideId).toBe(ZOO);
    expect(getPointStateForSide(points[0], ZOO)).toBe('hold');
    expect(getPointStateForSide(points[0], RIVALS)).toBe('opp_hold'); // Rivals pulled, didn't score

    // pt2: Zoo break — scoringSideId = Zoo
    expect(points[1].scoringSideId).toBe(ZOO);
    expect(getPointStateForSide(points[1], ZOO)).toBe('break');
    expect(getPointStateForSide(points[1], RIVALS)).toBe('broken'); // Rivals received, didn't score
  });
});

// ── both-team tracking ────────────────────────────────────────────────────────

describe('both-team tracking', () => {
  // Both sides use full-roster tracking — participants are named on both sides.
  // A single compiled game provides stats for either side via getPointStateForSide.

  it('hold and break counts are derivable for both sides without recompiling', () => {
    // Sequence: Zoo hold → Zoo break → Rivals hold (opp_hold from Zoo's perspective)
    //   Zoo:    hold=1, break=1, opp_hold=1
    //   Rivals: opp_hold=1, broken=1, hold=1
    const game: AdvancedTrackedGame = {
      ...baseGame,
      sides: [
        { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
        { id: RIVALS, label: 'Rivals', trackingMode: 'full-roster' },
      ],
      initialReceivingSideId: ZOO,
      points: [
        // pt1: Zoo receives → Zoo scores = Zoo hold. Zoo pulls pt2.
        {
          id: 'pt1',
          lines: [
            { sideId: ZOO, participantIds: ['p_august', 'p_meves'] },
            { sideId: RIVALS, participantIds: ['p_joah', 'p_max'] },
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
                  puller: joah,
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
        // pt2: Rivals receive → Zoo scores = Zoo break. Zoo pulls pt3.
        {
          id: 'pt2',
          lines: [
            { sideId: ZOO, participantIds: ['p_august', 'p_meves'] },
            { sideId: RIVALS, participantIds: ['p_joah', 'p_max'] },
          ],
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
                  puller: august,
                  receiver: joah,
                  result: 'inbound',
                },
                { id: 'b2', kind: 'throw', sideId: RIVALS, thrower: joah, result: 'throwaway' },
              ],
            },
            {
              id: 'pos2b',
              sideId: ZOO,
              actions: [
                { id: 'b3', kind: 'disc_pickup', sideId: ZOO, player: meves },
                {
                  id: 'b4',
                  kind: 'throw',
                  sideId: ZOO,
                  thrower: meves,
                  toPlayer: august,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        // pt3: Rivals receive → Rivals score = opp_hold for Zoo / hold for Rivals.
        {
          id: 'pt3',
          lines: [
            { sideId: ZOO, participantIds: ['p_august', 'p_meves'] },
            { sideId: RIVALS, participantIds: ['p_joah', 'p_max'] },
          ],
          possessions: [
            {
              id: 'pos3',
              sideId: RIVALS,
              actions: [
                {
                  id: 'c1',
                  kind: 'pull',
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  receiver: joah,
                  result: 'inbound',
                },
                {
                  id: 'c2',
                  kind: 'throw',
                  sideId: RIVALS,
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

    const { points } = buildAnalyticsGame(game);

    expect(getPointStateForSide(points[0], ZOO)).toBe('hold');
    expect(getPointStateForSide(points[0], RIVALS)).toBe('opp_hold');

    expect(getPointStateForSide(points[1], ZOO)).toBe('break');
    expect(getPointStateForSide(points[1], RIVALS)).toBe('broken');

    expect(getPointStateForSide(points[2], ZOO)).toBe('opp_hold');
    expect(getPointStateForSide(points[2], RIVALS)).toBe('hold');

    const zooHolds = points.filter((p) => getPointStateForSide(p, ZOO) === 'hold').length;
    const zooBreaks = points.filter((p) => getPointStateForSide(p, ZOO) === 'break').length;
    const rivHolds = points.filter((p) => getPointStateForSide(p, RIVALS) === 'hold').length;
    const rivBreaks = points.filter((p) => getPointStateForSide(p, RIVALS) === 'break').length;

    expect(zooHolds).toBe(1);
    expect(zooBreaks).toBe(1);
    expect(rivHolds).toBe(1);
    expect(rivBreaks).toBe(0);
  });

  it('attributions include participants from both sides', () => {
    // Joah (Rivals) pulls → pull attribution. August (Zoo) catches → pull_reception + assist.
    // Meves (Zoo) scores → goal attribution.
    const game: AdvancedTrackedGame = {
      ...baseGame,
      sides: [
        { id: ZOO, label: 'Zoo', trackingMode: 'full-roster' },
        { id: RIVALS, label: 'Rivals', trackingMode: 'full-roster' },
      ],
      initialReceivingSideId: ZOO,
      points: [
        {
          id: 'pt1',
          lines: [
            { sideId: ZOO, participantIds: ['p_august', 'p_meves'] },
            { sideId: RIVALS, participantIds: ['p_joah'] },
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
                  puller: joah,
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

    const { attributions } = buildAnalyticsGame(game);

    expect(sumAttributions(attributions, 'p_joah', 'pull')).toBe(1);
    expect(sumAttributions(attributions, 'p_august', 'pull_reception')).toBe(1);
    expect(sumAttributions(attributions, 'p_august', 'assist')).toBe(1);
    expect(sumAttributions(attributions, 'p_meves', 'goal')).toBe(1);
  });
});

// ── scrimmage ─────────────────────────────────────────────────────────────────

describe('scrimmage', () => {
  // Intra-team game: participants from the same team split into two sides.
  // The same participant can appear on different sides across points.
  // focusSideId is set to one side arbitrarily.

  const WHITE = 'white';
  const DARK = 'dark';

  const scrimmageBase: Omit<AdvancedTrackedGame, 'points'> = {
    ...baseGame,
    gameType: 'scrimmage',
    focusSideId: WHITE,
    initialReceivingSideId: WHITE,
    sides: [
      { id: WHITE, label: 'White', trackingMode: 'full-roster' },
      { id: DARK, label: 'Dark', trackingMode: 'full-roster' },
    ],
  };

  it('compiles correctly when the same participant appears on different sides across points', () => {
    // pt1: August on White side. pt2: August switches to Dark (intra-team rotation).
    const game: AdvancedTrackedGame = {
      ...scrimmageBase,
      points: [
        {
          id: 'pt1',
          lines: [
            { sideId: WHITE, participantIds: ['p_august', 'p_meves'] },
            { sideId: DARK, participantIds: ['p_joah', 'p_max'] },
          ],
          possessions: [
            {
              id: 'pos1',
              sideId: WHITE,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: DARK,
                  receivingSideId: WHITE,
                  puller: joah,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: WHITE,
                  thrower: august,
                  toPlayer: meves,
                  result: 'goal',
                },
              ],
            },
          ],
        },
        // pt2: White scored → Dark receives. August now on Dark.
        {
          id: 'pt2',
          lines: [
            { sideId: WHITE, participantIds: ['p_meves', 'p_sam'] },
            { sideId: DARK, participantIds: ['p_august', 'p_joah'] },
          ],
          possessions: [
            {
              id: 'pos2',
              sideId: DARK,
              actions: [
                {
                  id: 'b1',
                  kind: 'pull',
                  sideId: WHITE,
                  receivingSideId: DARK,
                  puller: meves,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'b2',
                  kind: 'throw',
                  sideId: DARK,
                  thrower: august,
                  toPlayer: joah,
                  result: 'goal',
                },
              ],
            },
          ],
        },
      ],
    };

    const { points, attributions } = buildAnalyticsGame(game);

    // pt1: linesBySide reflects White/Dark split for that point
    expect(points[0].linesBySide[WHITE]).toContain('p_august');
    expect(points[0].linesBySide[DARK]).toContain('p_joah');

    // pt2: August is on Dark — linesBySide reflects the switched assignment
    expect(points[1].linesBySide[DARK]).toContain('p_august');
    expect(points[1].linesBySide[WHITE]).not.toContain('p_august');

    // August gets assist in both points regardless of which side he's on
    expect(sumAttributions(attributions, 'p_august', 'assist')).toBe(2);

    // pt1: White hold / Dark opp_hold
    expect(getPointStateForSide(points[0], WHITE)).toBe('hold');
    expect(getPointStateForSide(points[0], DARK)).toBe('opp_hold');

    // pt2: Dark receives, Dark scores = opp_hold for White / hold for Dark
    expect(getPointStateForSide(points[1], WHITE)).toBe('opp_hold');
    expect(getPointStateForSide(points[1], DARK)).toBe('hold');
  });

  it('point.state reflects focusSideId — consistent with getPointStateForSide for that side', () => {
    const game: AdvancedTrackedGame = {
      ...scrimmageBase,
      points: [
        {
          id: 'pt1',
          lines: [
            { sideId: WHITE, participantIds: ['p_august', 'p_meves'] },
            { sideId: DARK, participantIds: ['p_joah'] },
          ],
          possessions: [
            {
              id: 'pos1',
              sideId: WHITE,
              actions: [
                {
                  id: 'a1',
                  kind: 'pull',
                  sideId: DARK,
                  receivingSideId: WHITE,
                  puller: joah,
                  receiver: august,
                  result: 'inbound',
                },
                {
                  id: 'a2',
                  kind: 'throw',
                  sideId: WHITE,
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

    const { points } = buildAnalyticsGame(game);

    // point.state is always from focusSideId (White) perspective
    expect(points[0].state).toBe('hold');
    expect(points[0].state).toBe(getPointStateForSide(points[0], WHITE));
  });
});

// ── AnalyticsGame metadata fields ─────────────────────────────────────────────

describe('AnalyticsGame metadata fields', () => {
  const zooHoldPoint = {
    id: 'pt1',
    lines: [{ sideId: ZOO, participantIds: ['p_august', 'p_meves'] }],
    possessions: [
      {
        id: 'pos1',
        sideId: ZOO,
        actions: [
          {
            id: 'a1',
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
  };

  const gameWithMeta: AdvancedTrackedGame = {
    ...baseGame,
    createdAt: 9001,
    metadata: { opponentName: 'Rivals FC', location: 'Field A', date: '2024-07-04' },
    points: [zooHoldPoint],
  };

  it('exposes focusSideId matching the raw game', () => {
    expect(buildAnalyticsGame(gameWithMeta).focusSideId).toBe(ZOO);
  });

  it('exposes oppSideId as the non-focus side', () => {
    expect(buildAnalyticsGame(gameWithMeta).oppSideId).toBe(RIVALS);
  });

  it('exposes sideLabels keyed by sideId', () => {
    const { sideLabels } = buildAnalyticsGame(gameWithMeta);
    expect(sideLabels[ZOO]).toBe('Zoo');
    expect(sideLabels[RIVALS]).toBe('Rivals');
  });

  it('exposes participantNames as a Map with correct entries', () => {
    const { participantNames } = buildAnalyticsGame(gameWithMeta);
    expect(participantNames.get('p_august')).toBe('August');
    expect(participantNames.get('p_meves')).toBe('Meves');
    expect(participantNames.size).toBe(participants.length);
  });

  it('passes through metadata', () => {
    const { metadata } = buildAnalyticsGame(gameWithMeta);
    expect(metadata?.opponentName).toBe('Rivals FC');
    expect(metadata?.location).toBe('Field A');
    expect(metadata?.date).toBe('2024-07-04');
  });

  it('passes through createdAt', () => {
    expect(buildAnalyticsGame(gameWithMeta).createdAt).toBe(9001);
  });

  it('metadata is undefined when not set on the raw game', () => {
    const game: AdvancedTrackedGame = { ...baseGame, points: [zooHoldPoint] };
    expect(buildAnalyticsGame(game).metadata).toBeUndefined();
  });
});

// ── getFinalScores ─────────────────────────────────────────────────────────────

describe('getFinalScores', () => {
  const zooHoldPoint = {
    id: 'pt1',
    lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
    possessions: [
      {
        id: 'pos1',
        sideId: ZOO,
        actions: [
          {
            id: 'a1',
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
  };

  const rivalsHoldPoint = (id: string) => ({
    id,
    lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
    possessions: [
      {
        id: `pos_${id}`,
        sideId: RIVALS,
        actions: [
          {
            id: `pull_${id}`,
            kind: 'pull' as const,
            sideId: ZOO,
            receivingSideId: RIVALS,
            puller: august,
            result: 'inbound' as const,
          },
          {
            id: `throw_${id}`,
            kind: 'throw' as const,
            sideId: RIVALS,
            thrower: untracked,
            toPlayer: untracked,
            result: 'goal' as const,
          },
        ],
      },
    ],
  });

  it('returns empty object when there are no points', () => {
    const analytics = buildAnalyticsGame({ ...baseGame, points: [zooHoldPoint] });
    const empty: AnalyticsGame = { ...analytics, points: [] };
    expect(getFinalScores(empty)).toEqual({});
  });

  it('returns correct score after a single Zoo hold', () => {
    const analytics = buildAnalyticsGame({ ...baseGame, points: [zooHoldPoint] });
    expect(getFinalScores(analytics)).toEqual({ [ZOO]: 1, [RIVALS]: 0 });
  });

  it('accumulates scores across multiple points', () => {
    // Zoo holds (1-0), Rivals holds (1-1), Zoo holds (2-1)
    const game: AdvancedTrackedGame = {
      ...baseGame,
      points: [
        { ...zooHoldPoint, id: 'pt1' },
        rivalsHoldPoint('pt2'),
        {
          ...zooHoldPoint,
          id: 'pt3',
          lines: [{ sideId: ZOO, participantIds: ['p_august'] }],
          possessions: [
            {
              id: 'pos3',
              sideId: ZOO,
              actions: [
                {
                  id: 'pull3',
                  kind: 'pull' as const,
                  sideId: RIVALS,
                  receivingSideId: ZOO,
                  puller: untracked,
                  result: 'inbound' as const,
                },
                {
                  id: 'throw3',
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
    expect(getFinalScores(analytics)).toEqual({ [ZOO]: 2, [RIVALS]: 1 });
  });

  it('does not add score when the last point has no scorer (terminated mid-point)', () => {
    // pt1: Zoo holds 1-0. pt2: game terminated during Rivals possession — no score.
    const terminatedGame: AdvancedTrackedGame = {
      ...baseGame,
      status: 'terminated',
      points: [
        { ...zooHoldPoint, id: 'pt1' },
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
                  kind: 'pull' as const,
                  sideId: ZOO,
                  receivingSideId: RIVALS,
                  puller: august,
                  result: 'inbound' as const,
                },
                {
                  id: 'throw2',
                  kind: 'throw' as const,
                  sideId: RIVALS,
                  thrower: untracked,
                  toPlayer: untracked,
                  result: 'complete' as const,
                },
              ],
            },
          ],
        },
      ],
    };
    const analytics = buildAnalyticsGame(terminatedGame);
    expect(getFinalScores(analytics)).toEqual({ [ZOO]: 1, [RIVALS]: 0 });
  });
});
