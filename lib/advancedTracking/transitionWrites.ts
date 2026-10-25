/**
 * Live writes for transitions between points and halves. The store asserts the tracker command
 * first and pushes any returned undo entry. A between-point timeout is not undoable: it is
 * cancelled while running and permanent once ended.
 */
import type { EarlyHalftimeUndoEntry } from './persistenceTypes';
import { getCurrentPoint } from './trackingUtils';
import type { AdvancedTrackedGame } from './types';
import type { WriteContext } from './writeContext';

/** Starts a timeout after the current (completed) point. Returns the new transition ID. */
export function applyBetweenPointTimeout(
  game: AdvancedTrackedGame,
  timeout: { sideId: string; isFloater: boolean },
  ctx: WriteContext,
): string {
  const point = getCurrentPoint(game);
  if (point == null) throw new Error('No completed point for a between-point timeout.');
  const transitionId = ctx.newId();
  if (point.transitionsAfter == null) {
    point.transitionsAfter = [];
  }
  point.transitionsAfter.push({
    id: transitionId,
    transitionType: 'timeout',
    sideId: timeout.sideId,
    ...(timeout.isFloater ? { isFloater: true } : {}),
    startedAt: ctx.at,
  });
  return transitionId;
}

/** Ends the between-point timeout `transitionId` on the current point. */
export function applyBetweenPointTimeoutEnd(
  game: AdvancedTrackedGame,
  transitionId: string,
  at: number,
): void {
  const timeout = getCurrentPoint(game)?.transitionsAfter?.find(
    (transition) => transition.id === transitionId,
  );
  if (timeout == null) {
    throw new Error(`Between-point timeout "${transitionId}" was not found.`);
  }
  timeout.endedAt = at;
}

/**
 * Removes the running between-point timeout `transitionId` from the current point, giving the
 * side its timeout back. Throws when it is not the running timeout: an ended timeout is permanent.
 */
export function applyBetweenPointTimeoutCancel(
  game: AdvancedTrackedGame,
  transitionId: string,
): void {
  const point = getCurrentPoint(game);
  const transitions = point?.transitionsAfter;
  const timeout = transitions?.find((transition) => transition.id === transitionId);
  if (point == null || transitions == null || timeout == null) {
    throw new Error(`Between-point timeout "${transitionId}" was not found.`);
  }
  if (timeout.endedAt != null) {
    throw new Error(`Between-point timeout "${transitionId}" has already ended.`);
  }
  const remainingTransitions = transitions.filter((transition) => transition.id !== transitionId);
  point.transitionsAfter = remainingTransitions.length > 0 ? remainingTransitions : undefined;
}

/**
 * Starts the second half early, after the current (completed) point. Returns its undo entry, which
 * carries the new transition ID.
 */
export function applyEarlyHalftime(
  game: AdvancedTrackedGame,
  newId: () => string,
): EarlyHalftimeUndoEntry {
  const point = getCurrentPoint(game);
  if (point == null) throw new Error('No completed point for an early halftime.');
  const transitionId = newId();
  if (game.gameTransitions == null) {
    game.gameTransitions = [];
  }
  game.gameTransitions.push({
    id: transitionId,
    transitionType: 'halftime',
    afterPointId: point.id,
    triggeredEarly: true,
  });
  return { kind: 'halftime_early', pointId: point.id, transitionId };
}
