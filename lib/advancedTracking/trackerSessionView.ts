import {
  getActiveGameClockPause,
  getActiveSideId,
  getActiveStoppage,
  getSafeDiscHolderRef,
  getTrackerDisplaySideId,
  getTrackerPickupState,
} from './trackingDisplayHelpers';
import { areBothSidesFullyTracked } from './trackingModeUtils';
import {
  getCurrentPoint,
  getCurrentPossession,
  getOtherSideId,
  hasPointEnded,
} from './trackingUtils';
import {
  AdvancedTrackedGame,
  GameClockPause,
  PassModifier,
  PlayerRef,
  PointPossession,
  StoppageAction,
  TrackedPoint,
} from './types';

/**
 * What the in-point footer shows. `hidden` means an armed modifier owns the next tap: the row is
 * hidden from view and assistive tech but keeps its space so the player grid does not resize.
 */
export type TrackerFooterMode =
  | { kind: 'defense'; hidden: boolean }
  | { kind: 'pickup'; hidden: boolean }
  | { kind: 'offense'; hidden: boolean };

/** Live tracker state derived once from the current game and the screen's armed modifier. */
export interface TrackerSessionView {
  game: AdvancedTrackedGame;
  point: TrackedPoint | null;
  possession: PointPossession | null;
  pointIsOver: boolean;
  tracksBothSides: boolean;
  /** The side that has (or will next pick up) the disc. */
  activeSideId: string;
  /** The side whose holder and last-action context the tracker shows. */
  perspectiveSideId: string;
  /** The side whose line the player grid shows; defensive modifiers flip it in scrimmage. */
  displaySideId: string;
  /** Single-team tracking only: the untracked opponent holds the disc. */
  oppHasDisc: boolean;
  discHolderRef: PlayerRef | null;
  /** A received pull can still be marked dropped by the receiving team. */
  canDropOpeningPull: boolean;
  activeStoppage: StoppageAction | null;
  activeGameClockPause: GameClockPause | null;
  /** The point is in progress with no stoppage or game-clock pause, so in-point controls show. */
  isPlayLive: boolean;
  canUseVoice: boolean;
  canUseRareMenu: boolean;
  /** Null while play is not live, when no in-point footer shows. */
  footerMode: TrackerFooterMode | null;
}

/** Modifiers whose next tap names a defender, so the grid shows the side without the disc. */
const DEFENSIVE_MODIFIERS: ReadonlySet<PassModifier> = new Set([
  'block',
  'callahan',
  'stall',
  'pressure',
]);

export function getTrackerSessionView(
  game: AdvancedTrackedGame,
  { passModifier }: { passModifier: PassModifier },
): TrackerSessionView {
  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  const pointIsOver = hasPointEnded(point);
  const tracksBothSides = areBothSidesFullyTracked(game);
  const activeSideId = getActiveSideId(possession, game);
  const perspectiveSideId = getTrackerDisplaySideId(game, possession, point);
  const oppHasDisc = !tracksBothSides && !pointIsOver && activeSideId !== game.focusSideId;
  const discHolderRef = getSafeDiscHolderRef(possession, perspectiveSideId, point);
  const { canDropOpeningPull, isAwaitingMidPointPickup } = getTrackerPickupState({
    possession,
    pointIsOver,
    oppHasDisc,
    discHolderRef,
  });
  const activeStoppage = getActiveStoppage(possession);
  const activeGameClockPause = getActiveGameClockPause(game);
  const isPlayLive = !pointIsOver && activeStoppage === null && activeGameClockPause === null;
  const isModifierArmed = passModifier !== null;

  let displaySideId = game.focusSideId;
  if (tracksBothSides) {
    displaySideId = DEFENSIVE_MODIFIERS.has(passModifier)
      ? getOtherSideId(game, activeSideId)
      : activeSideId;
  }

  // An armed modifier owns the next tap; disabling voice also stops any active listening.
  const canUseVoice =
    !isModifierArmed &&
    !pointIsOver &&
    activeStoppage === null &&
    activeGameClockPause === null &&
    !oppHasDisc &&
    discHolderRef != null;

  return {
    game,
    point,
    possession,
    pointIsOver,
    tracksBothSides,
    activeSideId,
    perspectiveSideId,
    displaySideId,
    oppHasDisc,
    discHolderRef,
    canDropOpeningPull,
    activeStoppage,
    activeGameClockPause,
    isPlayLive,
    canUseVoice,
    // An armed modifier owns the next tap; cancel it to reach rare actions.
    canUseRareMenu: !isModifierArmed && !pointIsOver && (oppHasDisc || discHolderRef != null),
    footerMode: getTrackerFooterMode({
      isPlayLive,
      oppHasDisc,
      isAwaitingMidPointPickup,
      hidden: isModifierArmed,
    }),
  };
}

function getTrackerFooterMode({
  isPlayLive,
  oppHasDisc,
  isAwaitingMidPointPickup,
  hidden,
}: {
  isPlayLive: boolean;
  oppHasDisc: boolean;
  isAwaitingMidPointPickup: boolean;
  hidden: boolean;
}): TrackerFooterMode | null {
  if (!isPlayLive) return null;
  if (oppHasDisc) return { kind: 'defense', hidden };
  if (isAwaitingMidPointPickup) return { kind: 'pickup', hidden };
  return { kind: 'offense', hidden };
}
