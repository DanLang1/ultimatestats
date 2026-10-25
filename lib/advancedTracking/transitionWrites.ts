/**
 * Live writes for transitions between points and halves. The store asserts the tracker command
 * first and pushes any returned undo entry; ending a timeout is not undoable.
 */
import type { BetweenPointTimeoutUndoEntry, EarlyHalftimeUndoEntry } from './persistenceTypes';
import { getCurrentPoint } from './trackingUtils';
import type { AdvancedTrackedGame } from './types';
import type { WriteContext } from './writeContext';

/**
 * Starts a timeout after the current (completed) point. Returns its undo entry, which carries the
 * new transition ID.
 */
export function applyBetweenPointTimeout(
  game: AdvancedTrackedGame,
  timeout: { sideId: string; isFloater: boolean },
  ctx: WriteContext,
): BetweenPointTimeoutUndoEntry {
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
  return { kind: 'between_point_timeout', pointId: point.id, transitionId };
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
  if (timeout?.transitionType !== 'timeout') {
    throw new Error(`Between-point timeout "${transitionId}" was not found.`);
  }
  timeout.endedAt = at;
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
