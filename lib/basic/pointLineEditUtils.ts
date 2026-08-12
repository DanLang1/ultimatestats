import { getLatestLineForPoint } from '@/lib/lineUtils';
import { PointLineRecord } from '@/lib/storage/types';

export interface BasicPointLineEditInput {
  pointNumber: number | null;
  pointLines: PointLineRecord[];
  currentPoint: number;
  displayedGameId: string | null;
  currentGameId: string | null;
}

export interface EditableBasicPointLine {
  pointNumber: number;
  playerIds: string[];
}

export function resolveEditableBasicPointLine({
  pointNumber,
  pointLines,
  currentPoint,
  displayedGameId,
  currentGameId,
}: BasicPointLineEditInput): EditableBasicPointLine | null {
  if (pointNumber === null) return null;

  const playerIds = getLatestLineForPoint(pointLines, pointNumber);
  if (playerIds.length === 0) return null;

  const isCurrentGame =
    displayedGameId === null || (currentGameId !== null && displayedGameId === currentGameId);
  if (isCurrentGame && pointNumber >= currentPoint) return null;

  return { pointNumber, playerIds };
}

export function canEditBasicPointLine(input: BasicPointLineEditInput): boolean {
  return resolveEditableBasicPointLine(input) !== null;
}
