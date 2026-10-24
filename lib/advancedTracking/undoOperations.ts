/**
 * Inverse operations for the live tracker's undo stack. Operations that are never pushed to the
 * stack (stoppages, cap transitions, Red Zone scaffold pickups) intentionally survive undo.
 */
import { assertNever } from '@/lib/utils';

import { removeActionById, removeSubsForStoppages } from './gameMutations';
import type { AdvancedTrackingUndoEntry } from './persistenceTypes';
import { getPlayOutcome, isPointEndingThrow, syncDerivedHalftimeTransition } from './trackingUtils';
import type {
  AdvancedTrackedGame,
  BetweenPointTransition,
  GameTransition,
  PointPossession,
  PossessionAction,
  PullAction,
  TrackedPoint,
} from './types';

/** Game-level state the store must apply after an undo. */
export interface UndoResult {
  /** Whether the rederived halftime transition puts the game in the halftime break. */
  isHalftimeBreakActive: boolean;
}

type UndoEntryOf<K extends AdvancedTrackingUndoEntry['kind']> = Extract<
  AdvancedTrackingUndoEntry,
  { kind: K }
>;

interface ActionRef {
  pointId: string;
  possessionId: string;
  actionId: string;
}

interface ActionTarget {
  point: TrackedPoint;
  possession: PointPossession;
  action: PossessionAction;
}

function resolveActionTarget(game: AdvancedTrackedGame, ref: ActionRef): ActionTarget {
  const point = game.points.find((candidate) => candidate.id === ref.pointId);
  const possession = point?.possessions.find((candidate) => candidate.id === ref.possessionId);
  const action = possession?.actions.find((candidate) => candidate.id === ref.actionId);
  if (point == null || possession == null || action == null) {
    throw new Error(
      `Undo target not found: point "${ref.pointId}", possession "${ref.possessionId}", action "${ref.actionId}".`,
    );
  }
  return { point, possession, action };
}

function resolvePullTarget(
  game: AdvancedTrackedGame,
  entry: UndoEntryOf<'amend_pull_result'>,
): ActionTarget & { action: PullAction } {
  const target = resolveActionTarget(game, entry);
  const { action } = target;
  if (action.kind !== 'pull') {
    throw new Error(`Undo target "${entry.actionId}" is a ${action.kind}, not a pull.`);
  }
  return { ...target, action };
}

/** The point and its between-point transitions, which contain the entry's timeout. */
function resolveBetweenPointTimeout(
  game: AdvancedTrackedGame,
  entry: UndoEntryOf<'between_point_timeout'>,
): { point: TrackedPoint; transitions: BetweenPointTransition[] } {
  const point = game.points.find((candidate) => candidate.id === entry.pointId);
  const transitions = point?.transitionsAfter;
  if (point == null || !transitions?.some((candidate) => candidate.id === entry.transitionId)) {
    throw new Error(
      `Undo target not found: point "${entry.pointId}", between-point transition "${entry.transitionId}".`,
    );
  }
  return { point, transitions };
}

/** The game transitions, which contain the entry's early halftime. */
function resolveEarlyHalftime(
  game: AdvancedTrackedGame,
  entry: UndoEntryOf<'halftime_early'>,
): GameTransition[] {
  const transitions = game.gameTransitions;
  if (!transitions?.some((candidate) => candidate.id === entry.transitionId)) {
    throw new Error(`Undo target not found: game transition "${entry.transitionId}".`);
  }
  return transitions;
}

/** Throws a descriptive error when any target the entry's undo needs is missing. */
export function assertUndoTargets(
  game: AdvancedTrackedGame,
  entry: AdvancedTrackingUndoEntry,
): void {
  switch (entry.kind) {
    case 'action':
      resolveActionTarget(game, entry);
      return;
    case 'between_point_timeout':
      resolveBetweenPointTimeout(game, entry);
      return;
    case 'halftime_early':
      resolveEarlyHalftime(game, entry);
      return;
    case 'amend_pull_result':
      resolvePullTarget(game, entry);
      return;
    default:
      assertNever(entry);
  }
}

/** Throws for the first entry whose targets are missing from `game`. */
export function assertValidUndoStack(
  game: AdvancedTrackedGame,
  undoStack: readonly AdvancedTrackingUndoEntry[],
): void {
  for (const entry of undoStack) {
    assertUndoTargets(game, entry);
  }
}

/**
 * When `action` turned the disc over, drops the possessions that followed it. `possession` must be
 * one of `point.possessions` (callers pass a resolved target).
 */
function removePossessionsAfterTurnover(
  point: TrackedPoint,
  possession: PointPossession,
  action: PossessionAction,
): void {
  const isTurnover = action.kind !== 'stoppage' && getPlayOutcome(action) === 'turnover';
  if (!isTurnover) return;

  const possessionIndex = point.possessions.findIndex(
    (candidate) => candidate.id === possession.id,
  );
  const removedPossessions = point.possessions.splice(possessionIndex + 1);
  const removedStoppageIds = new Set(
    removedPossessions.flatMap((removedPossession) =>
      removedPossession.actions.flatMap((removedAction) =>
        removedAction.kind === 'stoppage' ? [removedAction.id] : [],
      ),
    ),
  );
  removeSubsForStoppages(point, removedStoppageIds);
}

function undoAction(game: AdvancedTrackedGame, entry: UndoEntryOf<'action'>, now: number): void {
  const { point, possession, action } = resolveActionTarget(game, entry);

  // Possession cleanup and the revival pause read the action, so they run before removing it.
  removePossessionsAfterTurnover(point, possession, action);
  if (action.kind === 'throw' && isPointEndingThrow(action.result) && action.recordedAt != null) {
    if (point.revivalPauses == null) point.revivalPauses = [];
    point.revivalPauses.push({ pausedAt: action.recordedAt, resumedAt: now });
  }

  // removeActionById can replace game.points or point.possessions; hold no references past it.
  removeActionById(game, entry.pointId, entry.possessionId, entry.actionId);
}

function undoBetweenPointTimeout(
  game: AdvancedTrackedGame,
  entry: UndoEntryOf<'between_point_timeout'>,
): void {
  const { point, transitions } = resolveBetweenPointTimeout(game, entry);
  const remainingTransitions = transitions.filter(
    (candidate) => candidate.id !== entry.transitionId,
  );
  point.transitionsAfter = remainingTransitions.length > 0 ? remainingTransitions : undefined;
}

function undoEarlyHalftime(game: AdvancedTrackedGame, entry: UndoEntryOf<'halftime_early'>): void {
  const remainingTransitions = resolveEarlyHalftime(game, entry).filter(
    (candidate) => candidate.id !== entry.transitionId,
  );
  game.gameTransitions = remainingTransitions.length > 0 ? remainingTransitions : undefined;
}

function undoPullAmendment(
  game: AdvancedTrackedGame,
  entry: UndoEntryOf<'amend_pull_result'>,
): void {
  const { point, possession, action } = resolvePullTarget(game, entry);

  // Runs before reverting the result: getPlayOutcome treats a 'dropped' pull as a turnover.
  removePossessionsAfterTurnover(point, possession, action);
  action.result = entry.previousResult;
  action.receiver = entry.previousReceiver;
}

/**
 * Applies the inverse of `entry` to a live game draft, then rederives halftime. Throws before
 * mutating when any target the entry references is missing. The caller pops the entry.
 */
export function applyUndo(
  game: AdvancedTrackedGame,
  entry: AdvancedTrackingUndoEntry,
  now: number,
): UndoResult {
  switch (entry.kind) {
    case 'action':
      undoAction(game, entry, now);
      break;
    case 'between_point_timeout':
      undoBetweenPointTimeout(game, entry);
      break;
    case 'halftime_early':
      undoEarlyHalftime(game, entry);
      break;
    case 'amend_pull_result':
      undoPullAmendment(game, entry);
      break;
    default:
      assertNever(entry);
  }

  return { isHalftimeBreakActive: syncDerivedHalftimeTransition(game) };
}
