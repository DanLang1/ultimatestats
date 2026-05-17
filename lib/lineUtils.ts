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

export function getLatestLineForPoint(
  pointLines: PointLineRecord[],
  pointNumber: number,
): string[] {
  const latestLineRecord = pointLines.findLast((record) => record.pointNumber === pointNumber);
  return latestLineRecord ? [...latestLineRecord.playerIds] : [];
}

export interface RecentLine {
  pointNumber: number;
  playerIds: string[];
}

/**
 * Returns the last N distinct lines played in the game, for quick re-selection.
 * - Only considers completed points (pointNumber < currentPoint)
 * - Deduplicates by player set (same players = same line, regardless of order)
 * - Skips lines that exactly match an existing preset (to avoid redundancy)
 */
export function getRecentLines(
  pointLines: PointLineRecord[],
  currentPoint: number,
  maxCount = 3,
): RecentLine[] {
  const completedPointNumbers = [
    ...new Set(pointLines.filter((r) => r.pointNumber < currentPoint).map((r) => r.pointNumber)),
  ].sort((a, b) => b - a); // most recent first

  const seen = new Set<string>();
  const result: RecentLine[] = [];

  for (const pointNumber of completedPointNumbers) {
    if (result.length >= maxCount) break;
    const playerIds = getLatestLineForPoint(pointLines, pointNumber);
    if (playerIds.length === 0) continue;
    const key = [...playerIds].sort().join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ pointNumber, playerIds });
  }

  return result;
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

function getNumericPlayerNumber(player: Player): number | null {
  if (player.number == null || player.number.trim() === '') {
    return null;
  }
  const parsed = Number(player.number);
  return Number.isFinite(parsed) ? parsed : null;
}

export function sortByPlayerNumber(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    const aNumber = getNumericPlayerNumber(a);
    const bNumber = getNumericPlayerNumber(b);
    if (aNumber != null && bNumber != null && aNumber !== bNumber) {
      return aNumber - bNumber;
    }
    if (aNumber != null && bNumber == null) {
      return -1;
    }
    if (aNumber == null && bNumber != null) {
      return 1;
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
