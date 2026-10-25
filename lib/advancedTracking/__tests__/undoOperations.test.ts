import {
  createAdvancedGameScenario,
  participantRef,
  UNTRACKED_PLAYER,
} from '@/test/fixtures/advancedGameBuilder';

import type { ActionUndoEntry, AdvancedTrackingUndoEntry } from '../persistenceTypes';
import type { TrackedPoint } from '../types';
import { isUndoOfPointEndingAction } from '../undoOperations';

const alex = participantRef('alex');
const blair = participantRef('blair');

function undoOf(
  point: TrackedPoint,
  possessionIndex: number,
  actionIndex: number,
): ActionUndoEntry {
  const possession = point.possessions[possessionIndex];
  return {
    kind: 'action',
    pointId: point.id,
    possessionId: possession.id,
    actionId: possession.actions[actionIndex].id,
  };
}

describe('isUndoOfPointEndingAction', () => {
  // Turnover in the first possession, then the other side scores in the third.
  const ended = createAdvancedGameScenario().dirtyHold().build().points[0];
  const lastPossessionIndex = ended.possessions.length - 1;
  const goalIndex = ended.possessions[lastPossessionIndex].actions.length - 1;
  const live = createAdvancedGameScenario()
    .startPoint({ puller: UNTRACKED_PLAYER, receiver: alex })
    .complete(blair)
    .build().points[0];

  it('is true for the action that ended the point', () => {
    expect(isUndoOfPointEndingAction(undoOf(ended, lastPossessionIndex, goalIndex), ended)).toBe(
      true,
    );
  });

  it.each<[string, AdvancedTrackingUndoEntry | undefined, TrackedPoint | null]>([
    ['no entry', undefined, ended],
    ['no point', undoOf(ended, lastPossessionIndex, goalIndex), null],
    ['an earlier action in the scoring possession', undoOf(ended, lastPossessionIndex, 0), ended],
    [
      'the turnover that ended an earlier possession',
      undoOf(ended, 0, ended.possessions[0].actions.length - 1),
      ended,
    ],
    ['the last action of a point still in play', undoOf(live, 0, 1), live],
    [
      'a standalone undo on the same point',
      { kind: 'halftime_early', pointId: ended.id, transitionId: 't1' },
      ended,
    ],
    [
      'the ending action checked against a different point',
      undoOf(ended, lastPossessionIndex, goalIndex),
      live,
    ],
  ])('is false for %s', (_case, entry, point) => {
    expect(isUndoOfPointEndingAction(entry, point)).toBe(false);
  });
});
