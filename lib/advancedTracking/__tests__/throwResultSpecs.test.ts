import { validatePayload } from '@/lib/sharing/validate';
import {
  ADVANCED_TEST_FOCUS_SIDE_ID,
  ADVANCED_TEST_OPPONENT_SIDE_ID,
  createAdvancedGameScenario,
  participantRef,
} from '@/test/fixtures/advancedGameBuilder';

import { generateAdvancedGameCSV } from '../advancedCSVUtils';
import { buildAdvancedTimeline } from '../advancedTimelineUtils';
import { ADVANCED_TURNOVER_EDITOR_RESULTS } from '../advancedTurnoverCorrectionUtils';
import { buildAnalyticsGame } from '../buildAnalyticsGame';
import { isTurnoverThrow } from '../trackingUtils';
import {
  THROW_RESULT_SPECS,
  THROW_RESULTS,
  type AdvancedTrackedGame,
  type ThrowResult,
} from '../types';

const FOCUS = ADVANCED_TEST_FOCUS_SIDE_ID;
const OPPONENT = ADVANCED_TEST_OPPONENT_SIDE_ID;
const THROWER = participantRef('alex');
const RECEIVER = participantRef('blair');
const DEFENDER = participantRef('eli');
const FOCUS_IDS = ['alex', 'blair', 'casey', 'dana', 'f5', 'f6', 'f7'];
const OPPONENT_IDS = ['eli', 'finn', 'o3', 'o4', 'o5', 'o6', 'o7'];
const NAMES: Record<string, string> = { alex: 'Alex', blair: 'Blair', eli: 'Eli', finn: 'Finn' };

/** The focus side receives and throws `result`; a fully tracked opponent defends. */
function buildGameWithThrow(result: ThrowResult): AdvancedTrackedGame {
  const { outcome, creditedRole } = THROW_RESULT_SPECS[result];
  const scenario = createAdvancedGameScenario({
    status: 'final',
    sides: [
      { id: FOCUS, label: 'Focus', trackingMode: 'full-roster' },
      { id: OPPONENT, label: 'Opponent', trackingMode: 'full-roster' },
    ],
    participants: [...FOCUS_IDS, ...OPPONENT_IDS].map((id) => ({ id, name: NAMES[id] ?? id })),
    defaultLines: [
      { sideId: FOCUS, participantIds: FOCUS_IDS },
      { sideId: OPPONENT, participantIds: OPPONENT_IDS },
    ],
  })
    .startPoint({ puller: DEFENDER, receiver: THROWER })
    .throw(result, {
      ...(creditedRole === 'receiver' ? { toPlayer: RECEIVER } : {}),
      ...(creditedRole === 'defender' ? { defender: DEFENDER } : {}),
    });

  if (outcome === 'continues') scenario.goal(participantRef('casey'));
  if (outcome === 'turnover') {
    scenario.startPossession(OPPONENT).pickup(DEFENDER).goal(participantRef('finn'));
  }
  return scenario.build();
}

function creditedParticipantId(result: ThrowResult): string | null {
  const { creditedRole } = THROW_RESULT_SPECS[result];
  if (creditedRole === 'receiver') return 'blair';
  if (creditedRole === 'defender') return 'eli';
  return null;
}

function sharePayload(game: AdvancedTrackedGame) {
  return {
    type: 'advanced-game',
    appVersion: '1.0.0',
    schemaVersion: 1,
    sharedAt: 0,
    data: game,
  };
}

describe.each(THROW_RESULTS)('throw result "%s"', (result) => {
  const spec = THROW_RESULT_SPECS[result];
  const game = buildGameWithThrow(result);
  const analytics = buildAnalyticsGame(game);
  const firstPossession = analytics.possessions[0];
  const throwActionId = game.points[0].possessions[0].actions[1].id;
  const throwAttributions = analytics.attributions.filter(
    (attribution) => attribution.actionId === throwActionId,
  );

  it('passes import validation', () => {
    expect(() => validatePayload(sharePayload(game))).not.toThrow();
  });

  it('ends the opening possession as its outcome specifies', () => {
    if (spec.outcome === 'turnover' || spec.outcome === 'defense_scores') {
      expect(firstPossession.result).toBe('turned_over');
      expect(firstPossession.turnoverType).toBe(result);
    } else {
      expect(firstPossession.result).toBe('scored');
      expect(firstPossession.turnoverType).toBeUndefined();
    }
  });

  it('counts a throw attempt only when the spec says so', () => {
    const attempts = throwAttributions.filter((a) => a.type === 'throw_attempt');
    expect(attempts).toHaveLength(spec.countsAsAttempt ? 1 : 0);
  });

  it('credits only the thrower and the credited role', () => {
    const creditedIds = new Set(throwAttributions.map((a) => a.participantId));
    creditedIds.delete('alex');
    const expected = creditedParticipantId(result);
    expect([...creditedIds]).toEqual(expected == null ? [] : [expected]);
  });

  it('renders a timeline label and a CSV action-log row', () => {
    const throwAction = buildAdvancedTimeline(game)
      .flatMap((point) => point.possessions.flatMap((possession) => possession.actions))
      .find((action) => action.id === throwActionId);
    expect(throwAction?.primaryLabel).toEqual(expect.any(String));
    expect(throwAction?.primaryLabel).not.toBe('');
    expect(generateAdvancedGameCSV(analytics)).toContain(`,Throw,Alex,${result},`);
  });
});

describe('throw result invariants', () => {
  it('rejects an import whose result requires a tracked defender that is missing', () => {
    const results = THROW_RESULTS.filter(
      (result) => THROW_RESULT_SPECS[result].requiresTrackedDefender,
    );
    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      const game = buildGameWithThrow(result);
      const throwAction = game.points[0].possessions[0].actions[1];
      if (throwAction.kind !== 'throw') throw new Error('Expected throw fixture.');
      throwAction.defender = { refType: 'unknown' };
      expect(() => validatePayload(sharePayload(game))).toThrow('requires a tracked defender');
    }
  });

  it('offers every turnover result in the correction editor', () => {
    const turnoverResults = THROW_RESULTS.filter(isTurnoverThrow);
    expect([...ADVANCED_TURNOVER_EDITOR_RESULTS].sort()).toEqual(
      [...turnoverResults, 'fifty-fifty'].sort(),
    );
  });
});
