import { getSafeDiscHolderRef } from './trackingDisplayHelpers';
import type { AdvancedTrackedGame, TrackedPoint } from './types';

/** Drops subs recorded at the given stoppages; collapses an emptied list to `undefined`. */
export function removeSubsForStoppages(
  point: TrackedPoint,
  stoppageIds: ReadonlySet<string>,
): void {
  if (point.subs == null || stoppageIds.size === 0) return;
  const remainingSubs = point.subs.filter((sub) => !stoppageIds.has(sub.stoppageActionId));
  point.subs = remainingSubs.length > 0 ? remainingSubs : undefined;
}

/**
 * Removes one action from a live game draft. An emptied possession is removed, and the point too
 * when it was the point's only possession. Replaces `game.points` or `point.possessions` in those
 * cases, so callers must not reuse references to them afterwards.
 */
export function removeActionById(
  game: AdvancedTrackedGame,
  pointId: string,
  possessionId: string,
  actionId: string,
): void {
  const point = game.points.find((candidate) => candidate.id === pointId);
  const possession = point?.possessions.find((candidate) => candidate.id === possessionId);
  const actionIndex = possession?.actions.findIndex((candidate) => candidate.id === actionId) ?? -1;
  if (point == null || possession == null || actionIndex === -1) {
    throw new Error(
      `Action not found: point "${pointId}", possession "${possessionId}", action "${actionId}".`,
    );
  }

  const [removedAction] = possession.actions.splice(actionIndex, 1);

  if (removedAction.kind === 'stoppage') {
    removeSubsForStoppages(point, new Set([removedAction.id]));
  }

  if (possession.actions.length === 0) {
    if (point.possessions.length > 1) {
      point.possessions = point.possessions.filter((candidate) => candidate.id !== possessionId);
    } else {
      game.points = game.points.filter((candidate) => candidate.id !== pointId);
    }
    return;
  }

  const possessionSide = game.sides.find((side) => side.id === possession.sideId);
  if (
    possession.redZone != null &&
    possessionSide?.trackingMode === 'full-roster' &&
    getSafeDiscHolderRef(possession, possession.sideId, point) == null
  ) {
    delete possession.redZone;
  }
}
