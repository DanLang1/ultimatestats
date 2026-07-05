import { hasItems } from '@/lib/utils';
import { getRecentLines, RecentLine } from '@/lib/lineUtils';
import { PointLineRecord } from '@/lib/storage/types';
import { getCapThresholdMinutes, type CapTimingSettings } from './capUtils';
import {
  AdvancedTrackedGame,
  GameSide,
  GameTransition,
  Participant,
  PlayerRef,
  PointLine,
  PointPossession,
  PullAction,
  ThrowResult,
  TrackedPoint,
} from './types';

export interface AdvancedHalftimeEarlyUndoEntry {
  kind: string;
  pointId: string;
}

// --- Traversal ---

export function getCurrentPoint(game: AdvancedTrackedGame | null): TrackedPoint | null {
  if (game == null || !hasItems(game.points)) {
    return null;
  }

  return game.points[game.points.length - 1];
}

export function getCurrentPossession(game: AdvancedTrackedGame | null): PointPossession | null {
  const point = getCurrentPoint(game);
  if (point == null || !hasItems(point.possessions)) {
    return null;
  }

  return point.possessions[point.possessions.length - 1];
}

export function getLastAction(possession: PointPossession | null) {
  if (possession == null || !hasItems(possession.actions)) {
    return null;
  }

  return possession.actions[possession.actions.length - 1];
}

export function getOtherSideId(game: AdvancedTrackedGame, sideId: string): string {
  const otherSide = game.sides.find((side) => side.id !== sideId);
  if (otherSide == null) {
    throw new Error(`Could not find opposite side for sideId "${sideId}".`);
  }

  return otherSide.id;
}

export function getReceivingSideForNextPoint(game: AdvancedTrackedGame): string {
  // called before next point is created, so 'last point' in array is completed one
  const previousPoint = getCurrentPoint(game);
  if (previousPoint == null) {
    return game.initialReceivingSideId;
  }

  const scoringSideId = getPointScoringSideId(game, previousPoint);
  if (scoringSideId == null) {
    throw new Error('Cannot derive next point receiving side before the current point is scored.');
  }

  // Default: scoring team pulls next, so the other side receives.
  let receivingSideId = getOtherSideId(game, scoringSideId);

  // Halftime flips receiving: the team that initially received now pulls,
  // and the team that initially pulled now receives — regardless of who scored.
  const halftimeAfterPointId = game.gameTransitions?.find(
    (t) => t.transitionType === 'halftime',
  )?.afterPointId;

  if (halftimeAfterPointId === previousPoint.id) {
    receivingSideId = getOtherSideId(game, game.initialReceivingSideId);
  }

  return receivingSideId;
}

// --- Classification ---

export function isPointEndingThrow(result: ThrowResult): boolean {
  return result === 'goal' || result === 'callahan';
}

export function isTurnoverThrow(result: ThrowResult): boolean {
  return result === 'drop' || result === 'throwaway' || result === 'stall' || result === 'block';
}

export function didPullTurnOver(result: PullAction['result']): boolean {
  return result === 'dropped';
}

export function isPossessionOver(possession: PointPossession | null): boolean {
  const lastAction = possession?.actions.findLast((action) => action.kind !== 'stoppage') ?? null;
  if (lastAction == null) {
    return false;
  }

  if (lastAction.kind === 'throw') {
    return isPointEndingThrow(lastAction.result) || isTurnoverThrow(lastAction.result);
  }

  if (lastAction.kind === 'pull') {
    return didPullTurnOver(lastAction.result);
  }

  return false;
}

/**
 * Returns true when the current disc holder received their disc via a completed throw,
 * meaning pressing GOAL can retroactively mark that throw as a goal.
 */
export function canRecordGoal(possession: PointPossession | null): boolean {
  if (!possession || isPossessionOver(possession)) return false;
  for (let i = possession.actions.length - 1; i >= 0; i--) {
    const action = possession.actions[i];
    if (action.kind === 'throw') {
      return action.result === 'complete' && action.toPlayer?.refType === 'participant';
    }
    if (action.kind === 'disc_pickup') {
      return false;
    }
  }
  return false;
}

export function hasPointEnded(point: TrackedPoint | null): boolean {
  if (point == null || !hasItems(point.possessions)) {
    return false;
  }

  const possession = point.possessions[point.possessions.length - 1];
  const lastAction = possession?.actions[possession.actions.length - 1];

  return lastAction?.kind === 'throw' && isPointEndingThrow(lastAction.result);
}

export function getPointScoringSideId(
  game: AdvancedTrackedGame,
  point: TrackedPoint,
): string | null {
  const possession = point.possessions[point.possessions.length - 1];
  const lastAction = possession?.actions[possession.actions.length - 1];

  if (lastAction == null || lastAction.kind !== 'throw') {
    return null;
  }

  if (lastAction.result === 'goal') {
    return possession.sideId;
  }

  if (lastAction.result === 'callahan') {
    return getOtherSideId(game, possession.sideId);
  }

  return null;
}

export function cloneGame(game: AdvancedTrackedGame): AdvancedTrackedGame {
  return structuredClone(game);
}

export function getGameScore(game: AdvancedTrackedGame): Record<string, number> {
  const score: Record<string, number> = {};
  for (const side of game.sides) {
    score[side.id] = 0;
  }
  for (const point of game.points) {
    const scoringSideId = getPointScoringSideId(game, point);
    if (scoringSideId != null) {
      score[scoringSideId] = (score[scoringSideId] ?? 0) + 1;
    }
  }
  return score;
}

/** Returns the score for a specific side. Throws if the sideId is not present in the game. */
export function getSideScore(game: AdvancedTrackedGame, sideId: string): number {
  const score = getGameScore(game)[sideId];
  if (score == null) throw new Error(`No score entry for side "${sideId}" in game ${game.id}.`);
  return score;
}

export function getScoreThroughPoint(
  game: AdvancedTrackedGame,
  pointId: string,
): Record<string, number> {
  const score: Record<string, number> = {};
  for (const side of game.sides) {
    score[side.id] = 0;
  }

  for (const point of game.points) {
    const scoringSideId = getPointScoringSideId(game, point);
    if (scoringSideId != null) {
      score[scoringSideId] = (score[scoringSideId] ?? 0) + 1;
    }

    if (point.id === pointId) {
      return score;
    }
  }

  throw new Error(`Point "${pointId}" not found in advanced tracking game "${game.id}".`);
}

export function getEffectiveGameTo(game: AdvancedTrackedGame): number {
  const baseGameTo = game.settings.format?.gameTo;
  if (baseGameTo == null) {
    throw new Error(`Advanced tracking game "${game.id}" is missing settings.format.gameTo.`);
  }

  if (game.settings.format?.softCapEnabled === false) {
    return baseGameTo;
  }

  const softCapTransition = game.gameTransitions?.find(
    (transition) => transition.transitionType === 'soft_cap',
  );
  if (softCapTransition?.afterPointId == null) {
    return baseGameTo;
  }

  const scoreAtSoftCap = getScoreThroughPoint(game, softCapTransition.afterPointId);
  const highestScore = Math.max(...Object.values(scoreAtSoftCap));

  if (highestScore < baseGameTo) {
    return highestScore + 1;
  }
  return baseGameTo;
}

export function isAdvancedGameOver(game: AdvancedTrackedGame): boolean {
  const currentPoint = getCurrentPoint(game);
  if (currentPoint == null || !hasPointEnded(currentPoint)) {
    return false;
  }

  const score = getGameScore(game);
  const [firstSide, secondSide] = game.sides;
  const firstScore = score[firstSide.id] ?? 0;
  const secondScore = score[secondSide.id] ?? 0;
  const notTied = firstScore !== secondScore;

  const hardCapEnabled = game.settings.format?.hardCapEnabled !== false;
  if (
    hardCapEnabled &&
    game.gameTransitions?.some((transition) => transition.transitionType === 'hard_cap')
  ) {
    return notTied;
  }

  const effectiveGameTo = getEffectiveGameTo(game);

  return (firstScore >= effectiveGameTo || secondScore >= effectiveGameTo) && notTied;
}

export function didLastOperationEndCurrentPoint(
  game: AdvancedTrackedGame,
  lastUndoEntry: AdvancedHalftimeEarlyUndoEntry | undefined,
): boolean {
  const currentPoint = getCurrentPoint(game);
  return (
    currentPoint != null &&
    (lastUndoEntry?.kind === 'action' || lastUndoEntry?.kind === 'amend_throw_result') &&
    lastUndoEntry.pointId === currentPoint.id
  );
}

export function canStartSecondHalfEarly(
  game: AdvancedTrackedGame | undefined,
  lastUndoEntry: AdvancedHalftimeEarlyUndoEntry | undefined,
): boolean {
  if (game === undefined) {
    return false;
  }
  const currentPoint = getCurrentPoint(game);
  if (currentPoint == null) {
    return false;
  }

  return (
    game.settings.format?.halftimeAt != null &&
    hasPointEnded(currentPoint) &&
    didLastOperationEndCurrentPoint(game, lastUndoEntry) &&
    !isAdvancedGameOver(game) &&
    !game.gameTransitions?.some((transition) => transition.transitionType === 'halftime')
  );
}

export function syncDerivedHalftimeTransition(game: AdvancedTrackedGame): boolean {
  const halftimeAt = game.settings.format?.halftimeAt;
  const existingTransitions = game.gameTransitions ?? [];
  const existingHalftime = existingTransitions.find(
    (transition) => transition.transitionType === 'halftime',
  );
  const existingEarlyHalftime =
    existingHalftime?.transitionType === 'halftime' && existingHalftime.triggeredEarly === true
      ? existingHalftime
      : undefined;

  let halftimeAfterPointId: string | undefined;
  if (existingEarlyHalftime != null) {
    const earlyPoint = game.points.find((point) => point.id === existingEarlyHalftime.afterPointId);
    if (earlyPoint != null && hasPointEnded(earlyPoint)) {
      halftimeAfterPointId = existingEarlyHalftime.afterPointId;
    }
  } else if (halftimeAt != null) {
    const runningScore: Record<string, number> = {};
    for (const side of game.sides) {
      runningScore[side.id] = 0;
    }

    for (const point of game.points) {
      const scoringSideId = getPointScoringSideId(game, point);
      if (scoringSideId == null) {
        continue;
      }

      runningScore[scoringSideId] = (runningScore[scoringSideId] ?? 0) + 1;
      if (runningScore[scoringSideId] === halftimeAt) {
        halftimeAfterPointId = point.id;
        break;
      }
    }
  }

  const nextTransitions: GameTransition[] = existingTransitions.filter(
    (transition) => transition.transitionType !== 'halftime',
  );
  if (halftimeAfterPointId != null) {
    nextTransitions.push({
      id: existingHalftime?.id ?? `halftime_${game.id}`,
      transitionType: 'halftime',
      afterPointId: halftimeAfterPointId,
      ...(existingEarlyHalftime != null ? { triggeredEarly: true } : {}),
    });
  }

  game.gameTransitions = hasItems(nextTransitions) ? nextTransitions : undefined;

  const currentPoint = getCurrentPoint(game);
  return (
    currentPoint != null &&
    hasPointEnded(currentPoint) &&
    halftimeAfterPointId != null &&
    halftimeAfterPointId === currentPoint.id
  );
}

/**
 * Appends `soft_cap` / `hard_cap` transitions to the game when the elapsed game
 * clock has crossed the configured thresholds. Idempotent — each transition is
 * only recorded once. Meant to be called from within a mutative store setter
 * (operates on the passed game reference).
 *
 * - `soft_cap` is only recorded when a point has just ended (between-points).
 * - `hard_cap` may be recorded mid-point; `afterPointId` is set if the current
 *   point has ended, otherwise left undefined.
 *
 * Returns true if any transition was added.
 */
export function syncCapTransitions(
  game: AdvancedTrackedGame,
  input: {
    gameElapsedMs: number;
    capTiming: CapTimingSettings;
  },
): boolean {
  const { gameElapsedMs, capTiming } = input;
  const { softCapAtMinutes, hardCapAtMinutes } = getCapThresholdMinutes(game, capTiming);
  const softCapMs = softCapAtMinutes == null ? null : Math.max(0, softCapAtMinutes * 60 * 1000);
  const hardCapMs = hardCapAtMinutes == null ? null : Math.max(0, hardCapAtMinutes * 60 * 1000);

  const transitions = game.gameTransitions ?? [];
  const hasSoftCap = transitions.some((t) => t.transitionType === 'soft_cap');
  const hasHardCap = transitions.some((t) => t.transitionType === 'hard_cap');

  const currentPoint = getCurrentPoint(game);
  const pointEnded = currentPoint != null && hasPointEnded(currentPoint);

  const next: GameTransition[] = [...transitions];
  let didChange = false;

  if (softCapMs != null && !hasSoftCap && pointEnded && gameElapsedMs >= softCapMs) {
    next.push({
      id: `soft_cap_${game.id}`,
      transitionType: 'soft_cap',
      afterPointId: currentPoint.id,
    });
    didChange = true;
  }

  if (hardCapMs != null && !hasHardCap && gameElapsedMs >= hardCapMs) {
    next.push({
      id: `hard_cap_${game.id}`,
      transitionType: 'hard_cap',
      afterPointId: pointEnded ? currentPoint.id : undefined,
    });
    didChange = true;
  }

  if (didChange) {
    game.gameTransitions = next;
  }
  return didChange;
}

// --- Assertions ---

export function assertTwoSides(sides: GameSide[]) {
  if (sides.length !== 2) {
    throw new Error('Advanced tracking MVP currently requires exactly two sides.');
  }
}

export function assertValidSideIds(game: AdvancedTrackedGame, sideIds: string[]) {
  const validSideIds = new Set(game.sides.map((side) => side.id));

  for (const sideId of sideIds) {
    if (!validSideIds.has(sideId)) {
      throw new Error(`Unknown sideId "${sideId}" for advanced tracking game "${game.id}".`);
    }
  }
}

export function assertValidParticipantRefs(
  game: AdvancedTrackedGame,
  refs: (PlayerRef | undefined)[],
) {
  const participantIds = new Set(
    game.participants.map((participant: Participant) => participant.id),
  );

  for (const ref of refs) {
    if (ref == null || ref.refType !== 'participant') {
      continue;
    }

    if (!participantIds.has(ref.participantId)) {
      throw new Error(
        `Unknown participantId "${ref.participantId}" for advanced tracking game "${game.id}".`,
      );
    }
  }
}

export function assertValidLines(game: AdvancedTrackedGame, lines: PointLine[]) {
  if (!hasItems(lines)) {
    throw new Error('Cannot start a point without at least one line.');
  }

  const validSideIds = new Set(game.sides.map((side) => side.id));
  const participantIds = new Set(
    game.participants.map((participant: Participant) => participant.id),
  );

  for (const line of lines) {
    if (!validSideIds.has(line.sideId)) {
      throw new Error(`Unknown sideId "${line.sideId}" while starting an advanced point.`);
    }

    for (const participantId of line.participantIds) {
      if (!participantIds.has(participantId)) {
        throw new Error(
          `Unknown participantId "${participantId}" while starting an advanced point.`,
        );
      }
    }
  }
}

export interface InjurySubInput {
  stoppageActionId: string;
  sideId: string;
  inIds: string[];
  outIds: string[];
}

export function assertValidInjurySubInput(
  game: AdvancedTrackedGame,
  point: TrackedPoint,
  input: InjurySubInput,
) {
  let stoppageFound = false;
  for (const possession of point.possessions) {
    for (const action of possession.actions) {
      if (action.id === input.stoppageActionId) {
        if (action.kind !== 'stoppage') {
          throw new Error(`Action "${input.stoppageActionId}" is not a stoppage.`);
        }
        if (action.reason !== 'injury') {
          throw new Error('Only injury stoppages can have subs.');
        }
        stoppageFound = true;
        break;
      }
    }
    if (stoppageFound) break;
  }
  if (!stoppageFound) {
    throw new Error(`Stoppage action "${input.stoppageActionId}" not found in current point.`);
  }

  assertValidSideIds(game, [input.sideId]);
  assertValidParticipantRefs(game, [
    ...input.inIds.map((id) => ({ refType: 'participant' as const, participantId: id })),
    ...input.outIds.map((id) => ({ refType: 'participant' as const, participantId: id })),
  ]);
}

/**
 * Converts completed points to {@link PointLineRecord} entries for the focus
 * side, so they can be consumed by shared helpers like `computePlayingTime`.
 *
 * Points are 1-indexed to match the convention in `getRecentLines`.
 */
export function getAdvancedPointLineRecords(game: AdvancedTrackedGame): PointLineRecord[] {
  const records: PointLineRecord[] = [];
  for (let i = 0; i < game.points.length; i++) {
    const point = game.points[i];
    const focusLine = point.lines.find((l) => l.sideId === game.focusSideId);
    if (focusLine && focusLine.participantIds.length > 0) {
      records.push({
        pointNumber: i + 1,
        playerIds: focusLine.participantIds,
        timestamp: 0,
      });
    }
  }
  return records;
}

/**
 * Returns the last N distinct lines played by the focus side, for quick
 * re-selection in the line picker. Delegates to {@link getRecentLines} after
 * converting {@link TrackedPoint} data to the shared {@link PointLineRecord} format.
 */
export function getAdvancedRecentLines(game: AdvancedTrackedGame): RecentLine[] {
  const records = getAdvancedPointLineRecords(game);
  return getRecentLines(records, game.points.length + 1);
}
