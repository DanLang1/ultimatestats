import { getLivePlayState } from './livePlayState';
import { AdvancedTrackedGame } from './types';

/**
 * Why a tracker command is unavailable right now. Each command adds the reasons it needs, so the
 * union grows with the commands module.
 */
export type TrackerCommandBlock =
  | 'point-not-started'
  | 'point-over'
  | 'play-paused'
  | 'holder-required';

/** Whether a tracker command may run now: read by the UI and asserted by the store. */
export type CommandAvailability = { ok: true } | { ok: false; reason: TrackerCommandBlock };

const TRACKER_COMMAND_BLOCK_MESSAGES = {
  'point-not-started': 'the point has not started',
  'point-over': 'the point has ended',
  'play-paused': 'play is paused',
  'holder-required': 'the current holder has not been captured',
} as const satisfies Record<TrackerCommandBlock, string>;

/** Throws when a store action is called for a command its availability check blocks. */
export function assertCommandAllowed(
  availability: CommandAvailability,
  commandLabel: string,
): void {
  if (availability.ok) return;
  throw new Error(
    `Cannot ${commandLabel}: ${TRACKER_COMMAND_BLOCK_MESSAGES[availability.reason]}.`,
  );
}

/** Red Zone can only change while a point is in play. */
function getRedZonePlayBlock(game: AdvancedTrackedGame): CommandAvailability {
  const { point, pointIsOver, isPlayPaused } = getLivePlayState(game);
  if (point == null) return { ok: false, reason: 'point-not-started' };
  if (pointIsOver) return { ok: false, reason: 'point-over' };
  if (isPlayPaused) return { ok: false, reason: 'play-paused' };
  return { ok: true };
}

/**
 * Whether Red Zone can be cleared. Clearing never needs a holder, so it stays available after an
 * injury substitution takes the holder off the field.
 */
export function canClearRedZone(game: AdvancedTrackedGame): CommandAvailability {
  return getRedZonePlayBlock(game);
}

/**
 * Whether Red Zone can be set for the side that has (or will next pick up) the disc. A fully
 * tracked side needs a captured holder; an anonymous side does not.
 */
export function canSetRedZone(game: AdvancedTrackedGame): CommandAvailability {
  const playBlock = getRedZonePlayBlock(game);
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
