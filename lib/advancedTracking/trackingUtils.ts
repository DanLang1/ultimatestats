import { getRecentLines, RecentLine } from '@/lib/lineUtils';
import { PointLineRecord } from '@/lib/storage/types';
import { hasItems } from '@/lib/utils';

import { getCapThresholdMinutes, type CapTimingSettings } from './capUtils';
import { areBothSidesFullyTracked } from './trackingModeUtils';
import {
  AdvancedTrackedGame,
  GameSide,
  GameTransition,
  Participant,
  PlayerRef,
  PointLine,
  PointPossession,
  PointSub,
  PossessionAction,
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

export function getLineReceivingSideId(
  game: AdvancedTrackedGame,
  point: TrackedPoint | null,
): string {
  if (point == null) return game.initialReceivingSideId;
  if (hasPointEnded(point)) return getReceivingSideForNextPoint(game);
  return point.possessions[0]?.sideId ?? game.initialReceivingSideId;
}

// --- Classification ---

export function isPointEndingThrow(result: ThrowResult): boolean {
  return result === 'goal' || result === 'callahan';
}

export function isTurnoverThrow(result: ThrowResult): boolean {
  return (
    result === 'drop' ||
    result === 'throwaway' ||
    result === 'stall' ||
    result === 'block' ||
    result === 'pressure'
  );
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

    if (new Set(line.participantIds).size !== line.participantIds.length) {
      throw new Error(`A participant cannot appear more than once on side "${line.sideId}".`);
    }
  }

  if (!areBothSidesFullyTracked(game)) return;

  const lineSideIds = lines.map((line) => line.sideId);
  const hasEverySideExactlyOnce =
    lines.length === game.sides.length &&
    game.sides.every((side) => lineSideIds.filter((sideId) => sideId === side.id).length === 1);
  if (!hasEverySideExactlyOnce) {
    throw new Error('Fully tracked sides require exactly one line for each side.');
  }

  if (lines.some((line) => line.participantIds.length !== 7)) {
    throw new Error('Fully tracked sides require seven participants on each side.');
  }

  const selectedParticipantIds = lines.flatMap((line) => line.participantIds);
  if (new Set(selectedParticipantIds).size !== selectedParticipantIds.length) {
    throw new Error('A participant cannot play for both sides in the same point.');
  }
}

function applySubToLine(currentLine: Set<string>, sub: PointSub) {
  for (const participantId of sub.outIds) {
    currentLine.delete(participantId);
  }
  for (const participantId of sub.inIds) {
    currentLine.add(participantId);
  }
}

export function haveSameParticipantIds(firstIds: string[], secondIds: string[]): boolean {
  if (firstIds.length !== secondIds.length) return false;
  const firstIdSet = new Set(firstIds);
  return secondIds.every((participantId) => firstIdSet.has(participantId));
}

export function hasInjurySubChanges(change: Pick<PointSub, 'inIds' | 'outIds'>): boolean {
  return change.inIds.length > 0 || change.outIds.length > 0;
}

function addParticipantRefId(participantIds: Set<string>, ref: PlayerRef | undefined) {
  if (ref?.refType === 'participant') {
    participantIds.add(ref.participantId);
  }
}

function getActionParticipantIds(action: PossessionAction): string[] {
  const participantIds = new Set<string>();
  if (action.kind === 'pull') {
    addParticipantRefId(participantIds, action.puller);
    addParticipantRefId(participantIds, action.receiver);
  } else if (action.kind === 'disc_pickup') {
    addParticipantRefId(participantIds, action.player);
  } else if (action.kind === 'throw') {
    addParticipantRefId(participantIds, action.thrower);
    addParticipantRefId(participantIds, action.toPlayer);
    addParticipantRefId(participantIds, action.defender);
  }
  return [...participantIds];
}

/** Returns every known participant referenced by a recorded player action in the point. */
export function getPointActionParticipantIds(point: TrackedPoint): string[] {
  const participantIds = new Set<string>();

  for (const possession of point.possessions) {
    for (const action of possession.actions) {
      for (const participantId of getActionParticipantIds(action)) {
        participantIds.add(participantId);
      }
    }
  }

  return [...participantIds];
}

/**
 * Keeps injury substitutions that still apply after a starting-line correction.
 * Invalidated subs are discarded only for sides whose starting line was corrected.
 */
export function reconcilePointSubsAfterLineCorrection(
  point: TrackedPoint,
  correctedSideIds: Set<string>,
): PointSub[] | undefined {
  const effectiveLines = new Map(
    point.lines.map((line) => [line.sideId, new Set(line.participantIds)]),
  );
  const retainedSubs: PointSub[] = [];

  for (const sub of point.subs ?? []) {
    const currentLine = effectiveLines.get(sub.sideId) ?? new Set<string>();
    const canApply =
      sub.outIds.every((participantId) => currentLine.has(participantId)) &&
      sub.inIds.every((participantId) => !currentLine.has(participantId));

    if (!canApply && correctedSideIds.has(sub.sideId)) {
      continue;
    }

    retainedSubs.push(sub);
    applySubToLine(currentLine, sub);
    effectiveLines.set(sub.sideId, currentLine);
  }

  return hasItems(retainedSubs) ? retainedSubs : undefined;
}

function getActionParticipantSides(point: TrackedPoint): Map<string, Map<string, string>> {
  const effectiveLines = new Map(
    point.lines.map((line) => [line.sideId, new Set(line.participantIds)]),
  );
  const subsByStoppage = new Map<string, PointSub[]>();
  for (const sub of point.subs ?? []) {
    const stoppageSubs = subsByStoppage.get(sub.stoppageActionId) ?? [];
    stoppageSubs.push(sub);
    subsByStoppage.set(sub.stoppageActionId, stoppageSubs);
  }

  const actionParticipantSides = new Map<string, Map<string, string>>();
  for (const possession of point.possessions) {
    for (const action of possession.actions) {
      const participantSides = new Map<string, string>();
      for (const participantId of getActionParticipantIds(action)) {
        const activeSide = [...effectiveLines].find(([, ids]) => ids.has(participantId))?.[0];
        if (activeSide != null) {
          participantSides.set(participantId, activeSide);
        }
      }
      actionParticipantSides.set(action.id, participantSides);

      if (action.kind === 'stoppage') {
        for (const sub of subsByStoppage.get(action.id) ?? []) {
          const currentLine = effectiveLines.get(sub.sideId) ?? new Set<string>();
          applySubToLine(currentLine, sub);
          effectiveLines.set(sub.sideId, currentLine);
        }
      }
    }
  }

  return actionParticipantSides;
}

/**
 * Ensures a correction does not orphan an action that was attributable under the original
 * line/sub history.
 */
export function assertPointActionParticipantsPreserved(
  game: AdvancedTrackedGame,
  originalPoint: TrackedPoint,
  candidatePoint: TrackedPoint,
) {
  const originalSides = getActionParticipantSides(originalPoint);
  const candidateSides = getActionParticipantSides(candidatePoint);

  for (const [actionId, participantSides] of originalSides) {
    const candidateParticipantSides = candidateSides.get(actionId);
    for (const [participantId, originalSideId] of participantSides) {
      if (candidateParticipantSides?.get(participantId) === originalSideId) continue;
      const participantName =
        game.participants.find((participant) => participant.id === participantId)?.name ??
        'This player';
      throw new Error(
        `${participantName} has recorded an action this point, so this correction cannot remove them from the active lineup at that time.`,
      );
    }
  }
}

export function getEffectiveLineParticipantIds(point: TrackedPoint, sideId: string): string[] {
  const currentLine = new Set(
    point.lines.find((line) => line.sideId === sideId)?.participantIds ?? [],
  );
  for (const sub of point.subs ?? []) {
    if (sub.sideId === sideId) {
      applySubToLine(currentLine, sub);
    }
  }
  return [...currentLine];
}

export function getParticipantIdsUsedBySide(point: TrackedPoint, sideId: string): string[] {
  const participantIds = new Set(
    point.lines.find((line) => line.sideId === sideId)?.participantIds ?? [],
  );
  for (const sub of point.subs ?? []) {
    if (sub.sideId !== sideId) continue;
    for (const participantId of [...sub.inIds, ...sub.outIds]) {
      participantIds.add(participantId);
    }
  }
  return [...participantIds];
}

function assertUniqueSubParticipants(sub: PointSub) {
  if (new Set(sub.inIds).size !== sub.inIds.length) {
    throw new Error(`Injury sub for side "${sub.sideId}" contains duplicate incoming players.`);
  }
  if (new Set(sub.outIds).size !== sub.outIds.length) {
    throw new Error(`Injury sub for side "${sub.sideId}" contains duplicate outgoing players.`);
  }
  if (sub.inIds.some((participantId) => sub.outIds.includes(participantId))) {
    throw new Error('The same participant cannot be both incoming and outgoing in one sub.');
  }
}

function assertFullyTrackedEffectiveLines(
  game: AdvancedTrackedGame,
  effectiveLines: Map<string, Set<string>>,
) {
  if (!areBothSidesFullyTracked(game)) return;

  const allParticipantIds: string[] = [];
  for (const side of game.sides) {
    const line = effectiveLines.get(side.id);
    // Product constraint: dual-side tracking does not currently support playing short-handed.
    if (line == null || line.size !== 7) {
      throw new Error('Fully tracked sides require seven active participants on each side.');
    }
    allParticipantIds.push(...line);
  }
  if (new Set(allParticipantIds).size !== allParticipantIds.length) {
    throw new Error('A participant cannot be active for both sides during the same point.');
  }
}

/**
 * Validates starting lines plus every mid-point substitution in timeline order.
 * Participants may return to the same side, but cannot change sides after a point starts.
 */
export function assertValidPointLineHistory(game: AdvancedTrackedGame, point: TrackedPoint) {
  assertValidLines(game, point.lines);

  const effectiveLines = new Map(
    point.lines.map((line) => [line.sideId, new Set(line.participantIds)]),
  );
  const participantSideHistory = new Map<string, string>();
  for (const line of point.lines) {
    for (const participantId of line.participantIds) {
      participantSideHistory.set(participantId, line.sideId);
    }
  }
  assertFullyTrackedEffectiveLines(game, effectiveLines);

  // point.subs is chronological; Map insertion order preserves stoppage order while grouping sides.
  const subsByStoppage = new Map<string, PointSub[]>();
  for (const sub of point.subs ?? []) {
    const stoppageSubs = subsByStoppage.get(sub.stoppageActionId) ?? [];
    if (stoppageSubs.some((item) => item.sideId === sub.sideId)) {
      throw new Error(
        `Only one injury sub per side may be recorded for stoppage "${sub.stoppageActionId}".`,
      );
    }
    stoppageSubs.push(sub);
    subsByStoppage.set(sub.stoppageActionId, stoppageSubs);
  }

  for (const stoppageSubs of subsByStoppage.values()) {
    const nextLines = new Map(
      [...effectiveLines].map(([sideId, participantIds]) => [sideId, new Set(participantIds)]),
    );

    for (const sub of stoppageSubs) {
      assertValidInjurySubInput(game, point, {
        stoppageActionId: sub.stoppageActionId,
        sideId: sub.sideId,
        inIds: sub.inIds,
        outIds: sub.outIds,
      });
      assertUniqueSubParticipants(sub);

      const currentLine = effectiveLines.get(sub.sideId) ?? new Set<string>();
      for (const participantId of sub.outIds) {
        if (!currentLine.has(participantId)) {
          throw new Error(`Participant "${participantId}" is not active for side "${sub.sideId}".`);
        }
      }
      for (const participantId of sub.inIds) {
        if (currentLine.has(participantId)) {
          throw new Error(
            `Participant "${participantId}" is already active for side "${sub.sideId}".`,
          );
        }
        const previousSideId = participantSideHistory.get(participantId);
        if (previousSideId != null && previousSideId !== sub.sideId) {
          throw new Error('A participant cannot change sides after a point has started.');
        }
      }

      const nextLine = nextLines.get(sub.sideId) ?? new Set<string>();
      applySubToLine(nextLine, sub);
      nextLines.set(sub.sideId, nextLine);
    }

    assertFullyTrackedEffectiveLines(game, nextLines);
    for (const sub of stoppageSubs) {
      for (const participantId of sub.inIds) {
        participantSideHistory.set(participantId, sub.sideId);
      }
    }
    for (const [sideId, participantIds] of nextLines) {
      effectiveLines.set(sideId, participantIds);
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
export function getAdvancedPointLineRecords(
  game: AdvancedTrackedGame,
  sideId = game.focusSideId,
): PointLineRecord[] {
  const records: PointLineRecord[] = [];
  for (let i = 0; i < game.points.length; i++) {
    const point = game.points[i];
    const sideLine = point.lines.find((line) => line.sideId === sideId);
    if (sideLine && sideLine.participantIds.length > 0) {
      records.push({
        pointNumber: i + 1,
        playerIds: sideLine.participantIds,
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
export function getAdvancedRecentLines(
  game: AdvancedTrackedGame,
  sideId = game.focusSideId,
): RecentLine[] {
  const records = getAdvancedPointLineRecords(game, sideId);
  return getRecentLines(records, game.points.length + 1);
}
