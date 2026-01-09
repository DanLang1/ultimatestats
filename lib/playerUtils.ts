import { Player } from './storage/types';

/**
 * Get only active players from a roster
 */
export function getActiveRoster(roster: Player[]): Player[] {
  return roster.filter((p) => p.isActive);
}

/**
 * Find a player by their ID
 */
export function getPlayerById(roster: Player[], id: string): Player | undefined {
  return roster.find((p) => p.id === id);
}

/**
 * Get a player's name by their ID.
 * Performance: O(n) scan.
 * Fallbacks:
 * 1. Returns null if no ID provided.
 * 2. Returns ID if no roster provided.
 * 3. Returns "Deleted Player (xxxx)" if not found in roster.
 * 4. Returns "Other Team" if ID is "OTHER_TEAM" (Callahan).
 */
export function getPlayerName(
  roster: Player[] | null | undefined,
  id: string | null,
): string | null {
  if (!id) return null;
  if (id === 'OTHER_TEAM') return 'Other Team';
  if (!roster) return id;
  return roster.find((p) => p.id === id)?.name ?? `Deleted Player (${id.slice(0, 4)})`;
}

/**
 * Find a player by their name
 */
export function getPlayerByName(roster: Player[], name: string): Player | undefined {
  return roster.find((p) => p.name === name);
}

/**
 * Check if a player name already exists in the roster
 */
export function hasPlayerWithName(roster: Player[], name: string): boolean {
  const searchName = name.trim().toLowerCase();
  return roster.some((p) => p.name.toLowerCase() === searchName);
}
