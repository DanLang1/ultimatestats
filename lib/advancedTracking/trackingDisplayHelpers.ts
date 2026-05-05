import { hasItems } from '@/lib/utils';
import { getOtherSideId, isPossessionOver } from './trackingUtils';
import {
  AdvancedTrackedGame,
  Participant,
  PassModifier,
  PlayerRef,
  PointPossession,
  PointSub,
  StoppageAction,
  TrackedPoint,
} from './types';

export interface GoalInfo {
  /** True when the focus team scored (including callahan). */
  isFocusGoal: boolean;
  isCallahan: boolean;
  /** Name of the player who caught the goal. Null if untracked (opp goal or callahan with no toPlayer). */
  scorerName: string | null;
  /** Name of the player who threw the goal assist. Null for opp goals, calahans, or pull-catch goals. */
  assisterName: string | null;
}

export function getGoalInfo(
  point: TrackedPoint | null,
  focusSideId: string,
  participants: Participant[],
): GoalInfo | null {
  if (!point || point.possessions.length === 0) return null;

  const lastPossession = point.possessions[point.possessions.length - 1];
  const lastAction = lastPossession.actions[lastPossession.actions.length - 1];

  if (!lastAction || lastAction.kind !== 'throw') return null;
  const { result, thrower, toPlayer } = lastAction;
  if (result !== 'goal' && result !== 'callahan') return null;

  const isCallahan = result === 'callahan';
  const isFocusGoal = (lastPossession.sideId === focusSideId) !== isCallahan;

  return {
    isFocusGoal,
    isCallahan,
    scorerName: getRefName(toPlayer, participants),
    assisterName: isFocusGoal && !isCallahan ? getRefName(thrower, participants) : null,
  };
}

export interface TurnoverEventInfo {
  /** Display label, e.g. "THROWAWAY", "DROP", "BLOCK". */
  label: string;
  /** True when the turnover was committed by the focus team (bad). False = they turned it (good). */
  isFocusTurnover: boolean;
  /** True when this was a drop with split attribution (color warning instead of danger). */
  isDropWithSplitAttribution: boolean;
  /**
   * Name of the player most responsible for the turnover — used as a fallback when the
   * pass chain is empty (e.g. first holder stalled or threw away immediately after pickup).
   */
  responsibleName: string | null;
  /**
   * For 50/50 drops only: the thrower's name, so both players can be shown together
   * as "Alice + Bob → 50/50" rather than just the receiver.
   */
  throwerName: string | null;
}

/** Returns the side ID that currently has (or will next pick up) the disc. */
export function getActiveSideId(
  possession: PointPossession | null,
  game: AdvancedTrackedGame,
): string {
  if (possession == null) {
    return game.focusSideId;
  }
  return isPossessionOver(possession) ? getOtherSideId(game, possession.sideId) : possession.sideId;
}

/** Returns the PlayerRef of the player currently holding the disc, if it's our possession. */
export function getDiscHolderRef(
  possession: PointPossession | null,
  focusSideId: string,
): PlayerRef | null {
  if (!possession || isPossessionOver(possession) || possession.sideId !== focusSideId) {
    return null;
  }
  const actions = possession.actions;
  for (let i = actions.length - 1; i >= 0; i--) {
    const action = actions[i];
    if (action.kind === 'disc_pickup') {
      return action.player;
    } else if (action.kind === 'throw' && action.toPlayer) {
      return action.toPlayer;
    }
  }
  return null;
}

/**
 * Returns the disc holder ref, accounting for injury-just-resumed state.
 * After an injury stoppage resumes, the holder is forced to null so the coach must re-tap.
 */
export function getSafeDiscHolderRef(
  possession: PointPossession | null,
  focusSideId: string,
): PlayerRef | null {
  if (isInjuryJustResumed(possession)) return null;
  return getDiscHolderRef(possession, focusSideId);
}

/** Returns the ID of the player currently holding the disc, if it's a known participant. */
export function getDiscHolderId(
  possession: PointPossession | null,
  focusSideId: string,
): string | null {
  const ref = getDiscHolderRef(possession, focusSideId);
  return ref?.refType === 'participant' ? ref.participantId : null;
}

export interface PassChainEvent {
  id: string; // The action ID
  name: string; // The participant name
}

function getRefName(ref: PlayerRef | undefined, participants: Participant[]): string | null {
  if (ref?.refType === 'participant') {
    return participants.find((p) => p.id === ref.participantId)?.name ?? null;
  }
  if (ref?.refType === 'unknown') {
    return 'Unknown';
  }
  return null;
}

/** Generates the pass chain sequence as an array of events for UI mapping. */
export function getPassChainEvents(
  possession: PointPossession | null,
  participants: Participant[],
  maxDisplay: number = 3,
): { events: PassChainEvent[]; truncated: boolean } {
  if (!possession || !hasItems(possession.actions)) {
    return { events: [], truncated: false };
  }

  const chainEvents: PassChainEvent[] = [];

  // Capture the initial holder from the first pickup action in the possession
  const firstPickup = possession.actions.find((a) => a.kind === 'disc_pickup');
  const pickupName = getRefName(firstPickup?.player, participants);
  if (pickupName) {
    chainEvents.push({ id: firstPickup!.id, name: pickupName });
  }

  possession.actions.forEach((action) => {
    if (action.kind === 'throw') {
      // If we didn't have an initial holder, infer from the first thrower.
      // ID is suffixed because the action itself is a throw, not a pickup.
      if (chainEvents.length === 0) {
        const throwerName = getRefName(action.thrower, participants);
        if (throwerName) {
          chainEvents.push({ id: `${action.id}-thrower`, name: throwerName });
        }
      }
      const receiverName = getRefName(action.toPlayer, participants);
      if (receiverName) {
        chainEvents.push({ id: action.id, name: receiverName });
      }
    }
  });

  const truncated = chainEvents.length > maxDisplay;
  const visibleEvents = chainEvents.slice(-maxDisplay);

  return { events: visibleEvents, truncated };
}

export interface SideTimeoutState {
  /** Regular timeouts used by this side in the currently-active half. */
  regularUsedInHalf: number;
  /** Regular timeouts allotted per half. */
  regularPerHalf: number;
  /** True when this side has already used its one-per-game floater. */
  floaterUsed: boolean;
  /** True when floaters are enabled for this game. */
  floaterEnabled: boolean;
  /** True once the game has advanced past the halftime transition. */
  isSecondHalf: boolean;
}

/**
 * Derives the per-side timeout state from the game's event log.
 * Regular timeouts reset at halftime; floaters are once per game.
 */
export function getSideTimeoutState(game: AdvancedTrackedGame, sideId: string): SideTimeoutState {
  const regularPerHalf = game.settings.format?.timeoutsPerHalf ?? 2;
  const floaterEnabled = game.settings.format?.floaterEnabled ?? false;

  const halftimeAfterPointId = game.gameTransitions?.find(
    (t) => t.transitionType === 'halftime',
  )?.afterPointId;

  let regularUsedInHalf = 0;
  let floaterUsed = false;
  let isSecondHalf = false;

  for (const point of game.points) {
    // Mid-point timeouts belong to whichever half the point is played in.
    for (const possession of point.possessions) {
      for (const action of possession.actions) {
        if (action.kind === 'stoppage' && action.reason === 'timeout' && action.sideId === sideId) {
          if (action.isFloater) {
            floaterUsed = true;
          } else {
            regularUsedInHalf += 1;
          }
        }
      }
    }

    // The halftime transition fires on the goal that ends this point, so
    // between-point timeouts on the halftime-ending point belong to H2.
    if (halftimeAfterPointId != null && point.id === halftimeAfterPointId) {
      isSecondHalf = true;
      regularUsedInHalf = 0;
    }

    for (const transition of point.transitionsAfter ?? []) {
      if (transition.transitionType === 'timeout' && transition.sideId === sideId) {
        if (transition.isFloater) {
          floaterUsed = true;
        } else {
          regularUsedInHalf += 1;
        }
      }
    }
  }

  return {
    regularUsedInHalf,
    regularPerHalf,
    floaterUsed,
    floaterEnabled,
    isSecondHalf,
  };
}

export function formatPointTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Returns the active (unresolved) stoppage action in the current possession, if any. */
export function getActiveStoppage(possession: PointPossession | null): StoppageAction | null {
  if (!possession) return null;
  const last = possession.actions[possession.actions.length - 1];
  if (last?.kind === 'stoppage' && last.resumedAt == null) return last;
  return null;
}

/** Returns total milliseconds spent in completed (resumed) stoppages across all possessions in the point. */
export function getCompletedPauseMs(point: TrackedPoint | null): number {
  if (!point) return 0;
  let total = 0;
  for (const possession of point.possessions) {
    for (const action of possession.actions) {
      if (action.kind === 'stoppage' && action.pausedAt != null && action.resumedAt != null) {
        total += action.resumedAt - action.pausedAt;
      }
    }
  }
  return total;
}

/**
 * Returns the adjusted start timestamp for the point timer.
 * Accounts for completed stoppages and revived (undo-after-goal) state.
 * Use `Date.now() - getPointAdjustedTimestamp(point)` to get elapsed ms.
 */
export function getPointAdjustedTimestamp(point: TrackedPoint): number {
  if (point.revivedAt != null && point.elapsedMsAtEnd != null) {
    return point.revivedAt - point.elapsedMsAtEnd;
  }
  return (point.startedAt ?? 0) + getCompletedPauseMs(point);
}

/**
 * Returns info about the turnover that ended a possession, or null if the possession
 * ended cleanly (goal) or hasn't ended yet.
 *
 * `isFocusPossession` should be true when the possession belongs to the focus team —
 * this determines whether the turnover is "bad" (our mistake) or "good" (we forced it).
 */
export function getLastTurnoverEvent(
  possession: PointPossession | null,
  isFocusPossession: boolean,
  participants: Participant[],
): TurnoverEventInfo | null {
  if (!possession) return null;

  for (let i = possession.actions.length - 1; i >= 0; i--) {
    const action = possession.actions[i];
    if (action.kind !== 'throw') continue;

    const { result, thrower, toPlayer, defender, splitAttribution } = action;
    if (result === 'complete' || result === 'goal') return null;

    const hasDefender = defender != null && defender.refType !== 'untracked';

    const labelMap: Partial<Record<typeof result, string>> = isFocusPossession
      ? {
          throwaway: 'THROWAWAY',
          drop: splitAttribution ? '50/50' : 'DROP',
          stall: 'STALLED',
          block: 'OPP D',
          callahan: 'CALLAHAN',
        }
      : {
          throwaway: 'OPP TURN',
          drop: 'OPP TURN',
          stall: hasDefender ? 'STALL' : 'OPP TURN',
          block: hasDefender ? 'BLOCK' : 'OPP TURN',
          callahan: 'CALLAHAN',
        };

    const label = labelMap[result];
    if (!label) return null;

    // drop → toPlayer (the dropper); block/stall on opp → defender (our player); everything else → thrower
    let responsibleName;
    if (result === 'drop') {
      responsibleName = getRefName(toPlayer, participants);
    } else if ((result === 'block' || result === 'stall') && !isFocusPossession) {
      responsibleName = getRefName(defender, participants);
    } else if (result === 'block') {
      // OPP D — no name shown
      responsibleName = null;
    } else {
      responsibleName = getRefName(thrower, participants);
    }

    const isFiftyFifty = result === 'drop' && (splitAttribution ?? false);

    return {
      label,
      isFocusTurnover: isFocusPossession,
      isDropWithSplitAttribution: isFiftyFifty,
      responsibleName,
      throwerName: isFiftyFifty ? getRefName(thrower, participants) : null,
    };
  }

  return null;
}

/**
 * Calculates the current 'active' line for a side by applying all subs in sequence.
 */
export function getEffectiveLineParticipantIds(point: TrackedPoint, sideId: string): string[] {
  const baseLine = point.lines.find((l) => l.sideId === sideId)?.participantIds ?? [];
  const sideSubs = point.subs?.filter((s) => s.sideId === sideId) ?? [];

  if (sideSubs.length === 0) return baseLine;

  const currentLine = new Set(baseLine);
  for (const sub of sideSubs) {
    for (const outId of sub.outIds) {
      currentLine.delete(outId);
    }
    for (const inId of sub.inIds) {
      currentLine.add(inId);
    }
  }

  return Array.from(currentLine);
}

/**
 * Returns the PointSub associated with a specific stoppage action ID, if any.
 */
export function getSubForStoppage(point: TrackedPoint | null, actionId: string): PointSub | null {
  if (!point?.subs) return null;
  return point.subs.find((s) => s.stoppageActionId === actionId) ?? null;
}

/**
 * Returns true if the last action was an injury stoppage that has resumed.
 * Used to force re-selecting the disc holder after an injury.
 */
export function isInjuryJustResumed(possession: PointPossession | null): boolean {
  if (!possession) return false;
  const last = possession.actions[possession.actions.length - 1];
  return last?.kind === 'stoppage' && last.reason === 'injury' && last.resumedAt != null;
}

/**
 * Returns true if the side is allowed to call a timeout based on their remaining timeouts/floater.
 */
export function canCallTimeout(state: SideTimeoutState): boolean {
  const regularsLeft = state.regularUsedInHalf < state.regularPerHalf;
  const floaterAvailable = state.floaterEnabled && !state.floaterUsed;
  return regularsLeft || floaterAvailable;
}

/**
 * Returns the instruction text for the current tracker state.
 */
export function getTrackerInstructionText(params: {
  pointIsOver: boolean;
  passModifier: PassModifier;
  oppHasDisc: boolean;
  discHolderId: string | null;
  isAwaitingPullPickup: boolean;
}): string | null {
  const { pointIsOver, passModifier, oppHasDisc, discHolderId, isAwaitingPullPickup } = params;

  if (pointIsOver) return null;
  if (passModifier === 'callahan') return 'TAP PLAYER FOR CALLAHAN';
  if (passModifier === 'stall') return 'TAP PLAYER WHO STALLED';
  if (passModifier === 'fifty-fifty') return 'TAP PLAYER FOR 50/50';
  if (oppHasDisc) return 'TAP PLAYER FOR BLOCK';
  if (discHolderId === null) {
    return isAwaitingPullPickup ? 'TAP STARTING PLAYER' : 'TAP PLAYER TO PICK UP';
  }
  return null;
}

/**
 * Returns the color for the instruction text based on the pass modifier.
 */
export function getTrackerInstructionColor(
  passModifier: PassModifier,
  palette: { success: string; warning: string; textMuted: string },
): string {
  if (passModifier === 'callahan' || passModifier === 'stall') {
    return palette.success;
  }
  if (passModifier === 'fifty-fifty') {
    return palette.warning;
  }
  return palette.textMuted;
}

export function isPullAwaitingPickup(params: {
  possession: PointPossession | null;
  pointIsOver: boolean;
  oppHasDisc: boolean;
  discHolderId: string | null;
}): boolean {
  const { possession, pointIsOver, oppHasDisc, discHolderId } = params;
  if (pointIsOver || oppHasDisc || discHolderId !== null) return false;
  const lastAction = possession?.actions[possession.actions.length - 1];
  return lastAction?.kind === 'pull';
}
