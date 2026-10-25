import {
  assertValidInjurySubInput,
  assertValidPointLineHistory,
  assertValidSideIds,
  getCurrentPoint,
  getCurrentPossession,
  hasInjurySubChanges,
  hasPointEnded,
} from '@/lib/advancedTracking/trackingUtils';
import type {
  AdvancedTrackedGame,
  InjurySubChange,
  PointSub,
  StoppageAction,
  TrackedPoint,
} from '@/lib/advancedTracking/types';
import type { WriteContext } from '@/lib/advancedTracking/writeContext';

export interface RecordInjurySubsInput {
  sideId?: string;
  changes: InjurySubChange[];
}

export interface UpdateInjurySubsInput {
  stoppageActionId: string;
  changes: InjurySubChange[];
}

export function replaceSubsForStoppage(
  point: TrackedPoint,
  stoppageActionId: string,
  changes: InjurySubChange[],
  newId: () => string,
): PointSub[] | undefined {
  const existingSubs = point.subs ?? [];
  const existingForStoppage = existingSubs.filter(
    (sub) => sub.stoppageActionId === stoppageActionId,
  );
  const retainedSubs = existingSubs.filter((sub) => sub.stoppageActionId !== stoppageActionId);
  const firstExistingIndex = existingSubs.findIndex(
    (sub) => sub.stoppageActionId === stoppageActionId,
  );
  const insertionIndex =
    firstExistingIndex === -1
      ? retainedSubs.length
      : existingSubs
          .slice(0, firstExistingIndex)
          .filter((sub) => sub.stoppageActionId !== stoppageActionId).length;
  const replacements = changes.filter(hasInjurySubChanges).map((change) => ({
    id: existingForStoppage.find((sub) => sub.sideId === change.sideId)?.id ?? newId(),
    sideId: change.sideId,
    type: 'injury' as const,
    inIds: change.inIds,
    outIds: change.outIds,
    stoppageActionId,
  }));

  retainedSubs.splice(insertionIndex, 0, ...replacements);
  return retainedSubs.length > 0 ? retainedSubs : undefined;
}

export function withAppendedStoppage(
  point: TrackedPoint,
  possessionId: string,
  stoppage: StoppageAction,
): TrackedPoint {
  return {
    ...point,
    possessions: point.possessions.map((possession) =>
      possession.id === possessionId
        ? { ...possession, actions: [...possession.actions, stoppage] }
        : possession,
    ),
  };
}

/**
 * Stops play for an injury and records its substitutions on the current point. The caller asserts
 * `canChangeLine`. Throws before mutating when the side is unknown, nothing changes, or the
 * resulting line history is invalid. Returns the stoppage's action ID.
 */
export function applyInjurySubs(
  game: AdvancedTrackedGame,
  input: RecordInjurySubsInput,
  ctx: WriteContext,
): string {
  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  if (point == null || possession == null) throw new Error('No current possession for an injury.');
  if (input.sideId != null) {
    assertValidSideIds(game, [input.sideId]);
  }
  if (!input.changes.some(hasInjurySubChanges)) {
    throw new Error('An injury substitution must change at least one lineup.');
  }

  const stoppage: StoppageAction = {
    id: ctx.newId(),
    kind: 'stoppage',
    reason: 'injury',
    sideId: input.sideId,
    recordedAt: ctx.at,
    pausedAt: ctx.at,
  };
  const candidatePoint = withAppendedStoppage(point, possession.id, stoppage);
  candidatePoint.subs = replaceSubsForStoppage(
    candidatePoint,
    stoppage.id,
    input.changes,
    ctx.newId,
  );
  assertValidPointLineHistory(game, candidatePoint);

  possession.actions.push(stoppage);
  point.subs = candidatePoint.subs;
  return stoppage.id;
}

/**
 * Replaces the substitutions recorded at an injury stoppage on the in-progress point. Throws before
 * mutating when the point has ended or the resulting line history is invalid.
 */
export function applyInjurySubUpdate(
  game: AdvancedTrackedGame,
  input: UpdateInjurySubsInput,
  newId: () => string,
): void {
  const point = getCurrentPoint(game);
  if (point == null) throw new Error('No active point.');
  if (hasPointEnded(point)) {
    throw new Error('Cannot update an injury substitution after the point has ended.');
  }

  const nextSubs = replaceSubsForStoppage(point, input.stoppageActionId, input.changes, newId);
  const candidatePoint = { ...point, subs: nextSubs };
  for (const change of input.changes) {
    assertValidInjurySubInput(game, candidatePoint, {
      stoppageActionId: input.stoppageActionId,
      ...change,
    });
  }
  assertValidPointLineHistory(game, candidatePoint);

  point.subs = nextSubs;
}

/**
 * Returns every PointSub associated with a specific stoppage action ID.
 */
export function getSubsForStoppage(point: TrackedPoint | null, actionId: string): PointSub[] {
  if (!point?.subs) return [];
  return point.subs.filter((sub) => sub.stoppageActionId === actionId);
}
