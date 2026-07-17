import { GameEvent } from '@/store/basic/gameStore.types';

import { MatchingType, Player, PointLineRecord, SavedTeam } from './storage/types';

/** Special ID for recording plays when the player is unknown */
export const UNKNOWN_PLAYER_ID = 'UNKNOWN_PLAYER';

/**
 * Resolve the current team name using ID lookup with snapshot fallback.
 * - If team is found in savedTeams by ID, returns the live name
 * - Otherwise falls back to the snapshot name from the saved game
 * This allows name changes to propagate to past games while preserving
 * data integrity if the team is deleted.
 */
export function resolveTeamName(
  teamId: string,
  snapshotName: string,
  savedTeams: SavedTeam[],
): string {
  const liveTeam = savedTeams.find((t) => t.id === teamId);
  return liveTeam?.name ?? snapshotName;
}

/**
 * Get only active players from a roster
 */
export function getActiveRoster(roster: Player[]): Player[] {
  return roster.filter((p) => p.isActive);
}

/**
 * Get a player's name by their ID.
 * Performance: O(n) scan.
 * Fallbacks:
 * 1. Returns null if no ID provided.
 * 2. Returns ID if no roster provided.
 * 3. Returns "Deleted Player (xxxx)" if not found in roster.
 * 4. Returns "Other Team" if ID is "OTHER_TEAM" (Callahan).
 * 5. Returns "Unknown" if ID is "UNKNOWN_PLAYER".
 */
export function getPlayerName(
  roster: Player[] | null | undefined,
  id: string | null,
): string | null {
  if (!id) return null;
  if (id === 'OTHER_TEAM') return 'Other Team';
  if (id === UNKNOWN_PLAYER_ID) return 'Unknown';
  if (!roster) return id;
  return roster.find((p) => p.id === id)?.name ?? `Deleted Player (${id.slice(0, 4)})`;
}

/**
 * Check if a player name already exists in the roster
 */
export function hasPlayerWithName(roster: Player[], name: string): boolean {
  const searchName = name.trim().toLowerCase();
  return roster.some((p) => p.name.toLowerCase() === searchName);
}

/**
 * Returns true if the player has already participated in the current game.
 * Participation is inferred from recorded point lines and directly attributed stat events.
 */
export function hasPlayerParticipatedInCurrentGame(
  playerId: string,
  events: GameEvent[],
  pointLines: PointLineRecord[],
): boolean {
  if (pointLines.some((record) => record.playerIds.includes(playerId))) {
    return true;
  }

  return events.some((event) => {
    if (event.type === 'goal') {
      return event.goalPlayerId === playerId || event.assistPlayerId === playerId;
    }

    if (event.type === 'turnover') {
      return event.playerId === playerId || event.player2Id === playerId;
    }

    return false;
  });
}

/**
 * Get a player's matching type by their ID.
 * Returns null if player not found or matching type not set.
 */
export function getPlayerMatchingType(
  roster: Player[] | null | undefined,
  id: string | null,
): MatchingType | null {
  if (!id || !roster) return null;
  return roster.find((p) => p.id === id)?.matchingType ?? null;
}
