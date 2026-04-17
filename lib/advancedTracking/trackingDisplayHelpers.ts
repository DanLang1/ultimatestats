import { hasItems } from '@/lib/utils';
import { getOtherSideId, isPossessionOver } from './trackingUtils';
import {
  AdvancedTrackedGame,
  Participant,
  PlayerRef,
  PointPossession,
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
  const isFocusGoal = lastPossession.sideId === focusSideId || isCallahan;

  const getName = (ref: PlayerRef | undefined) =>
    ref?.refType === 'participant'
      ? (participants.find((p) => p.id === ref.participantId)?.name ?? null)
      : null;

  return {
    isFocusGoal,
    isCallahan,
    scorerName: getName(toPlayer),
    assisterName: isFocusGoal && !isCallahan ? getName(thrower) : null,
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

/** Returns the ID of the player currently holding the disc, if it's our possession. */
export function getDiscHolderId(
  possession: PointPossession | null,
  focusSideId: string,
): string | null {
  if (!possession || isPossessionOver(possession) || possession.sideId !== focusSideId) {
    return null;
  }
  const actions = possession.actions;
  for (let i = actions.length - 1; i >= 0; i--) {
    const action = actions[i];
    if (action.kind === 'disc_pickup' && action.player.refType === 'participant') {
      return action.player.participantId;
    } else if (action.kind === 'throw' && action.toPlayer?.refType === 'participant') {
      return action.toPlayer.participantId;
    }
  }
  return null;
}

export interface PassChainEvent {
  id: string; // The action ID
  name: string; // The participant name
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

  const getParticipantName = (refId: string) =>
    participants.find((p) => p.id === refId)?.name ?? null;

  const chainEvents: PassChainEvent[] = [];

  // Capture the initial holder if the first action is a pickup
  const firstAction = possession.actions[0];
  if (firstAction?.kind === 'disc_pickup' && firstAction.player.refType === 'participant') {
    const name = getParticipantName(firstAction.player.participantId);
    if (name) chainEvents.push({ id: firstAction.id, name });
  }

  possession.actions.forEach((action) => {
    if (action.kind === 'throw') {
      // If we didn't have an initial holder, infer from the first thrower.
      // ID is suffixed because the action itself is a throw, not a pickup.
      if (chainEvents.length === 0 && action.thrower?.refType === 'participant') {
        const throwerName = getParticipantName(action.thrower.participantId);
        if (throwerName) chainEvents.push({ id: `${action.id}-thrower`, name: throwerName });
      }
      if (action.toPlayer?.refType === 'participant') {
        const receiverName = getParticipantName(action.toPlayer.participantId);
        if (receiverName) chainEvents.push({ id: action.id, name: receiverName });
      }
    }
  });

  const truncated = chainEvents.length > maxDisplay;
  const visibleEvents = chainEvents.slice(-maxDisplay);

  return { events: visibleEvents, truncated };
}

/** Calculates how many timeouts a side has used in the game (between-point + mid-point). */
export function getSideTimeoutsUsed(game: AdvancedTrackedGame, sideId: string): number {
  return game.points.reduce((total, point) => {
    const betweenCount =
      point.transitionsAfter?.filter(
        (transition) => transition.transitionType === 'timeout' && transition.sideId === sideId,
      ).length ?? 0;
    const midPointCount = point.possessions.reduce(
      (count, possession) =>
        count +
        possession.actions.filter(
          (action) =>
            action.kind === 'stoppage' && action.reason === 'timeout' && action.sideId === sideId,
        ).length,
      0,
    );
    return total + betweenCount + midPointCount;
  }, 0);
}

/** Returns the active (unresolved) stoppage action in the current possession, if any. */
export function getActiveStoppage(possession: PointPossession | null): StoppageAction | null {
  if (!possession) return null;
  const last = possession.actions[possession.actions.length - 1];
  if (last?.kind === 'stoppage' && last.resumedAt == null) return last;
  return null;
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

    const hasDefender = defender?.refType === 'participant';

    const labelMap: Partial<Record<typeof result, string>> = isFocusPossession
      ? {
          throwaway: 'THROWAWAY',
          drop: splitAttribution ? '50/50' : 'DROP',
          stall: 'STALL',
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

    const getName = (ref: typeof thrower | undefined) =>
      ref?.refType === 'participant'
        ? (participants.find((p) => p.id === ref.participantId)?.name ?? null)
        : null;

    // drop → toPlayer (the dropper); block/stall on opp → defender (our player); everything else → thrower
    let responsibleName;
    if (result === 'drop') {
      responsibleName = getName(toPlayer);
    } else if ((result === 'block' || result === 'stall') && !isFocusPossession) {
      responsibleName = getName(defender);
    } else {
      responsibleName = getName(thrower);
    }

    const isFiftyFifty = result === 'drop' && (splitAttribution ?? false);

    return {
      label,
      isFocusTurnover: isFocusPossession,
      isDropWithSplitAttribution: isFiftyFifty,
      responsibleName,
      throwerName: isFiftyFifty ? getName(thrower) : null,
    };
  }

  return null;
}
