import {
  assertPointActionParticipantsPreserved,
  assertValidPointLineHistory,
  getParticipantIdsUsedBySide,
  getPointActionParticipantIds,
  reconcilePointSubsAfterLineCorrection,
} from './trackingUtils';
import type { AdvancedTrackedGame, PointLine, TrackedPoint } from './types';

export interface CorrectAdvancedPointLinesInput {
  pointId: string;
  lines: PointLine[];
}

function getPoint(game: AdvancedTrackedGame, pointId: string): TrackedPoint {
  const point = game.points.find((candidate) => candidate.id === pointId);
  if (point == null) {
    throw new Error(`Point "${pointId}" was not found in advanced game "${game.id}".`);
  }
  return point;
}

/**
 * Applies the existing active-game line-correction rules to any identified point.
 * Callers own eligibility (for example, live tracking only permits the current point before it
 * ends, while the timeline permits completed points).
 */
export function correctAdvancedPointLines(
  game: AdvancedTrackedGame,
  input: CorrectAdvancedPointLinesInput,
): AdvancedTrackedGame {
  const point = getPoint(game, input.pointId);
  const correctedSideIds = new Set(input.lines.map((line) => line.sideId));
  if (correctedSideIds.size !== input.lines.length) {
    throw new Error('Each side may only have one corrected line.');
  }
  if (input.lines.some((line) => !point.lines.some((item) => item.sideId === line.sideId))) {
    throw new Error('A line correction can only replace an existing point lineup.');
  }

  const actionParticipantIds = new Set(getPointActionParticipantIds(point));
  for (const line of input.lines) {
    const currentLine = point.lines.find((item) => item.sideId === line.sideId)!;
    const nextParticipantIds = new Set(line.participantIds);
    const lockedRemovedId = currentLine.participantIds.find(
      (participantId) =>
        !nextParticipantIds.has(participantId) && actionParticipantIds.has(participantId),
    );
    if (lockedRemovedId != null) {
      const participantName =
        game.participants.find((participant) => participant.id === lockedRemovedId)?.name ??
        'This player';
      throw new Error(
        `${participantName} has recorded an action this point and cannot be removed from the lineup.`,
      );
    }

    const opposingParticipantIds = new Set(
      game.sides
        .filter((side) => side.id !== line.sideId)
        .flatMap((side) => getParticipantIdsUsedBySide(point, side.id)),
    );
    if (line.participantIds.some((participantId) => opposingParticipantIds.has(participantId))) {
      throw new Error('A participant cannot change sides after a point has started.');
    }
  }

  const correctionsBySide = new Map(input.lines.map((line) => [line.sideId, line]));
  const correctedLines = point.lines.map((line) => correctionsBySide.get(line.sideId) ?? line);
  const correctedPoint: TrackedPoint = {
    ...point,
    lines: correctedLines,
    subs: reconcilePointSubsAfterLineCorrection(
      { ...point, lines: correctedLines },
      correctedSideIds,
    ),
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
