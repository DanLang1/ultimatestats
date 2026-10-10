import type { PossessionAction } from '@/lib/advancedTracking/types';
import {
  createAdvancedGameFixture,
  createAdvancedGameScenario,
  participantRef,
  UNKNOWN_PLAYER,
  UNTRACKED_PLAYER,
} from '@/test/fixtures/advancedGameBuilder';

import {
  getPointDetails,
  getPointContextStats,
  getHockeyAssistName,
  getPointOutcomeLabel,
} from '../betweenPointUtils';

const ZOO = 'zoo';
const RIVALS = 'rivals';
const untracked = { refType: 'untracked' as const };
const august = { refType: 'participant' as const, participantId: 'p_august' };
const meves = { refType: 'participant' as const, participantId: 'p_meves' };

describe('getPointDetails', () => {
  it('does not count an immediate opponent goal after the pull as a focus-side pass', () => {
    const actions: PossessionAction[] = [
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
        id: 'goal1',
        kind: 'throw',
        sideId: RIVALS,
        thrower: untracked,
        toPlayer: untracked,
        result: 'goal',
      },
    ];

    expect(getPointDetails(actions, ZOO)).toEqual({ passCount: 0, turnCount: 0 });
  });

  it('counts focus-side completed throws and goals as passes', () => {
    const actions: PossessionAction[] = [
      {
        id: 'pull1',
        kind: 'pull',
        sideId: RIVALS,
        receivingSideId: ZOO,
        puller: untracked,
        receiver: august,
        result: 'inbound',
      },
      { id: 'pickup1', kind: 'disc_pickup', sideId: ZOO, player: august },
      {
        id: 'throw1',
        kind: 'throw',
        sideId: ZOO,
        thrower: august,
        toPlayer: meves,
        result: 'complete',
      },
      {
        id: 'goal1',
        kind: 'throw',
        sideId: ZOO,
        thrower: meves,
        toPlayer: august,
        result: 'goal',
      },
    ];

    expect(getPointDetails(actions, ZOO)).toEqual({ passCount: 2, turnCount: 0 });
  });
});

it.each(['drop', 'throwaway', 'stall', 'block', 'pressure', 'callahan'] as const)(
  'counts %s on either side as a point turnover',
  (result) => {
    const action: PossessionAction = {
      id: 'turnover',
      kind: 'throw',
      sideId: RIVALS,
      thrower: untracked,
      result,
    };
    expect(getPointDetails([action], ZOO)).toEqual({ passCount: 0, turnCount: 1 });
  },
);

it('counts a dropped pull as a turnover without counting it as a pass', () => {
  expect(
    getPointDetails(
      [
        {
          id: 'pull-drop',
          kind: 'pull',
          sideId: RIVALS,
          receivingSideId: ZOO,
          puller: untracked,
          receiver: august,
          result: 'dropped',
        },
      ],
      ZOO,
    ),
  ).toEqual({ passCount: 0, turnCount: 1 });
});

it('reports offensive efficiency and clean holds while excluding an unfinished point', () => {
  const clean = createAdvancedGameScenario()
    .hold({
      puller: UNTRACKED_PLAYER,
      receiver: participantRef('alex'),
      scorer: participantRef('blair'),
    })
    .buildPoint();
  const dirty = createAdvancedGameScenario().dirtyHold().buildPoint();
  const incomplete = createAdvancedGameScenario()
    .startPoint({ puller: UNTRACKED_PLAYER, receiver: participantRef('alex') })
    .buildPoint();
  const game = createAdvancedGameFixture({ points: [clean, dirty, incomplete] });
  expect(
    getPointContextStats({
      game,
      pointActions: clean.possessions.flatMap((p) => p.actions),
      receivingSideId: 'focus',
      focusSideId: 'focus',
    }),
  ).toEqual([
    { label: 'O efficiency', value: '2/2', icon: 'chart-bar' },
    { label: 'clean holds', value: '1/2', icon: 'shield-check-outline' },
  ]);
});

it.each([undefined, 4200, 0])(
  'shows defensive efficiency and the available pull metric (hang: %s)',
  (hangTimeMs) => {
    const game = createAdvancedGameScenario({ initialReceivingSideId: 'opponent' })
      .breakAfterTurnover({
        puller: participantRef('alex'),
        receiver: UNTRACKED_PLAYER,
        turnoverResult: 'throwaway',
        pickupPlayer: participantRef('blair'),
        scorer: participantRef('casey'),
        hangTimeMs,
      })
      .build();
    expect(
      getPointContextStats({
        game,
        pointActions: game.points[0].possessions.flatMap((p) => p.actions),
        receivingSideId: 'opponent',
        focusSideId: 'focus',
      }),
    ).toEqual([
      { label: 'D efficiency', value: '1/1', icon: 'chart-bar' },
      hangTimeMs === undefined
        ? { label: 'breaks', value: '1/1', icon: 'link-variant-remove' }
        : {
            label: 'pull hang',
            value: `${(hangTimeMs / 1000).toFixed(1)}s`,
            icon: 'timer-outline',
          },
    ]);
  },
);

it('finds the hockey assist across a stoppage in the scoring possession', () => {
  const game = createAdvancedGameScenario()
    .startPoint({ puller: UNTRACKED_PLAYER, receiver: participantRef('alex') })
    .complete(participantRef('blair'))
    .stoppage('timeout', { pausedAt: 1, resumedAt: 2 })
    .goal(participantRef('casey'))
    .build();
  expect(getHockeyAssistName(game.points[0], game.participants)).toBe('Alex');
});

it('does not borrow a hockey assist from an earlier possession', () => {
  const game = createAdvancedGameScenario().dirtyHold({ recoveryPasses: [] }).build();
  expect(getHockeyAssistName(game.points[0], game.participants)).toBeNull();
});

it('does not show a hockey assist before a goal or before a point exists', () => {
  const game = createAdvancedGameScenario()
    .startPoint({ puller: UNTRACKED_PLAYER, receiver: participantRef('alex') })
    .complete(participantRef('blair'))
    .build();
  expect(getHockeyAssistName(game.points[0], game.participants)).toBeNull();
  expect(getHockeyAssistName(null, game.participants)).toBeNull();
});

it('labels an unidentified hockey assist as Unknown', () => {
  const game = createAdvancedGameScenario()
    .startPoint({ puller: UNTRACKED_PLAYER, receiver: UNKNOWN_PLAYER })
    .complete(participantRef('blair'))
    .goal(participantRef('casey'))
    .build();
  expect(getHockeyAssistName(game.points[0], game.participants)).toBe('Unknown');
});

it('omits an anonymous opponent hockey assist', () => {
  const game = createAdvancedGameScenario({ initialReceivingSideId: 'opponent' })
    .startPoint({ puller: participantRef('alex'), receiver: UNTRACKED_PLAYER })
    .complete(UNTRACKED_PLAYER)
    .goal(UNTRACKED_PLAYER)
    .build();
  expect(getHockeyAssistName(game.points[0], game.participants)).toBeNull();
});

it.each([
  [null, 'focus', [], 'Point Complete'],
  ['focus', null, [], 'Point Complete'],
  ['focus', 'focus', ['focus'], 'Focus Clean Hold'],
  ['focus', 'focus', ['focus', 'opponent', 'focus'], 'Focus Dirty Hold'],
  ['focus', 'opponent', ['opponent', 'focus'], 'Focus Break'],
  ['opponent', 'focus', ['focus', 'opponent'], 'Opponent Break'],
  ['opponent', 'opponent', ['opponent'], 'Opponent Hold'],
] as const)(
  'attributes the point outcome to the scoring and receiving sides (%s, %s)',
  (scoringSideId, receivingSideId, possessionSideIds, expected) => {
    expect(
      getPointOutcomeLabel({
        focusSideId: 'focus',
        focusSideLabel: 'Focus',
        opponentSideLabel: 'Opponent',
        scoringSideId,
        receivingSideId,
        possessionSideIds: [...possessionSideIds],
      }),
    ).toBe(expected);
  },
);
