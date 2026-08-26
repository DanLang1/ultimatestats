import {
  correctAdvancedTouch,
  getCorrectableAdvancedStandaloneContexts,
  getCorrectableAdvancedTouchSegments,
} from '../advancedTouchCorrectionUtils';
import { buildAnalyticsGame } from '../buildAnalyticsGame';
import type { AdvancedTrackedGame, PlayerRef, PointPossession, TrackedPoint } from '../types';

const HOME = 'home';
const AWAY = 'away';
const ref = (participantId: string): PlayerRef => ({ refType: 'participant', participantId });
const unknown: PlayerRef = { refType: 'unknown' };

function gameParticipants(prefix: string, count = 8) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    name: `${prefix} ${index + 1}`,
  }));
}

function makeGame(
  point: TrackedPoint,
  overrides: Partial<AdvancedTrackedGame> = {},
): AdvancedTrackedGame {
  const participants = gameParticipants('Home');
  return {
    id: 'touch-correction-game',
    schemaVersion: 3,
    createdAt: 100,
    updatedAt: 200,
    gameType: 'game',
    status: 'final',
    focusSideId: HOME,
    initialReceivingSideId: HOME,
    settings: { locationMode: 'none' },
    metadata: { title: 'Touch correction fixture', notes: 'Preserve me' },
    sides: [
      { id: HOME, label: 'Home', trackingMode: 'full-roster' },
      { id: AWAY, label: 'Away', trackingMode: 'anonymous' },
    ],
    participants,
    points: [point],
    ...overrides,
  };
}

function makePoint(
  actions: PointPossession['actions'],
  options: Partial<TrackedPoint> = {},
): TrackedPoint {
  return {
    id: 'point-1',
    lines: [{ sideId: HOME, participantIds: gameParticipants('Home').map((p) => p.id) }],
    possessions: [{ id: 'possession-1', sideId: HOME, actions }],
    ...options,
  };
}

function chainPoint() {
  return makePoint([
    {
      id: 'pickup-1',
      kind: 'disc_pickup',
      sideId: HOME,
      player: ref('Home-1'),
      recordedAt: 10,
    },
    {
      id: 'complete-1',
      kind: 'throw',
      sideId: HOME,
      thrower: ref('Home-1'),
      toPlayer: ref('Home-2'),
      result: 'complete',
      recordedAt: 20,
    },
    {
      id: 'complete-2',
      kind: 'throw',
      sideId: HOME,
      thrower: ref('Home-2'),
      toPlayer: ref('Home-3'),
      result: 'complete',
      recordedAt: 30,
    },
    {
      id: 'goal-1',
      kind: 'throw',
      sideId: HOME,
      thrower: ref('Home-3'),
      toPlayer: ref('Home-4'),
      result: 'goal',
      details: { type: 'huck' },
      origin: { locationType: 'zone', zoneId: 'home-back' },
      recordedAt: 40,
    },
  ]);
}

function getTouch(game: AdvancedTrackedGame, touchId: string) {
  const segment = getCorrectableAdvancedTouchSegments(game)[0];
  const touch = segment.touches.find((candidate) => candidate.touchId === touchId);
  if (touch == null) throw new Error(`Missing touch ${touchId}`);
  return { segment, touch };
}

describe('advanced touch correction domain', () => {
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(999));
  afterEach(() => jest.restoreAllMocks());

  it('enumerates pickup, pass, and terminal occurrences in a completed chain', () => {
    const game = makeGame(chainPoint());
    const [segment] = getCorrectableAdvancedTouchSegments(game);

    expect(segment.touches.map((touch) => touch.touchId)).toEqual([
      'pickup:pickup-1',
      'pass-receiver:complete-1',
      'pass-receiver:complete-2',
      'terminal-receiver:goal-1',
    ]);
    expect(segment.touches.map((touch) => touch.mutatedActionIds)).toEqual([
      ['pickup-1', 'complete-1'],
      ['complete-1', 'complete-2'],
      ['complete-2', 'goal-1'],
      ['goal-1'],
    ]);
  });

  it('creates one-touch segments for supported terminal throws without a pickup', () => {
    const point = makePoint([
      {
        id: 'direct-drop',
        kind: 'throw',
        sideId: HOME,
        thrower: ref('Home-1'),
        toPlayer: ref('Home-2'),
        result: 'drop',
      },
    ]);
    point.possessions.push({
      id: 'direct-goal-possession',
      sideId: HOME,
      actions: [
        {
          id: 'direct-goal',
          kind: 'throw',
          sideId: HOME,
          thrower: ref('Home-3'),
          toPlayer: ref('Home-4'),
          result: 'goal',
        },
      ],
    });

    const segments = getCorrectableAdvancedTouchSegments(makeGame(point));

    expect(segments).toHaveLength(2);
    expect(segments.map((segment) => segment.touches)).toEqual([
      [expect.objectContaining({ touchId: 'terminal-receiver:direct-drop' })],
      [expect.objectContaining({ touchId: 'terminal-receiver:direct-goal' })],
    ]);
  });

  it('replaces an interior touch atomically on both adjacent actions', () => {
    const game = makeGame(chainPoint());
    const { segment } = getTouch(game, 'pass-receiver:complete-2');
    const corrected = correctAdvancedTouch(game, {
      pointId: segment.point.id,
      possessionId: segment.possession.id,
      touchId: 'pass-receiver:complete-2',
      participantId: 'Home-5',
    });
    const actions = corrected.points[0].possessions[0].actions;
    const analytics = buildAnalyticsGame(corrected);

    expect(actions[2]).toMatchObject({ toPlayer: ref('Home-5'), thrower: ref('Home-2') });
    expect(actions[3]).toMatchObject({ thrower: ref('Home-5'), toPlayer: ref('Home-4') });
    expect(game.points[0].possessions[0].actions[2]).toMatchObject({
      toPlayer: ref('Home-3'),
      thrower: ref('Home-2'),
    });
    expect(analytics.attributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'receiving_touch', participantId: 'Home-5' }),
        expect.objectContaining({ type: 'assist', participantId: 'Home-5' }),
      ]),
    );
    expect(analytics.attributions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'assist', participantId: 'Home-3' }),
      ]),
    );
    expect(corrected.updatedAt).toBe(999);
  });

  it('changes terminal goal, drop, and 50/50 receiver fields only', () => {
    const game = makeGame(chainPoint());
    const goalCorrected = correctAdvancedTouch(game, {
      pointId: 'point-1',
      possessionId: 'possession-1',
      touchId: 'terminal-receiver:goal-1',
      participantId: 'Home-6',
    });
    expect(goalCorrected.points[0].possessions[0].actions[3]).toMatchObject({
      thrower: ref('Home-3'),
      toPlayer: ref('Home-6'),
      result: 'goal',
    });
    const goalAnalytics = buildAnalyticsGame(goalCorrected);
    expect(goalAnalytics.attributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'goal', participantId: 'Home-6' }),
        expect.objectContaining({ type: 'assist', participantId: 'Home-3' }),
      ]),
    );
    expect(goalAnalytics.attributions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'goal', participantId: 'Home-4' })]),
    );

    const dropGame = makeGame(
      makePoint([
        {
          id: 'pickup-drop',
          kind: 'disc_pickup',
          sideId: HOME,
          player: ref('Home-1'),
        },
        {
          id: 'drop-1',
          kind: 'throw',
          sideId: HOME,
          thrower: ref('Home-1'),
          toPlayer: ref('Home-2'),
          result: 'drop',
          splitAttribution: true,
        },
      ]),
    );
    dropGame.points[0].possessions.push({
      id: 'possession-goal-after-drop',
      sideId: HOME,
      actions: [
        { id: 'pickup-after-drop', kind: 'disc_pickup', sideId: HOME, player: ref('Home-1') },
        {
          id: 'goal-after-drop',
          kind: 'throw',
          sideId: HOME,
          thrower: ref('Home-1'),
          toPlayer: ref('Home-2'),
          result: 'goal',
        },
      ],
    });
    const dropCorrected = correctAdvancedTouch(dropGame, {
      pointId: 'point-1',
      possessionId: 'possession-1',
      touchId: 'terminal-receiver:drop-1',
      participantId: 'Home-7',
    });
    expect(dropCorrected.points[0].possessions[0].actions[1]).toMatchObject({
      thrower: ref('Home-1'),
      toPlayer: ref('Home-7'),
      result: 'drop',
      splitAttribution: true,
    });
  });

  it('repairs an unknown touch without offering unknown as a replacement', () => {
    const point = makePoint([
      { id: 'pickup-unknown', kind: 'disc_pickup', sideId: HOME, player: unknown },
      {
        id: 'goal-unknown',
        kind: 'throw',
        sideId: HOME,
        thrower: unknown,
        toPlayer: ref('Home-2'),
        result: 'goal',
      },
    ]);
    const game = makeGame(point, {
      participants: gameParticipants('Home'),
    });
    const [segment] = getCorrectableAdvancedTouchSegments(game);
    expect(segment.touches[0].eligibleParticipants.map((p) => p.id)).toContain('Home-2');
    const corrected = correctAdvancedTouch(game, {
      pointId: 'point-1',
      possessionId: 'possession-1',
      touchId: 'pickup:pickup-unknown',
      participantId: 'Home-2',
    });
    expect(corrected.points[0].possessions[0].actions[0]).toMatchObject({
      player: ref('Home-2'),
    });
    expect(corrected.points[0].possessions[0].actions[1]).toMatchObject({
      thrower: ref('Home-2'),
    });
  });

  it('intersects exact-action eligibility across an injury substitution', () => {
    const point = makePoint(
      [
        {
          id: 'pickup-injury',
          kind: 'disc_pickup',
          sideId: HOME,
          player: ref('Home-1'),
        },
        {
          id: 'complete-injury-1',
          kind: 'throw',
          sideId: HOME,
          thrower: ref('Home-1'),
          toPlayer: ref('Home-2'),
          result: 'complete',
        },
        { id: 'injury-1', kind: 'stoppage', sideId: HOME, reason: 'injury' },
        {
          id: 'complete-injury-2',
          kind: 'throw',
          sideId: HOME,
          thrower: ref('Home-2'),
          toPlayer: ref('Home-3'),
          result: 'complete',
        },
        {
          id: 'goal-injury',
          kind: 'throw',
          sideId: HOME,
          thrower: ref('Home-3'),
          toPlayer: ref('Home-4'),
          result: 'goal',
        },
      ],
      {
        subs: [
          {
            id: 'sub-1',
            sideId: HOME,
            type: 'injury',
            inIds: ['Home-9'],
            outIds: ['Home-5'],
            stoppageActionId: 'injury-1',
          },
        ],
      },
    );
    const game = makeGame(point, { participants: gameParticipants('Home', 9) });
    const { touch } = getTouch(game, 'pass-receiver:complete-injury-1');
    expect(touch.eligibleParticipants.map((p) => p.id)).not.toContain('Home-5');
    expect(touch.eligibleParticipants.map((p) => p.id)).toContain('Home-6');
  });

  it('keeps self-pass and repeated participant occurrences independently selectable', () => {
    const point = makePoint([
      { id: 'pickup-self', kind: 'disc_pickup', sideId: HOME, player: ref('Home-1') },
      {
        id: 'self-pass',
        kind: 'throw',
        sideId: HOME,
        thrower: ref('Home-1'),
        toPlayer: ref('Home-1'),
        result: 'complete',
      },
      {
        id: 'goal-self',
        kind: 'throw',
        sideId: HOME,
        thrower: ref('Home-1'),
        toPlayer: ref('Home-2'),
        result: 'goal',
      },
    ]);
    const [segment] = getCorrectableAdvancedTouchSegments(makeGame(point));
    expect(segment.touches.map((touch) => touch.currentParticipantId)).toEqual([
      'Home-1',
      'Home-1',
      'Home-2',
    ]);
    expect(new Set(segment.touches.map((touch) => touch.touchId)).size).toBe(3);
  });

  it('suppresses a segment with invalid receiver-to-thrower continuity', () => {
    const point = makePoint([
      { id: 'pickup-invalid', kind: 'disc_pickup', sideId: HOME, player: ref('Home-1') },
      {
        id: 'complete-invalid',
        kind: 'throw',
        sideId: HOME,
        thrower: ref('Home-1'),
        toPlayer: ref('Home-2'),
        result: 'complete',
      },
      {
        id: 'goal-invalid',
        kind: 'throw',
        sideId: HOME,
        thrower: ref('Home-3'),
        toPlayer: ref('Home-4'),
        result: 'goal',
      },
    ]);
    expect(getCorrectableAdvancedTouchSegments(makeGame(point))).toEqual([]);
  });

  it('does not expose holder chains ending in unsupported turnover attribution', () => {
    const turnoverResults = ['throwaway', 'stall', 'block', 'pressure', 'callahan'] as const;

    for (const result of turnoverResults) {
      const point = makePoint([
        { id: `pickup-${result}`, kind: 'disc_pickup', sideId: HOME, player: ref('Home-1') },
        {
          id: `turnover-${result}`,
          kind: 'throw',
          sideId: HOME,
          thrower: ref('Home-1'),
          result,
          ...(result === 'callahan' ? { defender: ref('Away-1') } : {}),
        },
      ]);
      if (result !== 'callahan') {
        point.possessions.push({
          id: `finishing-possession-${result}`,
          sideId: HOME,
          actions: [
            {
              id: `finishing-pickup-${result}`,
              kind: 'disc_pickup',
              sideId: HOME,
              player: ref('Home-2'),
            },
            {
              id: `finishing-goal-${result}`,
              kind: 'throw',
              sideId: HOME,
              thrower: ref('Home-2'),
              toPlayer: ref('Home-3'),
              result: 'goal',
            },
          ],
        });
      }
      const game = makeGame(point, {
        sides: [
          { id: HOME, label: 'Home', trackingMode: 'full-roster' },
          { id: AWAY, label: 'Away', trackingMode: 'full-roster' },
        ],
        participants: [...gameParticipants('Home'), ...gameParticipants('Away')],
      });
      point.lines.push({
        sideId: AWAY,
        participantIds: gameParticipants('Away').map((participant) => participant.id),
      });

      expect(
        getCorrectableAdvancedTouchSegments(game).some(
          (segment) => segment.possession.id === 'possession-1',
        ),
      ).toBe(false);
    }
  });

  it('corrects pull receivers as a standalone attribution', () => {
    const point = makePoint([
      {
        id: 'pull-1',
        kind: 'pull',
        sideId: AWAY,
        receivingSideId: HOME,
        puller: { refType: 'untracked' },
        receiver: ref('Home-1'),
        result: 'inbound',
      },
      { id: 'pickup-pull', kind: 'disc_pickup', sideId: HOME, player: ref('Home-1') },
      {
        id: 'goal-pull',
        kind: 'throw',
        sideId: HOME,
        thrower: ref('Home-1'),
        toPlayer: ref('Home-2'),
        result: 'goal',
      },
    ]);
    const game = makeGame(point);
    const context = getCorrectableAdvancedStandaloneContexts(game).find(
      (candidate) => candidate.kind === 'pull-receiver',
    );
    if (context == null) throw new Error('Expected a pull receiver correction context.');
    expect(context.sideId).toBe(HOME);
    const corrected = correctAdvancedTouch(game, {
      pointId: 'point-1',
      possessionId: 'possession-1',
      actionId: 'pull-1',
      kind: 'pull-receiver',
      participantId: 'Home-3',
    });
    expect(corrected.points[0].possessions[0].actions[0]).toMatchObject({
      receiver: ref('Home-3'),
    });
  });

  it('corrects a Callahan scorer using defender and defensive-side eligibility', () => {
    const home = gameParticipants('Home', 7);
    const away = gameParticipants('Away', 7);
    const point: TrackedPoint = {
      id: 'point-callahan',
      lines: [
        { sideId: HOME, participantIds: home.map((p) => p.id) },
        { sideId: AWAY, participantIds: away.map((p) => p.id) },
      ],
      possessions: [
        {
          id: 'possession-callahan',
          sideId: AWAY,
          actions: [
            {
              id: 'callahan-1',
              kind: 'throw',
              sideId: AWAY,
              thrower: unknown,
              defender: ref('Home-1'),
              toPlayer: ref('Home-3'),
              result: 'callahan',
            },
          ],
        },
      ],
    };
    const game = makeGame(point, {
      sides: [
        { id: HOME, label: 'Home', trackingMode: 'full-roster' },
        { id: AWAY, label: 'Away', trackingMode: 'full-roster' },
      ],
      participants: [...home, ...away],
    });
    const contexts = getCorrectableAdvancedStandaloneContexts(game);
    expect(contexts.find((context) => context.kind === 'callahan-scorer')?.sideId).toBe(HOME);
    const corrected = correctAdvancedTouch(game, {
      pointId: 'point-callahan',
      possessionId: 'possession-callahan',
      actionId: 'callahan-1',
      kind: 'callahan-scorer',
      participantId: 'Home-2',
    });
    expect(corrected.points[0].possessions[0].actions[0]).toMatchObject({
      defender: ref('Home-2'),
      result: 'callahan',
    });
    expect(corrected.points[0].possessions[0].actions[0]).not.toHaveProperty('toPlayer');
    const analytics = buildAnalyticsGame(corrected);
    expect(analytics.attributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'callahan', participantId: 'Home-2' }),
        expect.objectContaining({ type: 'block', participantId: 'Home-2' }),
        expect.objectContaining({ type: 'goal', participantId: 'Home-2' }),
      ]),
    );
    expect(analytics.attributions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'callahan', participantId: 'Home-1' }),
      ]),
    );
  });

  it('uses each side historical line for fully tracked scrimmage points', () => {
    const home = gameParticipants('Home', 7);
    const away = gameParticipants('Away', 7);
    const point: TrackedPoint = {
      id: 'point-scrimmage',
      lines: [
        { sideId: HOME, participantIds: home.map((p) => p.id) },
        { sideId: AWAY, participantIds: away.map((p) => p.id) },
      ],
      possessions: [
        {
          id: 'possession-scrimmage',
          sideId: AWAY,
          actions: [
            { id: 'pickup-scrimmage', kind: 'disc_pickup', sideId: AWAY, player: ref('Away-1') },
            {
              id: 'goal-scrimmage',
              kind: 'throw',
              sideId: AWAY,
              thrower: ref('Away-1'),
              toPlayer: ref('Away-2'),
              result: 'goal',
            },
          ],
        },
      ],
    };
    const game = makeGame(point, {
      gameType: 'scrimmage',
      sides: [
        { id: HOME, label: 'White', trackingMode: 'full-roster' },
        { id: AWAY, label: 'Dark', trackingMode: 'full-roster' },
      ],
      participants: [...home, ...away],
    });
    const [segment] = getCorrectableAdvancedTouchSegments(game);
    expect(segment.sideId).toBe(AWAY);
    expect(segment.touches[0].eligibleParticipants.map((p) => p.id)).toContain('Away-3');
    expect(segment.touches[0].eligibleParticipants.map((p) => p.id)).not.toContain('Home-1');
  });

  it('excludes unfinished points, including terminated unfinished finals', () => {
    const unfinished = makePoint([
      { id: 'pickup-unfinished', kind: 'disc_pickup', sideId: HOME, player: ref('Home-1') },
    ]);
    expect(getCorrectableAdvancedTouchSegments(makeGame(unfinished))).toEqual([]);
    expect(
      getCorrectableAdvancedStandaloneContexts(
        makeGame(unfinished, { status: 'terminated', endReason: 'manual' }),
      ),
    ).toEqual([]);
  });

  it('preserves all non-attribution metadata and action fields', () => {
    const game = makeGame(chainPoint());
    const original = structuredClone(game);
    const corrected = correctAdvancedTouch(game, {
      pointId: 'point-1',
      possessionId: 'possession-1',
      touchId: 'terminal-receiver:goal-1',
      participantId: 'Home-8',
    });
    expect(corrected.metadata).toEqual(original.metadata);
    expect(corrected.createdAt).toBe(original.createdAt);
    expect(corrected.points[0].startedAt).toBe(original.points[0].startedAt);
    expect(corrected.points[0].possessions[0].actions[3]).toMatchObject({
      id: 'goal-1',
      result: 'goal',
      details:
        original.points[0].possessions[0].actions[3].kind === 'throw'
          ? original.points[0].possessions[0].actions[3].details
          : undefined,
      origin: { locationType: 'zone', zoneId: 'home-back' },
      recordedAt: 40,
    });
    expect(game).toEqual(original);
  });
});
