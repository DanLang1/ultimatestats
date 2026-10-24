import { getLivePlayState } from './livePlayState';
import type { AdvancedTrackingUndoEntry } from './persistenceTypes';
import {
  canAmendOpeningPull,
  canCapture,
  canChangeLine,
  canPauseGameClock,
  canUndo,
} from './trackerCommands';
import { getTrackerDisplaySideId } from './trackingDisplayHelpers';
import { areBothSidesFullyTracked } from './trackingModeUtils';
import { canStartSecondHalfEarly, getOtherSideId } from './trackingUtils';
import {
  AdvancedTrackedGame,
  GameClockPause,
  isDefensivePassModifier,
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

/** Whether each tracker control is available now: the store's command rules plus UI-only gates. */
export interface TrackerCommands {
  /** Correct the line or record an injury sub; an armed modifier owns the next tap instead. */
  changeLine: boolean;
  /** A received pull can still be marked dropped by the receiving team. */
  amendOpeningPull: boolean;
  pauseGameClock: boolean;
  startSecondHalfEarly: boolean;
  undo: boolean;
  /** A voice pass can be captured: play is live, a holder exists, and no modifier is armed. */
  recordVoicePass: boolean;
  /** The rare-actions menu can open: a point is in play with the disc held and no modifier armed. */
  openRareMenu: boolean;
}

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
  activeStoppage: StoppageAction | null;
  activeGameClockPause: GameClockPause | null;
  /** The point is in progress with no stoppage or game-clock pause, so in-point controls show. */
  isPlayLive: boolean;
  /** Null while play is not live, when no in-point footer shows. */
  footerMode: TrackerFooterMode | null;
  commands: TrackerCommands;
}

export function getTrackerSessionView(
  game: AdvancedTrackedGame,
  {
    passModifier,
    lastUndoEntry,
  }: { passModifier: PassModifier; lastUndoEntry: AdvancedTrackingUndoEntry | undefined },
): TrackerSessionView {
  const {
    point,
    possession,
    pointIsOver,
    activeSideId,
    activeStoppage,
    activeGameClockPause,
    isPlayPaused,
    holderFor,
  } = getLivePlayState(game);
  const tracksBothSides = areBothSidesFullyTracked(game);
  const perspectiveSideId = getTrackerDisplaySideId(game, possession, point);
  const oppHasDisc = !tracksBothSides && !pointIsOver && activeSideId !== game.focusSideId;
  const discHolderRef = holderFor(perspectiveSideId);
  const canDropOpeningPull = canAmendOpeningPull(game).ok;
  // Before the first pull there is no possession (the last-action card prompts instead), and a
  // received pull keeps the footer actions so Drop can record a dropped pull.
  const isAwaitingMidPointPickup =
    possession != null &&
    !pointIsOver &&
    !oppHasDisc &&
    discHolderRef == null &&
    !canDropOpeningPull;
  const isPlayLive = !pointIsOver && !isPlayPaused;
  const isModifierArmed = passModifier !== null;

  let displaySideId = game.focusSideId;
  if (tracksBothSides) {
    displaySideId = isDefensivePassModifier(passModifier)
      ? getOtherSideId(game, activeSideId)
      : activeSideId;
  }

  // An armed modifier owns the next tap; disabling voice also stops any active listening.
  const canUseVoice =
    !isModifierArmed && canCapture(game).ok && !oppHasDisc && discHolderRef != null;

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
    activeStoppage,
    activeGameClockPause,
    isPlayLive,
    footerMode: getTrackerFooterMode({
      isPlayLive,
      oppHasDisc,
      isAwaitingMidPointPickup,
      hidden: isModifierArmed,
    }),
    commands: {
      changeLine: !isModifierArmed && canChangeLine(game).ok,
      amendOpeningPull: canDropOpeningPull,
      pauseGameClock: canPauseGameClock(game).ok,
      startSecondHalfEarly: canStartSecondHalfEarly(game, lastUndoEntry),
      undo: canUndo(game, lastUndoEntry).ok,
      recordVoicePass: canUseVoice,
      // An armed modifier owns the next tap; cancel it to reach rare actions.
      openRareMenu: !isModifierArmed && !pointIsOver && (oppHasDisc || discHolderRef != null),
    },
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
