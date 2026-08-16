import {
  assertValidLines,
  getCurrentPoint,
  hasPointEnded,
} from '@/lib/advancedTracking/trackingUtils';
import type { AdvancedTrackedGame, PointLine } from '@/lib/advancedTracking/types';

import type { PendingNextPointLineSelection } from './trackingStore.types';

/**
 * Returns a pending line draft only when it belongs to the active game and the
 * most recently completed point. Partial drafts are intentionally valid here;
 * readiness is checked by resolvePendingNextPointLines.
 */
export function getCurrentPendingNextPointLineSelection(
  game: AdvancedTrackedGame | null,
  selection: PendingNextPointLineSelection | null,
): PendingNextPointLineSelection | null {
  if (game == null || selection == null) return null;

  const currentPoint = getCurrentPoint(game);
  if (
    selection.gameId !== game.id ||
    selection.afterPointId !== (currentPoint?.id ?? null) ||
    (currentPoint != null && !hasPointEnded(currentPoint))
  ) {
    return null;
  }

  return selection;
}

/**
 * Resolves a ready pending line into the canonical side order expected by
 * recordPull. A ready line has seven players for each full-roster side and no
 * players for an anonymous side.
 */
export function resolvePendingNextPointLines(
  game: AdvancedTrackedGame | null,
  selection: PendingNextPointLineSelection | null,
): PointLine[] | null {
  const currentSelection = getCurrentPendingNextPointLineSelection(game, selection);
  if (game == null || currentSelection == null) return null;

  const validSideIds = new Set(game.sides.map((side) => side.id));
  for (const sideId of Object.keys(currentSelection.participantIdsBySide)) {
    if (!validSideIds.has(sideId)) return null;
  }

  const lines = game.sides.map((side) => {
    const sideParticipantIds = currentSelection.participantIdsBySide[side.id] ?? [];
    if (side.trackingMode === 'anonymous' && sideParticipantIds.length !== 0) return null;
    if (side.trackingMode === 'full-roster' && sideParticipantIds.length !== 7) return null;
    return { sideId: side.id, participantIds: [...sideParticipantIds] };
  });

  if (!lines.every((line): line is PointLine => line != null)) return null;

  try {
    assertValidLines(game, lines);
  } catch {
    return null;
  }

  return lines;
}
