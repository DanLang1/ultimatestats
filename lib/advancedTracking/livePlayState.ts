import { getSubsForStoppage } from './injurySubUtils';
import { areBothSidesFullyTracked } from './trackingModeUtils';
import {
  getCurrentPoint,
  getCurrentPossession,
  getOtherSideId,
  hasPointEnded,
  isPossessionOver,
} from './trackingUtils';
import {
  AdvancedTrackedGame,
  BetweenPointTransition,
  GameClockPause,
  PlayerRef,
  PointPossession,
  PossessionAction,
  StoppageAction,
  TrackedPoint,
} from './types';

/** Live-play facts shared by the tracker screen, score bar, and capture planning. */
export interface LivePlayState {
  /** The latest point, or null before the first point starts. */
  point: TrackedPoint | null;
  /** The latest possession of the current point, which may already be over. */
  possession: PointPossession | null;
  /** A side has scored the current point. */
  pointIsOver: boolean;
  /** The side that has (or will next pick up) the disc. */
  activeSideId: string;
  /** The current possession's last action when it is an unresumed stoppage. */
  activeStoppage: StoppageAction | null;
  /** The unresumed game-clock pause, if any. */
  activeGameClockPause: GameClockPause | null;
  /** A stoppage or game-clock pause is open. */
  isPlayPaused: boolean;
  /**
   * The disc holder when `sideId` has the disc; null when it doesn't or a post-injury pickup is
   * pending. Callers pass different sides on purpose: the session view passes the perspective side
   * (what the screen shows), `planCaptureIntent` the active side when both sides are tracked and
   * the focus side otherwise (who the capture is attributed to), and `canSetRedZone` the active
   * side (whose possession enters Red Zone).
   */
  holderFor: (sideId: string) => PlayerRef | null;
}

export function getLivePlayState(game: AdvancedTrackedGame): LivePlayState {
  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  const activeStoppage = getActiveStoppage(possession);
  const activeGameClockPause = getActiveGameClockPause(game);
  return {
    point,
    possession,
    pointIsOver: hasPointEnded(point),
    activeSideId: getActiveSideId(possession, game),
    activeStoppage,
    activeGameClockPause,
    isPlayPaused: activeStoppage !== null || activeGameClockPause !== null,
    holderFor: (sideId) => getSafeDiscHolderRef(possession, sideId, point),
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

/** Returns the active (unresolved) stoppage action in the current possession, if any. */
export function getActiveStoppage(possession: PointPossession | null): StoppageAction | null {
  if (!possession) return null;
  const last = possession.actions[possession.actions.length - 1];
  if (last?.kind === 'stoppage' && last.resumedAt == null) return last;
  return null;
}

export function getActiveGameClockPause(game: AdvancedTrackedGame | null): GameClockPause | null {
  if (!game) return null;
  return game.gameClockPauses?.find((pause) => pause.resumedAt == null) ?? null;
}

export interface ActiveBetweenPointTimeout {
  point: TrackedPoint;
  transition: BetweenPointTransition;
}

export function getActiveBetweenPointTimeout(
  game: AdvancedTrackedGame | null,
): ActiveBetweenPointTimeout | null {
  if (game == null) return null;

  const currentPoint = game.points.at(-1) ?? null;
  if (currentPoint == null || !hasPointEnded(currentPoint)) return null;

  const latestTransition = currentPoint.transitionsAfter?.at(-1);
  if (latestTransition == null || latestTransition.endedAt != null) return null;

  return {
    point: currentPoint,
    transition: latestTransition,
  };
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

/** Where an in-progress possession restarts after a resumed injury stoppage, if one happened. */
export function getPostInjuryPickupState(
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
