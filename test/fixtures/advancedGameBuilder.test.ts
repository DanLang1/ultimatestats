import { ADVANCED_TRACKING_SCHEMA_VERSION } from '@/lib/advancedTracking/types';
import {
  ADVANCED_TEST_FOCUS_SIDE_ID,
  ADVANCED_TEST_OPPONENT_SIDE_ID,
  createAdvancedGameScenario,
  defineAdvancedGameTestContext,
  participantRef,
  UNTRACKED_PLAYER,
} from '@/test/fixtures/advancedGameBuilder';

describe('AdvancedGameScenarioBuilder', () => {
  it('builds current-schema games with deterministic canonical IDs', () => {
    const game = createAdvancedGameScenario({ id: 'builder-contract' })
      .startPoint({ puller: UNTRACKED_PLAYER, receiver: participantRef('alex') })
      .complete(participantRef('blair'))
      .goal(participantRef('casey'))
      .build();

    expect(game.schemaVersion).toBe(ADVANCED_TRACKING_SCHEMA_VERSION);
    expect(game.points[0]).toMatchObject({
      id: 'builder-contract-point-1',
      possessions: [
        {
          id: 'builder-contract-possession-1',
          actions: [
            { id: 'builder-contract-action-1', kind: 'pull' },
            { id: 'builder-contract-action-2', kind: 'throw', result: 'complete' },
            { id: 'builder-contract-action-3', kind: 'throw', result: 'goal' },
          ],
        },
      ],
    });
  });

  it('derives the next receiving side from the previous score', () => {
    const game = createAdvancedGameScenario({ id: 'receiving-side-contract' })
      .startPoint({ puller: UNTRACKED_PLAYER, receiver: participantRef('alex') })
      .goal(participantRef('blair'))
      .startPoint({ puller: participantRef('alex'), receiver: UNTRACKED_PLAYER })
      .goal()
      .build();

    expect(game.points[0].possessions[0].sideId).toBe(ADVANCED_TEST_FOCUS_SIDE_ID);
    expect(game.points[1].possessions[0].sideId).toBe(ADVANCED_TEST_OPPONENT_SIDE_ID);
  });

  it('builds a validated point for tests that compose game-level fixtures', () => {
    const point = createAdvancedGameScenario({ id: 'point-contract' })
      .startPoint({ puller: UNTRACKED_PLAYER, receiver: participantRef('alex') })
      .goal(participantRef('blair'))
      .buildPoint();

    expect(point).toMatchObject({
      id: 'point-contract-point-1',
      possessions: [{ actions: [{ kind: 'pull' }, { kind: 'throw', result: 'goal' }] }],
    });
  });

  it('builds analytics directly from a named point outcome', () => {
    const analytics = createAdvancedGameScenario({ id: 'hold-contract' })
      .hold({
        puller: UNTRACKED_PLAYER,
        receiver: participantRef('alex'),
        passes: [participantRef('blair')],
        scorer: participantRef('casey'),
      })
      .buildAnalytics();

    expect(analytics.points[0]).toMatchObject({ state: 'hold', isCleanHold: true });
    expect(analytics.actions.filter((action) => action.kind === 'throw')).toHaveLength(2);
  });

  it('builds a break after a grounded turnover', () => {
    const analytics = createAdvancedGameScenario({
      id: 'break-contract',
      initialReceivingSideId: ADVANCED_TEST_OPPONENT_SIDE_ID,
    })
      .breakAfterTurnover({
        puller: participantRef('alex'),
        receiver: UNTRACKED_PLAYER,
        turnoverResult: 'block',
        defender: participantRef('blair'),
        pickupPlayer: participantRef('casey'),
        scorer: participantRef('dana'),
      })
      .buildAnalytics();

    expect(analytics.points[0]).toMatchObject({
      state: 'break',
      scoringSideId: ADVANCED_TEST_FOCUS_SIDE_ID,
    });
    expect(analytics.possessions).toHaveLength(2);
  });

  it('derives players and game composition from a reusable test context', () => {
    const context = defineAdvancedGameTestContext({
      id: 'context-contract',
      focusSideId: 'home',
      initialReceivingSideId: 'home',
      sides: [
        { id: 'home', label: 'Home', trackingMode: 'full-roster' },
        { id: 'away', label: 'Away', trackingMode: 'anonymous' },
      ],
      players: {
        handler: { id: 'handler', name: 'Handler' },
        cutter: { id: 'cutter', name: 'Cutter' },
      },
      defaultLines: [{ sideId: 'home', participantIds: ['handler', 'cutter'] }],
    });
    const point = context
      .scenario({ id: 'context-point' })
      .hold({
        puller: context.untracked,
        receiver: context.players.handler,
        scorer: context.players.cutter,
      })
      .buildPoint();
    const game = context.gameFromPoints([point]);
    const analytics = context.analyticsFromPoints([point]);

    expect(context.focusSideId).toBe('home');
    expect(game.participants.map((participant) => participant.id)).toEqual(['handler', 'cutter']);
    expect(game.points).toHaveLength(1);
    expect(analytics.points[0].state).toBe('hold');
  });

  it('rejects references to participants outside the game fixture', () => {
    const scenario = createAdvancedGameScenario({ id: 'invalid-reference-contract' })
      .startPoint({ puller: UNTRACKED_PLAYER, receiver: participantRef('missing') })
      .goal(participantRef('alex'));

    expect(() => scenario.build()).toThrow('Unknown participantId "missing"');
  });

  it.each(['ob', 'roller'] as const)('rejects a receiver on a %s pull', (pullResult) => {
    expect(() =>
      createAdvancedGameScenario().startPoint({
        puller: UNTRACKED_PLAYER,
        receiver: participantRef('alex'),
        pullResult,
      }),
    ).toThrow(`A ${pullResult} pull cannot have a receiver.`);
  });

  it('keeps a receiver on a dropped pull for drop attribution', () => {
    const analytics = createAdvancedGameScenario()
      .startPoint({
        puller: UNTRACKED_PLAYER,
        receiver: participantRef('alex'),
        pullResult: 'dropped',
      })
      .buildAnalytics();

    expect(analytics.attributions).toContainEqual(
      expect.objectContaining({ participantId: 'alex', type: 'drop' }),
    );
  });

  it('keeps an explicit unsafe escape hatch for malformed-input tests', () => {
    const game = createAdvancedGameScenario({ id: 'unsafe-contract' })
      .startPoint({ puller: UNTRACKED_PLAYER, receiver: participantRef('missing') })
      .goal(participantRef('alex'))
      .buildUnsafe();

    expect(game.points[0].possessions[0].actions[0]).toMatchObject({
      kind: 'pull',
      receiver: { refType: 'participant', participantId: 'missing' },
    });
  });

  it('rejects between-point transitions while a point is unfinished', () => {
    const scenario = createAdvancedGameScenario({
      id: 'unfinished-transition-contract',
    }).startPoint({ puller: UNTRACKED_PLAYER, receiver: participantRef('alex') });

    expect(() =>
      scenario.transitionAfterPoint({
        transitionType: 'timeout',
        sideId: ADVANCED_TEST_FOCUS_SIDE_ID,
      }),
    ).toThrow('A between-point transition requires a completed point.');
  });

  it('records a mid-point hard cap without an after-point boundary', () => {
    const game = createAdvancedGameScenario({ id: 'hard-cap-contract' })
      .startPoint({ puller: UNTRACKED_PLAYER, receiver: participantRef('alex') })
      .gameTransition({ transitionType: 'hard_cap' })
      .build();

    expect(game.gameTransitions).toEqual([
      { id: 'hard-cap-contract-game-transition-1', transitionType: 'hard_cap' },
    ]);
  });
});
