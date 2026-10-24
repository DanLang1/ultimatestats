import { getLivePlayState } from './livePlayState';
import { getPossessionEnd, hasPointEnded } from './trackingUtils';
import type { AdvancedTrackedGame, TrackedPoint } from './types';

interface DeadInterval {
  start: number;
  end: number;
}

/** Completed stoppages, completed game-clock pauses, and goal-to-undo gaps. */
function getDeadIntervals(game: AdvancedTrackedGame, point: TrackedPoint): DeadInterval[] {
  const stoppages = point.possessions
    .flatMap((possession) => possession.actions)
    .flatMap((action) =>
      action.kind === 'stoppage' && action.pausedAt != null && action.resumedAt != null
        ? [{ start: action.pausedAt, end: action.resumedAt }]
        : [],
    );
  const gameClockPauses = (game.gameClockPauses ?? []).flatMap((pause) =>
    pause.resumedAt == null ? [] : [{ start: pause.pausedAt, end: pause.resumedAt }],
  );
  const revivals = (point.revivalPauses ?? []).map((pause) => ({
    start: pause.pausedAt,
    end: pause.resumedAt,
  }));
  return [...stoppages, ...gameClockPauses, ...revivals];
}

/** Length of the union of `intervals` within `[from, to]`, so overlaps count once. */
function getDeadMsWithin(intervals: DeadInterval[], from: number, to: number): number {
  const clipped = intervals
    .map(({ start, end }) => ({ start: Math.max(start, from), end: Math.min(end, to) }))
    .filter(({ start, end }) => end > start)
    .sort((a, b) => a.start - b.start);

  let total = 0;
  let coveredUntil = from;
  for (const { start, end } of clipped) {
    const uncoveredStart = Math.max(start, coveredUntil);
    if (end > uncoveredStart) {
      total += end - uncoveredStart;
      coveredUntil = end;
    }
  }
  return total;
}

/**
 * When the scoring action was recorded; undefined while the point is still being played or when
 * the scoring action has no timestamp.
 */
function getPointEndedAt(point: TrackedPoint): number | undefined {
  if (!hasPointEnded(point)) return undefined;
  const end = getPossessionEnd(point.possessions[point.possessions.length - 1]);
  if (end == null) throw new Error(`Ended point "${point.id}" has no scoring action.`);
  return end.action.recordedAt;
}

/**
 * Active play in `point` at absolute time `at`: time since the point started minus completed dead
 * time. Open pauses are not subtracted; the live timer freezes at their `pausedAt` instead.
 */
export function getActivePlayElapsedMsAt(
  game: AdvancedTrackedGame,
  point: TrackedPoint,
  at: number,
): number | null {
  if (point.startedAt == null) return null;
  return at - point.startedAt - getDeadMsWithin(getDeadIntervals(game, point), point.startedAt, at);
}

/** What the live point timer shows: `(frozenAt ?? now) - base`. */
export interface PointTimer {
  /** The start time shifted by the dead time before `frozenAt`; null when the point is untimed. */
  base: number | null;
  /** When the timer stopped counting; null while play is running. */
  frozenAt: number | null;
}

/**
 * The live point timer for the current point; null before the first point. It freezes at the
 * point's end first, since a cap pause can open after a goal; otherwise at an open cap pause or
 * stoppage, which never overlap. Dead time after the freeze, such as a goal-to-undo gap closed
 * during a cap pause, must not shift the frozen value.
 */
export function getPointTimer(game: AdvancedTrackedGame): PointTimer | null {
  const { point, activeGameClockPause, activeStoppage } = getLivePlayState(game);
  if (point == null) return null;
  const endedAt = getPointEndedAt(point);
  const frozenAt = endedAt ?? activeGameClockPause?.pausedAt ?? activeStoppage?.pausedAt ?? null;

  if (point.startedAt == null || (endedAt == null && hasPointEnded(point))) {
    return { base: null, frozenAt };
  }
  const until = frozenAt ?? Number.POSITIVE_INFINITY;
  const deadMs = getDeadMsWithin(getDeadIntervals(game, point), point.startedAt, until);
  return { base: point.startedAt + deadMs, frozenAt };
}
