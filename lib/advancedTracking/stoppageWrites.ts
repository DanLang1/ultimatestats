/**
 * Live writes that stop and restart the clocks: game-clock pauses and in-point stoppages. The
 * store asserts the tracker command first; these mutate a live game draft and produce no undo entry.
 */
import { getActiveGameClockPause, getActiveStoppage } from './livePlayState';
import { getCurrentPoint, getCurrentPossession, hasPointEnded } from './trackingUtils';
import type { AdvancedTrackedGame, GameClockPauseReason, StoppageReason } from './types';
import type { WriteContext } from './writeContext';

/** What the store resolves for a stoppage, including whether a timeout spends the floater. */
export interface StoppageWrite {
  reason: StoppageReason;
  sideId?: string;
  isFloater?: boolean;
}

/** Starts a game-clock pause, linked to the current point while it is in progress. Returns its ID. */
export function applyGameClockPause(
  game: AdvancedTrackedGame,
  reason: GameClockPauseReason,
  ctx: WriteContext,
): string {
  const point = getCurrentPoint(game);
  const pauseId = ctx.newId();
  if (game.gameClockPauses == null) {
    game.gameClockPauses = [];
  }
  game.gameClockPauses.push({
    id: pauseId,
    reason,
    pausedAt: ctx.at,
    pointId: point != null && !hasPointEnded(point) ? point.id : undefined,
  });
  return pauseId;
}

export function applyGameClockResume(game: AdvancedTrackedGame, at: number): void {
  const pause = getActiveGameClockPause(game);
  if (pause == null) throw new Error('No active game-clock pause to resume.');
  pause.resumedAt = at;
}

/** Appends a stoppage to the current possession, pausing play at `ctx.at`. Returns its action ID. */
export function applyStoppage(
  game: AdvancedTrackedGame,
  stoppage: StoppageWrite,
  ctx: WriteContext,
): string {
  const possession = getCurrentPossession(game);
  if (possession == null) throw new Error('No current possession for a stoppage.');
  const actionId = ctx.newId();
  possession.actions.push({
    id: actionId,
    kind: 'stoppage',
    reason: stoppage.reason,
    sideId: stoppage.sideId,
    isFloater: stoppage.isFloater,
    recordedAt: ctx.at,
    pausedAt: ctx.at,
  });
  return actionId;
}

/** Resumes play from the active stoppage on the current possession. */
export function applyStoppageResume(game: AdvancedTrackedGame, at: number): void {
  const stoppage = getActiveStoppage(getCurrentPossession(game));
  if (stoppage == null) throw new Error('No active stoppage to resume.');
  stoppage.resumedAt = at;
}
