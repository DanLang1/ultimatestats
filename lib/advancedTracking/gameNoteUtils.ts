import type { AdvancedTrackedGame, GameMetadata, TrackedPoint } from '@/lib/advancedTracking/types';
import { MAX_ADVANCED_GAME_NOTE_LENGTH } from '@/lib/constants';

export function normalizeAdvancedGameNote(note: string): string | undefined {
  const trimmedNote = note.trim();
  if (trimmedNote.length === 0) return undefined;
  return trimmedNote.slice(0, MAX_ADVANCED_GAME_NOTE_LENGTH);
}

export const normalizeAdvancedPointNote = normalizeAdvancedGameNote;

export function withAdvancedPointNote(point: TrackedPoint, note: string): TrackedPoint {
  const normalizedNote = normalizeAdvancedPointNote(note);
  const { note: _existingNote, ...pointWithoutNote } = point;
  return normalizedNote === undefined
    ? pointWithoutNote
    : { ...pointWithoutNote, note: normalizedNote };
}

/** Sets, or clears when blank, a point's note on a live game draft. */
export function applyPointNote(game: AdvancedTrackedGame, pointId: string, note: string): void {
  const pointIndex = game.points.findIndex((candidate) => candidate.id === pointId);
  if (pointIndex === -1) throw new Error(`Point "${pointId}" was not found.`);
  game.points[pointIndex] = withAdvancedPointNote(game.points[pointIndex], note);
}

export function withAdvancedGameNote(
  metadata: GameMetadata | undefined,
  note?: string,
): GameMetadata | undefined {
  const { notes: _existingNote, ...metadataWithoutNote } = metadata ?? {};
  const normalizedNote = note === undefined ? undefined : normalizeAdvancedGameNote(note);

  if (normalizedNote === undefined) {
    return Object.keys(metadataWithoutNote).length > 0 ? metadataWithoutNote : undefined;
  }

  return { ...metadataWithoutNote, notes: normalizedNote };
}

/**
 * Advanced-game notes are private local data. Shared snapshots must never include game or point
 * notes.
 */
export function withoutAdvancedPrivateNotes(game: AdvancedTrackedGame): AdvancedTrackedGame {
  let sharedMetadata = game.metadata;
  if (game.metadata != null && 'notes' in game.metadata) {
    const { notes: _privateNote, ...metadataWithoutNote } = game.metadata;
    sharedMetadata = Object.keys(metadataWithoutNote).length > 0 ? metadataWithoutNote : undefined;
  }

  const hasPointNote = game.points.some((point) => 'note' in point);
  const pointsWithoutNotes = hasPointNote
    ? game.points.map((point) => {
        if (!('note' in point)) return point;
        const { note: _privateNote, ...pointWithoutNote } = point;
        return pointWithoutNote;
      })
    : game.points;

  if (sharedMetadata === game.metadata && pointsWithoutNotes === game.points) return game;

  return {
    ...game,
    metadata: sharedMetadata,
    points: pointsWithoutNotes,
  };
}
