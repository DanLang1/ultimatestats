import type { AnalyticsGame, AnalyticsPoint, AttributionType } from './analyticsTypes';
import { getPointStateForSide } from './buildAnalyticsGame';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdvancedPlayerStats {
  participantId: string;

  // Scoring
  goals: number;
  assists: number;
  hockeyAssists: number;
  callahans: number;
  /** goals + assists + blocks + stalls - throwaways - drops */
  plusMinus: number;

  // Throwing
  /** Successful throws (complete + goal). */
  completions: number;
  throwAttempts: number;
  /** Null if 0 throw attempts. */
  completionPct: number | null;
  throwaways: number;
  stalls: number;

  // Receiving
  /** Catches of thrown passes (receiving_touch attributions). */
  receptions: number;
  drops: number;

  // Touches
  /** completions + receptions + disc_pickup + pull_reception */
  totalTouches: number;

  // Defense
  blocks: number;

  // Pulls
  pulls: number;
  pullReceptions: number;

  // Playing time
  pointsPlayed: number;
  /** Points where this participant's side received. */
  oPoints: number;
  /** Points where this participant's side pulled. */
  dPoints: number;
  /** holds / (holds + timesBroken) for points this participant played on O. Null if 0 O-points. */
  oEfficiency: number | null;
  /** breaks / (breaks + oppHolds) for points this participant played on D. Null if 0 D-points. */
  dEfficiency: number | null;
  /** Sum of durationMs for points this participant played. Null if no timing data. */
  pointDurationMs: number | null;
  /** Player playing time / total game time. Null if no timing data. */
  playingTimePct: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function createEmptyStats(participantId: string): AdvancedPlayerStats {
  return {
    participantId,
    goals: 0,
    assists: 0,
    hockeyAssists: 0,
    callahans: 0,
    plusMinus: 0,
    completions: 0,
    throwAttempts: 0,
    completionPct: null,
    throwaways: 0,
    stalls: 0,
    receptions: 0,
    drops: 0,
    totalTouches: 0,
    blocks: 0,
    pulls: 0,
    pullReceptions: 0,
    pointsPlayed: 0,
    oPoints: 0,
    dPoints: 0,
    oEfficiency: null,
    dEfficiency: null,
    pointDurationMs: null,
    playingTimePct: null,
  };
}

/** Sum attribution weights for a participant + type. */
function sumWeights(
  byParticipant: Map<string, Map<AttributionType, number>>,
  participantId: string,
  type: AttributionType,
): number {
  return byParticipant.get(participantId)?.get(type) ?? 0;
}

/** Find which sideId a participant belongs to for a given point. */
function findSideForParticipant(point: AnalyticsPoint, participantId: string): string | null {
  for (const [sideId, ids] of Object.entries(point.linesBySide)) {
    if (ids.includes(participantId)) return sideId;
  }
  return null;
}

function buildPointById(points: AnalyticsPoint[]): Map<string, AnalyticsPoint> {
  return new Map(points.map((point) => [point.id, point]));
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Compute stats for all participants in a game. Optionally filter to a single side.
 *
 * Attribution-first: iterates `game.attributions` once, bucketing by participant and type,
 * then derives remaining stats (points played, O/D, timing) from `game.points`.
 */
export function computeAdvancedPlayerStats(
  game: AnalyticsGame,
  sideId?: string,
): AdvancedPlayerStats[] {
  const pointById = buildPointById(game.points);

  // Step 1: Bucket all attributions by participantId → type → summed weight
  const byParticipant = new Map<string, Map<AttributionType, number>>();
  for (const attr of game.attributions) {
    if (sideId != null && game.gameType === 'scrimmage') {
      const point = pointById.get(attr.pointId);
      if (point == null) continue;
      const participantSide = findSideForParticipant(point, attr.participantId);
      if (participantSide !== sideId) continue;
    }

    let typeMap = byParticipant.get(attr.participantId);
    if (!typeMap) {
      typeMap = new Map<AttributionType, number>();
      byParticipant.set(attr.participantId, typeMap);
    }
    typeMap.set(attr.type, (typeMap.get(attr.type) ?? 0) + attr.weight);
  }

  // Step 2: Collect all unique participant IDs from points linesBySide
  const allParticipantIds = new Set<string>();
  for (const point of game.points) {
    for (const [side, ids] of Object.entries(point.linesBySide)) {
      if (sideId != null && side !== sideId) continue;
      for (const id of ids) {
        allParticipantIds.add(id);
      }
    }
  }
  // Also include participants from attributions who may not be in lines (e.g. defenders)
  for (const id of byParticipant.keys()) {
    // Only add if no sideId filter, or if this participant appears in the filtered side
    if (sideId == null) {
      allParticipantIds.add(id);
    }
  }

  // Step 3: Build stats for each participant
  const totalGameDurationMs = game.points.reduce(
    (sum, p) => (p.durationMs != null ? sum + p.durationMs : sum),
    0,
  );
  const hasAnyTimingData = game.points.some((p) => p.durationMs != null);

  const results: AdvancedPlayerStats[] = [];

  for (const participantId of allParticipantIds) {
    const stats = createEmptyStats(participantId);
    const sum = (type: AttributionType) => sumWeights(byParticipant, participantId, type);

    // Attribution-derived stats
    stats.goals = sum('goal');
    stats.assists = sum('assist');
    stats.hockeyAssists = sum('hockey_assist');
    stats.callahans = sum('callahan');
    stats.completions = sum('completion');
    stats.throwAttempts = sum('throw_attempt');
    stats.throwaways = sum('throwaway');
    stats.stalls = sum('stall');
    stats.receptions = sum('receiving_touch');
    stats.drops = sum('drop');
    stats.blocks = sum('block');
    stats.pulls = sum('pull');
    stats.pullReceptions = sum('pull_reception');

    // Derived calculations
    stats.completionPct = stats.throwAttempts > 0 ? stats.completions / stats.throwAttempts : null;
    stats.totalTouches =
      stats.completions + stats.receptions + sum('disc_pickup') + stats.pullReceptions;
    stats.plusMinus =
      stats.goals + stats.assists + stats.blocks + stats.stalls - stats.throwaways - stats.drops;

    // Points played, O/D split, and efficiency from linesBySide
    let playerDurationMs = 0;
    let hasPlayerTimingData = false;
    let oHolds = 0;
    let oTimesBroken = 0;
    let dBreaks = 0;
    let dOppHolds = 0;

    for (const point of game.points) {
      const side = findSideForParticipant(point, participantId);
      if (side == null) continue;
      if (sideId != null && side !== sideId) continue;

      stats.pointsPlayed++;
      const isOPoint = point.receivingSideId === side;
      if (isOPoint) {
        stats.oPoints++;
      } else {
        stats.dPoints++;
      }

      const state = getPointStateForSide(point, side);
      if (isOPoint) {
        if (state === 'hold') oHolds++;
        else if (state === 'broken') oTimesBroken++;
      } else {
        if (state === 'break') dBreaks++;
        else if (state === 'opp_hold') dOppHolds++;
      }

      if (point.durationMs != null) {
        playerDurationMs += point.durationMs;
        hasPlayerTimingData = true;
      }
    }

    const oTotal = oHolds + oTimesBroken;
    const dTotal = dBreaks + dOppHolds;
    stats.oEfficiency = oTotal > 0 ? oHolds / oTotal : null;
    stats.dEfficiency = dTotal > 0 ? dBreaks / dTotal : null;

    stats.pointDurationMs = hasPlayerTimingData ? playerDurationMs : null;
    stats.playingTimePct =
      hasAnyTimingData && totalGameDurationMs > 0 && hasPlayerTimingData
        ? playerDurationMs / totalGameDurationMs
        : null;

    results.push(stats);
  }

  return results;
}

/**
 * Convenience wrapper for a single participant's stats.
 * Returns empty stats if the participant is not found.
 */
export function computeAdvancedPlayerStatsForParticipant(
  game: AnalyticsGame,
  participantId: string,
): AdvancedPlayerStats {
  const all = computeAdvancedPlayerStats(game);
  return all.find((s) => s.participantId === participantId) ?? createEmptyStats(participantId);
}
