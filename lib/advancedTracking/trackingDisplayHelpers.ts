import { hasItems } from '@/lib/utils';

import { areBothSidesFullyTracked } from './trackingModeUtils';
import {
  getEffectiveLineParticipantIds as deriveEffectiveLineParticipantIds,
  getOtherSideId,
  hasPointEnded,
  isPossessionOver,
} from './trackingUtils';
import {
  AdvancedTrackedGame,
  BetweenPointTransition,
  GameClockPause,
  Participant,
  PassModifier,
  PlayerRef,
  PointPossession,
  PointSub,
  PossessionAction,
  StoppageAction,
  ThrowDetails,
  ThrowResult,
  getEligibleThrowTypes,
  TrackedPoint,
} from './types';

export interface ActiveBetweenPointTimeout {
  point: TrackedPoint;
  transition: Extract<BetweenPointTransition, { transitionType: 'timeout' }>;
}

export function getActiveBetweenPointTimeout(
  game: AdvancedTrackedGame | null,
): ActiveBetweenPointTimeout | null {
  if (game == null) return null;

  const currentPoint = game.points.at(-1) ?? null;
  if (currentPoint == null || !hasPointEnded(currentPoint)) return null;

  const latestTransition = currentPoint.transitionsAfter?.at(-1);
  if (latestTransition == null || latestTransition.transitionType !== 'timeout') return null;
  if (latestTransition.endedAt != null) return null;

  return {
    point: currentPoint,
    transition: latestTransition,
  };
}

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
  const lastAction = lastPossession.actions.findLast((action) => action.kind !== 'stoppage');

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
  const action = possession.actions.findLast((candidate) => candidate.kind !== 'stoppage');
  if (action?.kind !== 'throw' || getEligibleThrowTypes(action.result).length === 0) return null;

  return {
    pointId: point.id,
    possessionId: possession.id,
    actionId: action.id,
    result: action.result,
    details: action.details,
  };
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

/**
 * Returns the side whose live tracker controls and last-action context should be displayed.
 * In dual-side tracking, possession changes immediately after a turnover but remains with the
 * scoring side after a goal so the completed-point card keeps the correct perspective.
 */
export function getTrackerDisplaySideId(
  game: AdvancedTrackedGame,
  possession: PointPossession | null,
  point: TrackedPoint | null,
): string {
  const activeSideId = getActiveSideId(possession, game);
  if (!areBothSidesFullyTracked(game)) return game.focusSideId;
  if (hasPointEnded(point)) return possession?.sideId ?? activeSideId;
  return activeSideId;
}

/** Returns the PlayerRef of the player currently holding the disc, if it's our possession. */
export function getDiscHolderRef(
  possession: PointPossession | null,
  focusSideId: string,
): PlayerRef | null {
  if (!possession || isPossessionOver(possession) || possession.sideId !== focusSideId) {
    return null;
  }
  return getDiscHolderRefFromActions(possession.actions);
}

function getDiscHolderRefFromActions(actions: PossessionAction[]): PlayerRef | null {
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

function getPostInjuryPickupState(
  possession: PointPossession,
  point: TrackedPoint | null | undefined,
): { shouldPromptForPickup: boolean; pickupIndex: number } | null {
  // Injury stoppages can change the player restarting with a dead disc. Timeouts pause play
  // without changing the holder, so they intentionally do not reset holder/pass-chain state.
  const injuryIndex = possession.actions.findLastIndex(
    (action) =>
      action.kind === 'stoppage' && action.reason === 'injury' && action.resumedAt != null,
  );
  if (injuryIndex === -1) return null;

  const pickupIndex = possession.actions.findIndex(
    (action, index) => index > injuryIndex && action.kind === 'disc_pickup',
  );
  if (pickupIndex !== -1) {
    return { shouldPromptForPickup: false, pickupIndex };
  }

  const injuryAction = possession.actions[injuryIndex];
  const holderBeforeInjury = getDiscHolderRefFromActions(possession.actions.slice(0, injuryIndex));
  if (holderBeforeInjury?.refType !== 'participant') {
    return { shouldPromptForPickup: true, pickupIndex: -1 };
  }

  const subs = getSubsForStoppage(point ?? null, injuryAction.id);
  return {
    shouldPromptForPickup: subs.some((sub) =>
      sub.outIds.includes(holderBeforeInjury.participantId),
    ),
    pickupIndex: -1,
  };
}

/**
 * Returns the disc holder ref, accounting for injury-just-resumed state.
 * After injury, the holder is forced to null only when the holder is unknown or subbed out.
 */
export function getSafeDiscHolderRef(
  possession: PointPossession | null,
  focusSideId: string,
  point?: TrackedPoint | null,
): PlayerRef | null {
  if (
    possession &&
    !isPossessionOver(possession) &&
    possession.sideId === focusSideId &&
    getPostInjuryPickupState(possession, point)?.shouldPromptForPickup
  ) {
    return null;
  }
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

/** Generates the pass chain sequence as an array of events for UI mapping. */
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

export function getActiveGameClockPause(game: AdvancedTrackedGame | null): GameClockPause | null {
  if (!game) return null;
  return game.gameClockPauses?.find((pause) => pause.resumedAt == null) ?? null;
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

export function getCompletedGameClockPauseMsDuringPoint(
  game: AdvancedTrackedGame | null | undefined,
  point: TrackedPoint,
  pointEndMs: number,
): number {
  if (!game || point.startedAt == null) return 0;
  return (game.gameClockPauses ?? []).reduce((total, pause) => {
    if (pause.resumedAt == null) return total;
    const overlapStart = Math.max(point.startedAt!, pause.pausedAt);
    const overlapEnd = Math.min(pointEndMs, pause.resumedAt);
    return total + Math.max(0, overlapEnd - overlapStart);
  }, 0);
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
export function getPointAdjustedTimestamp(
  point: TrackedPoint,
  game?: AdvancedTrackedGame | null,
): number {
  if (point.revivedAt != null && point.elapsedMsAtEnd != null) {
    return point.revivedAt - point.elapsedMsAtEnd;
  }
  if (hasPointEnded(point) && point.elapsedMsAtEnd != null) {
    return Date.now() - point.elapsedMsAtEnd;
  }
  return (
    (point.startedAt ?? 0) +
    getCompletedPauseMs(point) +
    getCompletedGameClockPauseMsDuringPoint(game, point, Date.now())
  );
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
  if (openingAction?.kind === 'pull' && openingAction.result === 'dropped') {
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
    if (result === 'complete' || result === 'goal') return null;

    const hasDefender = defender != null && defender.refType !== 'untracked';

    const label = getLastTurnoverLabel(
      result,
      isFocusPossession,
      options.showSpecificResult === true,
      splitAttribution === true,
      hasDefender,
    );
    if (!label) return null;

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

function getLastTurnoverLabel(
  result: ThrowResult,
  isFocusPossession: boolean,
  showSpecificResult: boolean,
  isSplitAttribution: boolean,
  hasDefender: boolean,
): string | undefined {
  if (isFocusPossession) {
    if (result === 'drop') return isSplitAttribution ? '50/50' : 'DROP';
    return (
      {
        throwaway: 'THROWAWAY',
        stall: 'STALLED',
        block: 'OPP D',
        pressure: 'OPP PRESSURE',
        callahan: 'CALLAHAN',
      } as Partial<Record<ThrowResult, string>>
    )[result];
  }
  if (showSpecificResult) {
    if (result === 'drop') return isSplitAttribution ? '50/50' : 'DROP';
    if (result === 'stall') return hasDefender ? 'STALL' : 'STALLED';
    return (
      {
        throwaway: 'THROWAWAY',
        block: 'BLOCK',
        pressure: 'PRESSURE',
        callahan: 'CALLAHAN',
      } as Partial<Record<ThrowResult, string>>
    )[result];
  }
  if (result === 'callahan') return 'CALLAHAN';
  if (result === 'stall') return hasDefender ? 'STALL' : 'OPP TURN';
  if (result === 'block') return hasDefender ? 'BLOCK' : 'OPP TURN';
  if (result === 'pressure') return hasDefender ? 'PRESSURE' : 'OPP TURN';
  return 'OPP TURN';
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
  result: ThrowResult;
  isFocusPossession: boolean;
  showSpecificResult: boolean;
  hasDefender: boolean;
  toPlayer: PlayerRef | undefined;
  defender: PlayerRef | undefined;
  thrower: PlayerRef | undefined;
  participants: Participant[];
}): string | null {
  if (result === 'drop') return getRefName(toPlayer, participants);
  if (
    (result === 'block' || result === 'stall' || result === 'pressure') &&
    !isFocusPossession &&
    hasDefender
  ) {
    return getRefName(defender, participants);
  }
  if (result === 'stall' && !isFocusPossession && showSpecificResult) {
    return getRefName(thrower, participants);
  }
  if (result === 'block') return null;
  return getRefName(thrower, participants);
}

/**
 * Calculates the current 'active' line for a side by applying all subs in sequence.
 */
export function getEffectiveLineParticipantIds(point: TrackedPoint, sideId: string): string[] {
  return deriveEffectiveLineParticipantIds(point, sideId);
}

/**
 * Calculates the active line before applying the sub tied to the given stoppage.
 */
export function getLineParticipantIdsBeforeSub(
  point: TrackedPoint,
  sideId: string,
  stoppageActionId: string,
): string[] {
  const baseLine = point.lines.find((l) => l.sideId === sideId)?.participantIds ?? [];
  const sideSubs = point.subs?.filter((s) => s.sideId === sideId) ?? [];

  const currentLine = new Set(baseLine);
  for (const sub of sideSubs) {
    if (sub.stoppageActionId === stoppageActionId) {
      break;
    }
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
 * Returns every PointSub associated with a specific stoppage action ID.
 */
export function getSubsForStoppage(point: TrackedPoint | null, actionId: string): PointSub[] {
  if (!point?.subs) return [];
  return point.subs.filter((sub) => sub.stoppageActionId === actionId);
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
  if (passModifier === 'block') return 'TAP PLAYER WHO GOT THE BLOCK';
  if (passModifier === 'callahan') return 'TAP PLAYER FOR CALLAHAN';
  if (passModifier === 'stall') return 'TAP PLAYER WHO STALLED';
  if (passModifier === 'pressure') return 'TAP PLAYER WHO APPLIED PRESSURE';
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
  if (
    passModifier === 'callahan' ||
    passModifier === 'stall' ||
    passModifier === 'block' ||
    passModifier === 'pressure'
  ) {
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
  if (pointIsOver || oppHasDisc || discHolderId !== null || !possession) return false;
  const lastAction = possession.actions.at(-1);
  return lastAction?.kind === 'pull';
}
