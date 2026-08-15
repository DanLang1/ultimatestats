import {
  correctAdvancedGoalScorer,
  getActiveParticipantIdsAtAction,
  getAdvancedGoalScorerCorrectionContext,
  getCorrectableAdvancedGoalContexts,
} from '../advancedActionCorrectionUtils';
import { buildAnalyticsGame } from '../buildAnalyticsGame';
import type { AdvancedTrackedGame } from '../types';

const HOME = 'home';
const AWAY = 'away';

const participantRef = (participantId: string) => ({
  refType: 'participant' as const,
  participantId,
});

function makeGoalGame(): AdvancedTrackedGame {
  return {
    id: 'goal-correction-game',
    schemaVersion: 2,
    createdAt: 1,
    updatedAt: 1,
    gameType: 'game',
    status: 'final',
    focusSideId: HOME,
    initialReceivingSideId: HOME,
    settings: { locationMode: 'none' },
    sides: [
      { id: HOME, label: 'Home', trackingMode: 'full-roster' },
      { id: AWAY, label: 'Away', trackingMode: 'anonymous' },
    ],
    participants: [
      { id: 'thrower', name: 'Thrower' },
      { id: 'subbed-out', name: 'Subbed Out' },
      { id: 'scorer', name: 'Original Scorer' },
      { id: 'replacement', name: 'Replacement Scorer' },
      { id: 'bench', name: 'Bench Player' },
    ],
    points: [
      {
        id: 'point-1',
        lines: [
          {
            sideId: HOME,
            participantIds: ['thrower', 'subbed-out', 'scorer'],
          },
        ],
        subs: [
          {
            id: 'sub-1',
            sideId: HOME,
            type: 'injury',
            inIds: ['replacement'],
            outIds: ['subbed-out'],
            stoppageActionId: 'injury-1',
          },
        ],
        possessions: [
          {
            id: 'possession-1',
            sideId: HOME,
            actions: [
              {
                id: 'injury-1',
                kind: 'stoppage',
                reason: 'injury',
                pausedAt: 100,
                resumedAt: 200,
              },
              {
                id: 'goal-1',
                kind: 'throw',
                sideId: HOME,
                thrower: participantRef('thrower'),
                toPlayer: participantRef('scorer'),
                result: 'goal',
              },
            ],
          },
        ],
      },
    ],
  };
}

const goalLocator = {
  pointId: 'point-1',
  possessionId: 'possession-1',
  actionId: 'goal-1',
};

describe('advanced action corrections', () => {
  it('resolves the exact active lineup after injury substitutions', () => {
    const game = makeGoalGame();
    const point = game.points[0];

    expect(getActiveParticipantIdsAtAction(point, 'injury-1', HOME)).toEqual([
      'thrower',
      'subbed-out',
      'scorer',
    ]);
    expect(getActiveParticipantIdsAtAction(point, 'goal-1', HOME)).toEqual([
      'thrower',
      'scorer',
      'replacement',
    ]);
  });

  it('offers active scoring-side players except the thrower', () => {
    const context = getAdvancedGoalScorerCorrectionContext(makeGoalGame(), goalLocator);

    expect(context.currentScorerParticipantId).toBe('scorer');
    expect(context.eligibleParticipants.map((participant) => participant.id)).toEqual([
      'scorer',
      'replacement',
    ]);
  });

  it('skips an invalid point history while preserving other editable scoring points', () => {
    const game = makeGoalGame();
    const validPoint = structuredClone(game.points[0]);
    validPoint.id = 'point-2';
    validPoint.possessions[0].id = 'possession-2';
    validPoint.possessions[0].actions[0].id = 'injury-2';
    validPoint.possessions[0].actions[1].id = 'goal-2';
    validPoint.subs![0].id = 'sub-2';
    validPoint.subs![0].stoppageActionId = 'injury-2';
    game.points.push(validPoint);
    game.points[0].subs![0].outIds = ['bench'];

    expect(() => getAdvancedGoalScorerCorrectionContext(game, goalLocator)).toThrow(
      'is not active for side',
    );
    expect(
      getCorrectableAdvancedGoalContexts(game).map((context) => ({
        pointId: context.point.id,
        possessionId: context.possession.id,
        actionId: context.action.id,
      })),
    ).toEqual([{ pointId: 'point-2', possessionId: 'possession-2', actionId: 'goal-2' }]);
  });

  it('surfaces correction-context errors unrelated to line-history validation', () => {
    const game = makeGoalGame();
    game.sides = [game.sides[0]];
    const action = game.points[0].possessions[0].actions[1];
    if (action.kind !== 'throw') throw new Error('Expected goal throw fixture.');
    action.result = 'callahan';

    expect(() => getCorrectableAdvancedGoalContexts(game)).toThrow('Could not find opposite side');
  });

  it('corrects the scorer without changing the source game, assist, or point outcome', () => {
    const game = makeGoalGame();
    const corrected = correctAdvancedGoalScorer(game, {
      ...goalLocator,
      participantId: 'replacement',
    });
    const originalAction = game.points[0].possessions[0].actions[1];
    const correctedAction = corrected.points[0].possessions[0].actions[1];
    const analytics = buildAnalyticsGame(corrected);

    expect(originalAction).toMatchObject({
      kind: 'throw',
      toPlayer: participantRef('scorer'),
    });
    expect(correctedAction).toMatchObject({
      id: 'goal-1',
      kind: 'throw',
      result: 'goal',
      sideId: HOME,
      thrower: participantRef('thrower'),
      toPlayer: participantRef('replacement'),
    });
    expect(analytics.points[0].scoringSideId).toBe(HOME);
    expect(analytics.attributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'goal', participantId: 'replacement' }),
        expect.objectContaining({ type: 'assist', participantId: 'thrower' }),
      ]),
    );
    expect(analytics.attributions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'goal', participantId: 'scorer' })]),
    );
  });

  it.each([
    ['a player who had already subbed out', 'subbed-out'],
    ['a player who was never active', 'bench'],
    ['the thrower on the same goal', 'thrower'],
  ])('rejects %s', (_description, participantId) => {
    expect(() =>
      correctAdvancedGoalScorer(makeGoalGame(), {
        ...goalLocator,
        participantId,
      }),
    ).toThrow('not active for the scoring side');
  });

  it('corrects a single-team Callahan scorer through its scoring attribution field', () => {
    const game = makeGoalGame();
    game.initialReceivingSideId = AWAY;
    game.points[0].subs = undefined;
    game.points[0].possessions[0] = {
      id: 'possession-1',
      sideId: AWAY,
      actions: [
        {
          id: 'goal-1',
          kind: 'throw',
          sideId: AWAY,
          thrower: { refType: 'untracked' },
          toPlayer: participantRef('scorer'),
          result: 'callahan',
        },
      ],
    };

    const corrected = correctAdvancedGoalScorer(game, {
      ...goalLocator,
      participantId: 'subbed-out',
    });
    const action = corrected.points[0].possessions[0].actions[0];
    const analytics = buildAnalyticsGame(corrected);

    expect(action).toMatchObject({
      kind: 'throw',
      result: 'callahan',
      toPlayer: participantRef('subbed-out'),
    });
    expect(analytics.attributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'callahan', participantId: 'subbed-out' }),
        expect.objectContaining({ type: 'goal', participantId: 'subbed-out' }),
      ]),
    );
  });
});
