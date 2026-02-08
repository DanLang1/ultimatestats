import { Player, PointLineRecord } from '@/lib/storage/types';

export const MAX_LINE_SIZE = 14;

export type GenderRoleGroup =
  | 'mmp-handler'
  | 'mmp-cutter'
  | 'mmp-hybrid'
  | 'fmp-handler'
  | 'fmp-cutter'
  | 'fmp-hybrid'
  | 'unassigned';

export interface PlayerGroup {
  key: GenderRoleGroup;
  label: string;
  players: Player[];
}

const GROUP_LABELS: Record<GenderRoleGroup, string> = {
  'mmp-handler': 'M Handler',
  'mmp-cutter': 'M Cutter',
  'mmp-hybrid': 'M Hybrid',
  'fmp-handler': 'F Handler',
  'fmp-cutter': 'F Cutter',
  'fmp-hybrid': 'F Hybrid',
  unassigned: 'Unassigned',
};

const GROUP_ORDER: GenderRoleGroup[] = [
  'mmp-handler',
  'fmp-handler',
  'mmp-cutter',
  'fmp-cutter',
  'mmp-hybrid',
  'fmp-hybrid',
  'unassigned',
];

function getGroupKey(player: Player): GenderRoleGroup {
  if (!player.matchingType || !player.role) {
    return 'unassigned';
  }
  return `${player.matchingType}-${player.role}` as GenderRoleGroup;
}

/**
 * Groups players by gender matching type and role.
 * Returns groups in a consistent order with labels.
 * Only returns groups that have players.
 */
export function groupPlayersByGenderRole(roster: Player[]): PlayerGroup[] {
  // Only include active players (treat undefined isActive as true for backwards compatibility)
  const activePlayers = roster.filter((p) => p.isActive !== false);

  const grouped = new Map<GenderRoleGroup, Player[]>();

  // Initialize all groups
  for (const key of GROUP_ORDER) {
    grouped.set(key, []);
  }

  // Group players
  for (const player of activePlayers) {
    const key = getGroupKey(player);
    grouped.get(key)!.push(player);
  }

  // Build result, filtering out empty groups
  const result: PlayerGroup[] = [];
  for (const key of GROUP_ORDER) {
    const players = grouped.get(key)!;
    if (players.length > 0) {
      result.push({
        key,
        label: GROUP_LABELS[key],
        players,
      });
    }
  }

  return result;
}

/**
 * Get all players who appeared in each point (includes substituted-out players).
 * This is the single source of truth for "which players were on field during a point".
 * Returns a map from point number to the set of all player IDs who were on field at any time.
 * @param excludeFromPoint - If provided, excludes points >= this number
 *   (used to exclude the current in-progress point during live gameplay)
 */
export function getAllPlayersByPoint(
  pointLines: PointLineRecord[],
  excludeFromPoint?: number,
): Map<number, Set<string>> {
  const playersByPoint = new Map<number, Set<string>>();

  for (const record of pointLines) {
    if (excludeFromPoint !== undefined && record.pointNumber >= excludeFromPoint) continue;
    if (!playersByPoint.has(record.pointNumber)) {
      playersByPoint.set(record.pointNumber, new Set());
    }
    const pointPlayers = playersByPoint.get(record.pointNumber)!;
    for (const playerId of record.playerIds) {
      pointPlayers.add(playerId);
    }
  }

  return playersByPoint;
}

/**
 * Computes playing time (points played) from point line records.
 * Returns a Map from playerId to number of points played.
 * @param excludeFromPoint - If provided, excludes points >= this number
 *   (used to exclude the current in-progress point during live gameplay)
 */
export function computePlayingTime(
  pointLines: PointLineRecord[],
  excludeFromPoint?: number,
): Map<string, number> {
  const playingTime = new Map<string, number>();
  const playersByPoint = getAllPlayersByPoint(pointLines, excludeFromPoint);

  for (const playerIds of playersByPoint.values()) {
    for (const playerId of playerIds) {
      playingTime.set(playerId, (playingTime.get(playerId) ?? 0) + 1);
    }
  }

  return playingTime;
}

/**
 * Sorts players by points played in ascending order (least played first).
 * Players with equal playing time are sorted alphabetically by name.
 */
export function sortByPointsPlayed(players: Player[], playingTime: Map<string, number>): Player[] {
  return [...players].sort((a, b) => {
    const aPoints = playingTime.get(a.id) ?? 0;
    const bPoints = playingTime.get(b.id) ?? 0;
    if (aPoints !== bPoints) {
      return aPoints - bPoints; // Ascending - least played first
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Formats playing time for display, e.g., "(3 pts)"
 */
export function formatPlayingTime(playerId: string, playingTime: Map<string, number>): string {
  const points = playingTime.get(playerId) ?? 0;
  return `${points}pt${points !== 1 ? 's' : ''}`;
}
