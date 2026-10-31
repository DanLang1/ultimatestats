import {
  ADVANCED_TEST_FOCUS_SIDE_ID,
  ADVANCED_TEST_OPPONENT_SIDE_ID,
  createAdvancedGameScenario,
  participantRef,
  UNTRACKED_PLAYER,
} from '@/test/fixtures/advancedGameBuilder';

import { computeScoreFlow } from '../scoreFlowUtils';

const alex = participantRef('alex');
const blair = participantRef('blair');
const casey = participantRef('casey');

const focusHold = { puller: UNTRACKED_PLAYER, receiver: alex, passes: [blair], scorer: casey };
const opponentHold = { puller: alex, receiver: UNTRACKED_PLAYER, scorer: UNTRACKED_PLAYER };
const focusBreak = {
  puller: alex,
  receiver: UNTRACKED_PLAYER,
  turnoverResult: 'throwaway' as const,
  pickupPlayer: alex,
  passes: [blair],
  scorer: casey,
};
const opponentBreak = {
  puller: UNTRACKED_PLAYER,
  receiver: alex,
  turnoverResult: 'throwaway' as const,
  pickupPlayer: UNTRACKED_PLAYER,
  scorer: UNTRACKED_PLAYER,
};

describe('computeScoreFlow', () => {
  const comebackGame = createAdvancedGameScenario()
    .breakAfterTurnover(opponentBreak)
    .hold(focusHold)
    .breakAfterTurnover(focusBreak)
    .gameTransition({ transitionType: 'halftime' })
    .hold(opponentHold)
    .hold(focusHold)
    .breakAfterTurnover(focusBreak)
    .startPoint({ puller: UNTRACKED_PLAYER, receiver: alex })
    .buildAnalytics();

  it('tracks the margin after each scored point and skips the unfinished one', () => {
    const flow = computeScoreFlow(comebackGame, ADVANCED_TEST_FOCUS_SIDE_ID);

    expect(flow.steps).toEqual([
      { outcome: 'broken', margin: -1 },
      { outcome: 'hold', margin: 0 },
      { outcome: 'break', margin: 1 },
      { outcome: 'opp_hold', margin: 0 },
      { outcome: 'hold', margin: 1 },
      { outcome: 'break', margin: 2 },
    ]);
    expect(flow).toMatchObject({
      halftime: { myScore: 2, opponentScore: 1 },
      biggestLead: 2,
      leadChanges: 1,
    });
  });

  it('reads the same game from the opponent side', () => {
    const flow = computeScoreFlow(comebackGame, ADVANCED_TEST_OPPONENT_SIDE_ID);

    expect(flow.steps.map((step) => step.margin)).toEqual([1, 0, -1, 0, -1, -2]);
  });

  it('counts each time the lead passes to the other side', () => {
    const game = createAdvancedGameScenario()
      .hold(focusHold)
      .hold(opponentHold)
      .breakAfterTurnover(opponentBreak)
      .hold(focusHold)
      .breakAfterTurnover(focusBreak)
      .hold(opponentHold)
      .breakAfterTurnover(opponentBreak)
      .buildAnalytics();
    const flow = computeScoreFlow(game, ADVANCED_TEST_FOCUS_SIDE_ID);

    expect(flow.leadChanges).toBe(3);
  });

  it('reports the halftime score once the first second-half point is live', () => {
    const flow = computeScoreFlow(
      createAdvancedGameScenario()
        .hold(focusHold)
        .gameTransition({ transitionType: 'halftime' })
        .startPoint({ puller: alex })
        .buildAnalytics(),
      ADVANCED_TEST_FOCUS_SIDE_ID,
    );

    expect(flow.halftime).toEqual({ myScore: 1, opponentScore: 0 });
  });

  it('has no halftime before the second half starts', () => {
    const flow = computeScoreFlow(
      createAdvancedGameScenario().hold(focusHold).buildAnalytics(),
      ADVANCED_TEST_FOCUS_SIDE_ID,
    );

    expect(flow.halftime).toBeNull();
  });
});
