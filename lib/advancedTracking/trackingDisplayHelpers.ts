import { hasItems } from '@/lib/utils';

import { getActiveGameClockPause, getPostInjuryPickupState } from './livePlayState';
import {
  isDroppedPull,
  getLastPlayAction,
  getPossessionEnd,
  isDefenseScoringThrow,
  isPossessionLosingThrow,
  isTurnoverThrow,
} from './trackingUtils';
import {
  AdvancedTrackedGame,
  Participant,
  PlayerRef,
  PointPossession,
  PossessionAction,
  PossessionLosingThrowResult,
  THROW_RESULT_SPECS,
  ThrowDetails,
  ThrowResult,
  getEligibleThrowTypes,
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
  const possessionEnd = getPossessionEnd(lastPossession);

  if (possessionEnd == null || possessionEnd.outcome === 'turnover') return null;
  const { outcome, action } = possessionEnd;
  if (action.kind !== 'throw') throw new Error('Only a throw can end a point.');
  const { thrower, toPlayer } = action;

  const isCallahan = outcome === 'defense_scores';
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

export interface ThrowDetailsTarget {
  pointId: string;
  possessionId: string;
  actionId: string;
  result: ThrowResult;
  details?: ThrowDetails;
}

export function getLatestThrowDetailsTarget(
  point: TrackedPoint | null,
  possession: PointPossession | null,
): ThrowDetailsTarget | null {
  if (point == null || possession == null) return null;
  if (point.possessions.at(-1)?.id !== possession.id) return null;
  const action = getLastPlayAction(possession.actions);
  if (action?.kind !== 'throw' || getEligibleThrowTypes(action.result).length === 0) return null;

  return {
    pointId: point.id,
    possessionId: possession.id,
    actionId: action.id,
    result: action.result,
    details: action.details,
  };
}

export interface PassChainEvent {
  id: string; // The action ID
  name: string;
}

function getPassChainActions(
  possession: PointPossession,
  point?: TrackedPoint | null,
): PossessionAction[] {
  const postInjuryPickupState = getPostInjuryPickupState(possession, point);
  if (postInjuryPickupState === null) {
    return possession.actions;
  }
  if (postInjuryPickupState.shouldPromptForPickup) {
    return [];
  }
  if (postInjuryPickupState.pickupIndex !== -1) {
    return possession.actions.slice(postInjuryPickupState.pickupIndex);
  }

  return possession.actions;
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

export function getPassChainEvents(
  possession: PointPossession | null,
  participants: Participant[],
  maxDisplay: number = 3,
  point?: TrackedPoint | null,
): { events: PassChainEvent[]; truncated: boolean } {
  if (!possession || !hasItems(possession.actions)) {
    return { events: [], truncated: false };
  }

  const actions = getPassChainActions(possession, point);
  if (!hasItems(actions)) {
    return { events: [], truncated: false };
  }

  const chainEvents: PassChainEvent[] = [];

  // Capture the initial holder from the first pickup action in the possession
  const firstPickup = actions.find((a) => a.kind === 'disc_pickup');
  const pickupName = getRefName(firstPickup?.player, participants);
  if (pickupName) {
    chainEvents.push({ id: firstPickup!.id, name: pickupName });
  }

  actions.forEach((action) => {
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
  regularPerHalf: number;
  /** True when this side has already used its one-per-game floater. */
  floaterUsed: boolean;
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

    // The halftime transition fires on the goal that ends this point. Timeouts can no longer be
    // called during the halftime break, but games saved before that rule may have one on this
    // point; resetting first counts it toward the second half.
    if (halftimeAfterPointId != null && point.id === halftimeAfterPointId) {
      isSecondHalf = true;
      regularUsedInHalf = 0;
    }

    for (const transition of point.transitionsAfter ?? []) {
      if (transition.sideId === sideId) {
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

export function getCompletedGameClockPauseMs(game: AdvancedTrackedGame | null): number {
  if (!game) return 0;
  return (game.gameClockPauses ?? []).reduce((total, pause) => {
    if (pause.resumedAt == null) return total;
    return total + Math.max(0, pause.resumedAt - pause.pausedAt);
  }, 0);
}

export function getGameClockElapsedMs(game: AdvancedTrackedGame | null, now: number): number {
  const gameStartedAt = game?.points[0]?.startedAt;
  if (gameStartedAt == null) return 0;
  const activePause = getActiveGameClockPause(game);
  const currentTime = activePause?.pausedAt ?? now;
  return Math.max(0, currentTime - gameStartedAt - getCompletedGameClockPauseMs(game));
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
  options: { showSpecificResult?: boolean } = {},
): TurnoverEventInfo | null {
  if (!possession) return null;

  // A dropped pull is always the first action and the only action in the possession.
  const openingAction = possession.actions[0];
  if (openingAction?.kind === 'pull' && isDroppedPull(openingAction.result)) {
    return {
      label: 'DROPPED PULL',
      isFocusTurnover: isFocusPossession,
      isDropWithSplitAttribution: false,
      responsibleName: getRefName(openingAction.receiver, participants),
      throwerName: null,
    };
  }

  for (let i = possession.actions.length - 1; i >= 0; i--) {
    const action = possession.actions[i];
    if (action.kind !== 'throw') continue;

    const { result, thrower, toPlayer, defender, splitAttribution } = action;
    if (!isPossessionLosingThrow(result)) return null;

    const hasDefender = defender != null && defender.refType !== 'untracked';

    const label = getLastTurnoverLabel(
      result,
      isFocusPossession,
      options.showSpecificResult === true,
      splitAttribution === true,
      hasDefender,
    );

    const responsibleName = getTurnoverResponsibleName({
      result,
      isFocusPossession,
      showSpecificResult: options.showSpecificResult === true,
      hasDefender,
      toPlayer,
      defender,
      thrower,
      participants,
    });

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

/** Labels when the focus side lost the disc. */
const FOCUS_TURNOVER_LABELS: Record<PossessionLosingThrowResult, string> = {
  drop: 'DROP',
  throwaway: 'THROWAWAY',
  stall: 'STALLED',
  block: 'OPP D',
  pressure: 'OPP PRESSURE',
  callahan: 'CALLAHAN',
};

/** Labels for an opponent turnover with the specific result shown. */
const SPECIFIC_TURNOVER_LABELS: Record<PossessionLosingThrowResult, string> = {
  drop: 'DROP',
  throwaway: 'THROWAWAY',
  stall: 'STALL',
  block: 'BLOCK',
  pressure: 'PRESSURE',
  callahan: 'CALLAHAN',
};

function getLastTurnoverLabel(
  result: PossessionLosingThrowResult,
  isFocusPossession: boolean,
  showSpecificResult: boolean,
  isSplitAttribution: boolean,
  hasDefender: boolean,
): string {
  if (result === 'drop' && isSplitAttribution && (isFocusPossession || showSpecificResult)) {
    return '50/50';
  }
  if (isFocusPossession) return FOCUS_TURNOVER_LABELS[result];
  if (showSpecificResult) {
    if (result === 'stall' && !hasDefender) return 'STALLED';
    return SPECIFIC_TURNOVER_LABELS[result];
  }
  if (isDefenseScoringThrow(result)) return SPECIFIC_TURNOVER_LABELS[result];
  const isDefenderCredited = THROW_RESULT_SPECS[result].creditedRole === 'defender';
  return isDefenderCredited && hasDefender ? SPECIFIC_TURNOVER_LABELS[result] : 'OPP TURN';
}

function getTurnoverResponsibleName({
  result,
  isFocusPossession,
  showSpecificResult,
  hasDefender,
  toPlayer,
  defender,
  thrower,
  participants,
}: {
  result: PossessionLosingThrowResult;
  isFocusPossession: boolean;
  showSpecificResult: boolean;
  hasDefender: boolean;
  toPlayer: PlayerRef | undefined;
  defender: PlayerRef | undefined;
  thrower: PlayerRef | undefined;
  participants: Participant[];
}): string | null {
  const { creditedRole } = THROW_RESULT_SPECS[result];
  if (creditedRole === 'receiver') return getRefName(toPlayer, participants);
  if (isTurnoverThrow(result) && creditedRole === 'defender' && !isFocusPossession && hasDefender) {
    return getRefName(defender, participants);
  }
  if (result === 'stall' && !isFocusPossession && showSpecificResult) {
    return getRefName(thrower, participants);
  }
  if (result === 'block') return null;
  return getRefName(thrower, participants);
}
