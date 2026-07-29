import { hasInjurySubChanges } from '@/lib/advancedTracking/trackingUtils';
import type {
  InjurySubChange,
  PointSub,
  StoppageAction,
  TrackedPoint,
} from '@/lib/advancedTracking/types';
import { generateId } from '@/lib/utils';

export function replaceSubsForStoppage(
  point: TrackedPoint,
  stoppageActionId: string,
  changes: InjurySubChange[],
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
    id: existingForStoppage.find((sub) => sub.sideId === change.sideId)?.id ?? generateId(),
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
