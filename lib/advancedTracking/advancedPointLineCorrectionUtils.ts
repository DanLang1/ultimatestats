import { getParticipantName } from './participantUtils';
import { getFullyTrackedSideIds } from './trackingModeUtils';
import {
  assertPointActionParticipantsPreserved,
  assertValidPointLineHistory,
  getEffectiveLineParticipantIds,
  getParticipantIdsUsedBySide,
  getPointActionParticipantIds,
  hasPointEnded,
} from './trackingUtils';
import type { AdvancedTrackedGame, PointLine, PointSub, TrackedPoint } from './types';

export interface CorrectAdvancedPointActiveLinesInput {
  pointId: string;
  /** Desired active line at the correction boundary for every fully tracked side. */
  activeLines: PointLine[];
}

export type AdvancedLineCorrectionDraft = Record<string, string[]>;

export interface ReconcileAdvancedLineCorrectionDraftInput {
  activeLinesBySide: AdvancedLineCorrectionDraft;
  draftLinesBySide: AdvancedLineCorrectionDraft;
  selectedSideId: string;
  selectedParticipantIds: string[];
}

export type AdvancedLineCorrectionRestriction =
  | { reason: 'recorded-action' | 'recorded-injury' }
  | { reason: 'opposing-history'; sideId: string };

function getPoint(game: AdvancedTrackedGame, pointId: string): TrackedPoint {
  const point = game.points.find((candidate) => candidate.id === pointId);
  if (point == null) {
    throw new Error(`Point "${pointId}" was not found in advanced game "${game.id}".`);
  }
  return point;
}

function assertValidActiveLines(
  game: AdvancedTrackedGame,
  point: TrackedPoint,
  activeLines: PointLine[],
) {
  const fullyTrackedSideIds = getFullyTrackedSideIds(game);
  const activeLineSideIds = activeLines.map((line) => line.sideId);
  const hasEveryFullyTrackedSideExactlyOnce =
    activeLines.length === fullyTrackedSideIds.length &&
    fullyTrackedSideIds.every(
      (sideId) => activeLineSideIds.filter((candidate) => candidate === sideId).length === 1,
    );
  if (!hasEveryFullyTrackedSideExactlyOnce) {
    throw new Error('Line correction requires one active lineup for every fully tracked side.');
  }

  const participantIds = new Set(game.participants.map((participant) => participant.id));
  for (const line of activeLines) {
    const currentActiveParticipantCount = getEffectiveLineParticipantIds(point, line.sideId).length;
    if (line.participantIds.length !== currentActiveParticipantCount) {
      throw new Error('A lineup correction must preserve the number of active participants.');
    }
    if (new Set(line.participantIds).size !== line.participantIds.length) {
      throw new Error(`A participant cannot appear more than once on side "${line.sideId}".`);
    }
    const unknownParticipantId = line.participantIds.find(
      (participantId) => !participantIds.has(participantId),
    );
    if (unknownParticipantId != null) {
      throw new Error(
        `Unknown participantId "${unknownParticipantId}" for advanced tracking game "${game.id}".`,
      );
    }
  }

  const selectedParticipantIds = activeLines.flatMap((line) => line.participantIds);
  if (new Set(selectedParticipantIds).size !== selectedParticipantIds.length) {
    throw new Error('A participant cannot be active for both sides at the correction boundary.');
  }
}

export function reconcileAdvancedLineCorrectionDraft({
  activeLinesBySide,
  draftLinesBySide,
  selectedSideId,
  selectedParticipantIds,
}: ReconcileAdvancedLineCorrectionDraftInput): AdvancedLineCorrectionDraft {
  const nextLinesBySide = {
    ...draftLinesBySide,
    [selectedSideId]: selectedParticipantIds,
  };
  const selectedParticipantIdSet = new Set(selectedParticipantIds);

  for (const [sideId, activeParticipantIds] of Object.entries(activeLinesBySide)) {
    if (sideId === selectedSideId) continue;
    const currentParticipantIds = nextLinesBySide[sideId] ?? activeParticipantIds;
    const restoredParticipantIds = [...currentParticipantIds];
    for (const activeParticipantId of activeParticipantIds) {
      if (restoredParticipantIds.length >= activeParticipantIds.length) break;
      if (
        !selectedParticipantIdSet.has(activeParticipantId) &&
        !restoredParticipantIds.includes(activeParticipantId)
      ) {
        restoredParticipantIds.push(activeParticipantId);
      }
    }
    const participantIdsWithoutCrossovers = restoredParticipantIds.filter(
      (participantId) => !selectedParticipantIdSet.has(participantId),
    );
    if (participantIdsWithoutCrossovers.length !== currentParticipantIds.length) {
      nextLinesBySide[sideId] = participantIdsWithoutCrossovers;
    }
  }

  return nextLinesBySide;
}

function reverseInjurySub(
  game: AdvancedTrackedGame,
  activeParticipantIds: string[],
  sub: PointSub,
): string[] {
  const activeParticipantIdSet = new Set(activeParticipantIds);
  const missingIncomingId = sub.inIds.find(
    (participantId) => !activeParticipantIdSet.has(participantId),
  );
  if (missingIncomingId != null) {
    throw new Error(
      `${getParticipantName(game, missingIncomingId)} entered through a recorded injury substitution and must remain active.`,
    );
  }

  const restoredOutgoingId = sub.outIds.find((participantId) =>
    activeParticipantIdSet.has(participantId),
  );
  if (restoredOutgoingId != null) {
    throw new Error(
      `${getParticipantName(game, restoredOutgoingId)} left through a recorded injury substitution and cannot be active at this boundary.`,
    );
  }

  const incomingIdSet = new Set(sub.inIds);
  const firstIncomingIndex = activeParticipantIds.findIndex((participantId) =>
    incomingIdSet.has(participantId),
  );
  const previousParticipantIds = activeParticipantIds.filter(
    (participantId) => !incomingIdSet.has(participantId),
  );
  previousParticipantIds.splice(firstIncomingIndex, 0, ...sub.outIds);
  return previousParticipantIds;
}

function deriveStartingLineFromActiveLine(
  game: AdvancedTrackedGame,
  point: TrackedPoint,
  activeLine: PointLine,
): PointLine {
  const sideSubs = (point.subs ?? []).filter((sub) => sub.sideId === activeLine.sideId);
  let participantIds = [...activeLine.participantIds];
  for (let index = sideSubs.length - 1; index >= 0; index--) {
    participantIds = reverseInjurySub(game, participantIds, sideSubs[index]);
  }
  return { sideId: activeLine.sideId, participantIds };
}

/**
 * Replaces clerically incorrect lineup membership while preserving trusted action and injury
 * history. The requested active line is reverse-replayed through every injury substitution to
 * derive the point's corrected canonical starting line.
 */
export function correctAdvancedPointActiveLines(
  game: AdvancedTrackedGame,
  input: CorrectAdvancedPointActiveLinesInput,
): AdvancedTrackedGame {
  const point = getPoint(game, input.pointId);
  assertValidPointLineHistory(game, point);
  assertValidActiveLines(game, point, input.activeLines);

  const correctedStartingLinesBySide = new Map(
    input.activeLines.map((activeLine) => [
      activeLine.sideId,
      deriveStartingLineFromActiveLine(game, point, activeLine),
    ]),
  );
  const correctedPoint: TrackedPoint = {
    ...point,
    lines: point.lines.map((line) => correctedStartingLinesBySide.get(line.sideId) ?? line),
  };

  assertValidPointLineHistory(game, correctedPoint);
  assertPointActionParticipantsPreserved(game, point, correctedPoint);

  return {
    ...game,
    updatedAt: Date.now(),
    points: game.points.map((candidate) =>
      candidate.id === correctedPoint.id ? correctedPoint : candidate,
    ),
  };
}

/** Returns player restrictions for editing one side's active line at the point boundary. */
export function getAdvancedLineCorrectionRestrictions(
  game: AdvancedTrackedGame,
  point: TrackedPoint,
  sideId: string,
): Map<string, AdvancedLineCorrectionRestriction> {
  const restrictions = new Map<string, AdvancedLineCorrectionRestriction>();
  const actionParticipantIds = new Set(getPointActionParticipantIds(point));
  const activeParticipantIdsBySide = new Map(
    game.sides.map((side) => [side.id, new Set(getEffectiveLineParticipantIds(point, side.id))]),
  );
  const usedParticipantIdsBySide = new Map(
    game.sides.map((side) => [side.id, new Set(getParticipantIdsUsedBySide(point, side.id))]),
  );
  const injuryParticipantIdsBySide = new Map(
    game.sides.map((side) => [
      side.id,
      new Set(
        (point.subs ?? [])
          .filter((sub) => sub.sideId === side.id)
          .flatMap((sub) => [...sub.inIds, ...sub.outIds]),
      ),
    ]),
  );
  const activeForSide = activeParticipantIdsBySide.get(sideId) ?? new Set<string>();
  const usedBySide = usedParticipantIdsBySide.get(sideId) ?? new Set<string>();
  const injuryParticipantsForSide = injuryParticipantIdsBySide.get(sideId) ?? new Set<string>();

  for (const participant of game.participants) {
    if (actionParticipantIds.has(participant.id)) {
      restrictions.set(participant.id, { reason: 'recorded-action' });
      continue;
    }
    if (activeForSide.has(participant.id)) {
      if (injuryParticipantsForSide.has(participant.id)) {
        restrictions.set(participant.id, { reason: 'recorded-injury' });
      }
      continue;
    }
    if (usedBySide.has(participant.id)) {
      restrictions.set(participant.id, { reason: 'recorded-injury' });
      continue;
    }

    const opposingSide = game.sides.find(
      (side) =>
        side.id !== sideId && (usedParticipantIdsBySide.get(side.id)?.has(participant.id) ?? false),
    );
    if (opposingSide == null) continue;

    const isMovableOpposingActivePlayer =
      (activeParticipantIdsBySide.get(opposingSide.id)?.has(participant.id) ?? false) &&
      !(injuryParticipantIdsBySide.get(opposingSide.id)?.has(participant.id) ?? false);
    if (!isMovableOpposingActivePlayer) {
      restrictions.set(participant.id, {
        reason: 'opposing-history',
        sideId: opposingSide.id,
      });
    }
  }

  return restrictions;
}

/** A terminated game's last point has a stable final boundary even when it did not end in a goal. */
export function canCorrectAdvancedPointFromTimeline(
  game: AdvancedTrackedGame,
  point: TrackedPoint,
): boolean {
  if (hasPointEnded(point)) return true;
  return game.status === 'terminated' && game.points.at(-1)?.id === point.id;
}
