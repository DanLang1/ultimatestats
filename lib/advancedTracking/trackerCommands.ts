import { getLivePlayState } from './livePlayState';
import type { AdvancedTrackingUndoEntry } from './persistenceTypes';
import {
  getActiveBetweenPointTimeout,
  getActiveGameClockPause,
  getSideTimeoutState,
  SideTimeoutState,
} from './trackingDisplayHelpers';
import { areBothSidesFullyTracked } from './trackingModeUtils';
import { deriveHalftimeTransition, getCurrentPoint, isDroppedPull } from './trackingUtils';
import { AdvancedTrackedGame } from './types';

/**
 * Why a tracker command is unavailable right now. Each command adds the reasons it needs, so the
 * union grows with the commands module.
 */
export type TrackerCommandBlock =
  | 'point-not-started'
  | 'point-over'
  | 'play-paused'
  | 'holder-required'
  | 'possession-over'
  | 'play-past-pull'
  | 'pull-already-dropped'
  | 'opponent-has-disc'
  | 'game-not-started'
  | 'halftime-break'
  | 'timeout-active'
  | 'no-timeouts-left'
  | 'stoppage-active'
  | 'nothing-to-undo';

/** Whether a tracker command may run now: read by the UI and asserted by the store. */
export type CommandAvailability = { ok: true } | { ok: false; reason: TrackerCommandBlock };

const TRACKER_COMMAND_BLOCK_MESSAGES = {
  'point-not-started': 'the point has not started',
  'point-over': 'the point has ended',
  'play-paused': 'play is paused',
  'holder-required': 'the current holder has not been captured',
  'possession-over': 'the possession is over',
  'play-past-pull': 'play has moved past the opening pull',
  'pull-already-dropped': 'the pull was already marked dropped',
  'opponent-has-disc': 'the untracked opponent has the disc',
  'game-not-started': 'the game has not started',
  'halftime-break': 'it is the halftime break',
  'timeout-active': 'a timeout is already running',
  'no-timeouts-left': 'the side has no timeouts left',
  'stoppage-active': 'a stoppage is in progress',
  'nothing-to-undo': 'there is nothing to undo',
} as const satisfies Record<TrackerCommandBlock, string>;

/** Throws when a store action is called for a command its availability check blocks. */
export function assertCommandAllowed<Availability extends CommandAvailability>(
  availability: Availability,
  commandLabel: string,
): asserts availability is Extract<Availability, { ok: true }> {
  if (availability.ok) return;
  throw new Error(
    `Cannot ${commandLabel}: ${TRACKER_COMMAND_BLOCK_MESSAGES[availability.reason]}.`,
  );
}

/** Why a command that needs a point in play is blocked. */
export type LivePointBlock = Extract<
  TrackerCommandBlock,
  'point-not-started' | 'point-over' | 'play-paused'
>;

/** Allows a command only while a point is in play with no stoppage or game-clock pause. */
function getLivePointAvailability(
  game: AdvancedTrackedGame,
): { ok: true } | { ok: false; reason: LivePointBlock } {
  const { point, pointIsOver, isPlayPaused } = getLivePlayState(game);
  if (point == null) return { ok: false, reason: 'point-not-started' };
  if (pointIsOver) return { ok: false, reason: 'point-over' };
  if (isPlayPaused) return { ok: false, reason: 'play-paused' };
  return { ok: true };
}

/**
 * Whether a capture (a pickup, throw, or dropped-pull amendment) can be recorded at all; each
 * capture adds its own holder and possession rules on top.
 */
export function canCapture(game: AdvancedTrackedGame) {
  return getLivePointAvailability(game);
}

/**
 * Whether Red Zone can be cleared. Clearing never needs a holder, so it stays available after an
 * injury substitution takes the holder off the field.
 */
export function canClearRedZone(game: AdvancedTrackedGame): CommandAvailability {
  return getLivePointAvailability(game);
}

/**
 * Whether Red Zone can be set for the side that has (or will next pick up) the disc. A fully
 * tracked side needs a captured holder; an anonymous side does not.
 */
export function canSetRedZone(game: AdvancedTrackedGame): CommandAvailability {
  const playBlock = getLivePointAvailability(game);
  if (!playBlock.ok) return playBlock;

  const { activeSideId, holderFor } = getLivePlayState(game);
  const activeSide = game.sides.find((side) => side.id === activeSideId);
  if (activeSide == null) {
    throw new Error(`Cannot resolve active side "${activeSideId}".`);
  }
  if (activeSide.trackingMode === 'full-roster' && holderFor(activeSideId) == null) {
    return { ok: false, reason: 'holder-required' };
  }
  return { ok: true };
}

/**
 * Whether the opening pull can still be amended as dropped by the receiving team: nothing has
 * happened since the pull, it was not already dropped, and the receiver is a tracked side (the
 * untracked opponent's catch is not recorded).
 */
export function canAmendOpeningPull(game: AdvancedTrackedGame): CommandAvailability {
  const captureBlock = canCapture(game);
  if (!captureBlock.ok) return captureBlock;
  const { possession, activeSideId } = getLivePlayState(game);
  if (possession == null) return { ok: false, reason: 'play-past-pull' };
  const openingAction = possession.actions[0];
  if (openingAction?.kind !== 'pull' || possession.actions.length !== 1) {
    return { ok: false, reason: 'play-past-pull' };
  }
  if (isDroppedPull(openingAction.result)) return { ok: false, reason: 'pull-already-dropped' };
  if (!areBothSidesFullyTracked(game) && activeSideId !== game.focusSideId) {
    return { ok: false, reason: 'opponent-has-disc' };
  }
  return { ok: true };
}

/** Whether play can be stopped mid-point for a manual pause or an injury. */
export function canRecordStoppage(game: AdvancedTrackedGame): CommandAvailability {
  return getLivePointAvailability(game);
}

/**
 * Whether the current line can be corrected or changed by an injury substitution. Both need a
 * point in play; recording the substitution also stops play (`canRecordStoppage`).
 */
export function canChangeLine(game: AdvancedTrackedGame): CommandAvailability {
  return getLivePointAvailability(game);
}

/**
 * Whether the last tracked operation can be undone. An open stoppage must be resumed or cancelled
 * first; undo stays available between points and during a game-clock pause.
 */
export function canUndo(
  game: AdvancedTrackedGame,
  lastEntry: AdvancedTrackingUndoEntry | undefined,
): CommandAvailability {
  if (lastEntry == null) return { ok: false, reason: 'nothing-to-undo' };
  if (getLivePlayState(game).activeStoppage != null) {
    return { ok: false, reason: 'stoppage-active' };
  }
  return { ok: true };
}

/**
 * Whether the game clock can be paused: the game has started and play is not already paused by a
 * stoppage or another game-clock pause. Allowed between points.
 */
export function canPauseGameClock(game: AdvancedTrackedGame): CommandAvailability {
  if (game.points[0]?.startedAt == null) return { ok: false, reason: 'game-not-started' };
  if (getLivePlayState(game).isPlayPaused) return { ok: false, reason: 'play-paused' };
  return { ok: true };
}

/** How an allowed timeout is recorded: a mid-point stoppage or a between-point transition. */
export interface TimeoutPlan {
  kind: 'in-point' | 'between-point';
  /** The side's regular timeouts for this half are used up, so this spends its floater. */
  isFloater: boolean;
}

export type TimeoutAvailability =
  | { ok: true; plan: TimeoutPlan }
  | { ok: false; reason: TrackerCommandBlock };

function hasTimeoutLeft(state: SideTimeoutState): boolean {
  const regularsLeft = state.regularUsedInHalf < state.regularPerHalf;
  const floaterAvailable = state.floaterEnabled && !state.floaterUsed;
  return regularsLeft || floaterAvailable;
}

/**
 * Whether `sideId` can call a timeout now, and how it is recorded. A timeout needs a regular
 * timeout or the floater left and is never called while play is paused. Between points it is
 * also blocked during the halftime break and while another between-point timeout is running.
 */
export function planTimeout(game: AdvancedTrackedGame, sideId: string): TimeoutAvailability {
  const { point, pointIsOver, isPlayPaused } = getLivePlayState(game);
  if (point == null) return { ok: false, reason: 'point-not-started' };
  if (isPlayPaused) return { ok: false, reason: 'play-paused' };
  if (pointIsOver) {
    if (deriveHalftimeTransition(game).isActive) return { ok: false, reason: 'halftime-break' };
    if (getActiveBetweenPointTimeout(game) != null) {
      return { ok: false, reason: 'timeout-active' };
    }
  }
  const timeouts = getSideTimeoutState(game, sideId);
  if (!hasTimeoutLeft(timeouts)) return { ok: false, reason: 'no-timeouts-left' };
  return {
    ok: true,
    plan: {
      kind: pointIsOver ? 'between-point' : 'in-point',
      isFloater: timeouts.regularUsedInHalf >= timeouts.regularPerHalf,
    },
  };
}

/**
 * What a Resume or Cancel tap should do: act on the open pause, or ignore a repeated tap on one
 * that was already resumed or removed.
 */
export type PauseTapTarget = 'active' | 'settled';

/**
 * Resolves a Resume or Cancel tap on a stoppage. A stoppage missing from the current point was
 * already cancelled or undone. Throws for an unresumed stoppage that is not the active one, which
 * no write path produces.
 */
export function getStoppageTapTarget(game: AdvancedTrackedGame, actionId: string): PauseTapTarget {
  if (getLivePlayState(game).activeStoppage?.id === actionId) return 'active';
  const action = getCurrentPoint(game)
    ?.possessions.flatMap((possession) => possession.actions)
    .find((candidate) => candidate.id === actionId);
  if (action == null) return 'settled';
  if (action.kind !== 'stoppage') throw new Error(`Action "${actionId}" is not a stoppage.`);
  if (action.resumedAt == null) {
    throw new Error(`Stoppage "${actionId}" is unresumed but not the active stoppage.`);
  }
  return 'settled';
}

/**
 * Resolves a Resume tap on a game-clock pause. Pauses are never removed, so an unknown id is a
 * programming error.
 */
export function getGameClockPauseTapTarget(
  game: AdvancedTrackedGame,
  pauseId: string,
): PauseTapTarget {
  if (getActiveGameClockPause(game)?.id === pauseId) return 'active';
  if (!game.gameClockPauses?.some((pause) => pause.id === pauseId)) {
    throw new Error(`Game clock pause "${pauseId}" was not found.`);
  }
  return 'settled';
}
