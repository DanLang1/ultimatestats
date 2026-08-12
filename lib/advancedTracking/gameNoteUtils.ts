import type { AdvancedTrackedGame, GameMetadata } from '@/lib/advancedTracking/types';
import { MAX_ADVANCED_GAME_NOTE_LENGTH } from '@/lib/constants';

export function normalizeAdvancedGameNote(note: string): string | undefined {
  const trimmedNote = note.trim();
  if (trimmedNote.length === 0) return undefined;
  return trimmedNote.slice(0, MAX_ADVANCED_GAME_NOTE_LENGTH);
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
 * Advanced-game notes are private local metadata. Shared snapshots must never include them.
 */
export function withoutAdvancedGameNote(game: AdvancedTrackedGame): AdvancedTrackedGame {
  if (game.metadata == null || !('notes' in game.metadata)) return game;

  const { notes: _privateNote, ...sharedMetadata } = game.metadata;
  return {
    ...game,
    metadata: Object.keys(sharedMetadata).length > 0 ? sharedMetadata : undefined,
  };
}
