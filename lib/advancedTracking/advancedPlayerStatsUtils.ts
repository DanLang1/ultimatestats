import {
  computeAdvancedPlayerThrowTypeStats,
  type AdvancedPlayerThrowTypeStats,
} from './advancedThrowTypeStatsUtils';
import type { AnalyticsGame, AnalyticsPoint, AttributionType } from './analyticsTypes';
import { getPointStateForSide } from './buildAnalyticsGame';
import {
  POINT_PLUS_MINUS_BREAK_VALUE,
  POINT_PLUS_MINUS_BROKEN_VALUE,
  POINT_PLUS_MINUS_HOLD_VALUE,
  POINT_PLUS_MINUS_OPP_HOLD_VALUE,
} from './statConstants';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdvancedPlayerStats {
  participantId: string;

  // Scoring
  goals: number;
  assists: number;
  hockeyAssists: number;
  callahans: number;
  /** Weighted attribution sum; weights live in `ATTRIBUTION_STAT_SPECS`. */
  plusMinus: number;

  // Throwing
  /** Successful throws (complete + goal). */
  completions: number;
  throwAttempts: number;
  /** Null if 0 throw attempts. */
  completionPct: number | null;
  throwaways: number;
  /** Stalls forced as a defender. */
  stalls: number;
  /** Times stalled out as the disc holder. */
  stallsConceded: number;
  /** Weighted turnover events: throwaways + drops + stallsConceded (50/50 halves count 0.5). */
  turnovers: number;

  // Receiving
  /** Catches of thrown passes (receiving_touch attributions). */
  receptions: number;
  drops: number;

  // Touches
  /** receptions + disc_pickup + pull_reception */
  totalTouches: number;

  // Defense
  blocks: number;
  pressures: number;

  // Pulls
  pulls: number;
  pullReceptions: number;
  inboundPulls: number;
  outOfBoundsPulls: number;
  droppedPulls: number;
  rollerPulls: number;
  /** Average hang time across timed inbound/dropped pulls. Null if no pulls have timing data. */
  avgPullHangTimeMs: number | null;
  /** Longest timed inbound/dropped pull. Null if no pulls have timing data. */
  maxPullHangTimeMs: number | null;
  /** Shortest timed inbound/dropped pull. Null if no pulls have timing data. */
  minPullHangTimeMs: number | null;

  // Classified throw types
  huckAttempts: number;
  huckCompletions: number;
  huckCompletionPct: number | null;
  huckIncompletions: number;
  huckThrowaways: number;
  huckDrops: number;
  huckBlocks: number;
  huckPressures: number;
  resetThrowaways: number;
  resetDrops: number;
  resetBlocks: number;
  resetPressures: number;
  resetTurnovers: number;
  hucksCaught: number;
  hucksDropped: number;
  resetsDropped: number;

  // Playing time
  pointsPlayed: number;
  /** Points where this participant's side received. */
  oPoints: number;
  /** Points where this participant's side pulled. */
  dPoints: number;
  /** Weighted point outcomes: hold +0.5, broken -1, break +1, opponent hold -0.5. */
  pointPlusMinus: number;
  /** holds / (holds + timesBroken) for points this participant played on O. Null if 0 O-points. */
  oEfficiency: number | null;
  /** breaks / (breaks + oppHolds) for points this participant played on D. Null if 0 D-points. */
  dEfficiency: number | null;
  /** Sum of durationMs for points this participant played. Null if no timing data. */
  pointDurationMs: number | null;
  /** Player playing time / total game time. Null if no timing data. */
  playingTimePct: number | null;
}

/** Passes its argument through; a name that is not an `AdvancedPlayerStats` key fails to compile. */
type AdvancedPlayerStatField<Field extends keyof AdvancedPlayerStats> = Field;

/**
 * Player counters summed straight from attributions. Derived stats (plus/minus, turnovers, touches)
 * are computed afterwards and must not appear here.
 */
export type AttributionCountField = AdvancedPlayerStatField<
  | 'goals'
  | 'assists'
  | 'hockeyAssists'
  | 'callahans'
  | 'completions'
  | 'throwAttempts'
  | 'throwaways'
  | 'stalls'
  | 'stallsConceded'
  | 'receptions'
  | 'drops'
  | 'blocks'
  | 'pressures'
  | 'pulls'
  | 'pullReceptions'
>;

export interface AttributionStatSpec {
  /** Player stat that sums this attribution's weight; null when it only feeds a derived stat. */
  field: AttributionCountField | null;
  /** Contribution of one full-weight attribution to the player's plus/minus. */
  plusMinusWeight: number;
}

/**
 * Single source for how each attribution feeds player stats. Adding an `AttributionType` fails to
 * compile until it has an entry here.
 */
export const ATTRIBUTION_STAT_SPECS = {
  goal: { field: 'goals', plusMinusWeight: 1 },
  assist: { field: 'assists', plusMinusWeight: 1 },
  hockey_assist: { field: 'hockeyAssists', plusMinusWeight: 0 },
  completion: { field: 'completions', plusMinusWeight: 0 },
  throw_attempt: { field: 'throwAttempts', plusMinusWeight: 0 },
  receiving_touch: { field: 'receptions', plusMinusWeight: 0 },
  throwaway: { field: 'throwaways', plusMinusWeight: -1 },
  drop: { field: 'drops', plusMinusWeight: -1 },
  stall: { field: 'stalls', plusMinusWeight: 1 },
  stall_conceded: { field: 'stallsConceded', plusMinusWeight: -1 },
  block: { field: 'blocks', plusMinusWeight: 1 },
  pressure: { field: 'pressures', plusMinusWeight: 0.5 },
  // A Callahan also emits goal and block attributions, which carry its plus/minus.
  callahan: { field: 'callahans', plusMinusWeight: 0 },
  pull: { field: 'pulls', plusMinusWeight: 0 },
  pull_reception: { field: 'pullReceptions', plusMinusWeight: 0 },
  // Counted only within totalTouches.
  disc_pickup: { field: null, plusMinusWeight: 0 },
} as const satisfies Record<AttributionType, AttributionStatSpec>;

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
    stallsConceded: 0,
    turnovers: 0,
    receptions: 0,
    drops: 0,
    totalTouches: 0,
    blocks: 0,
    pressures: 0,
    pulls: 0,
    pullReceptions: 0,
    inboundPulls: 0,
    outOfBoundsPulls: 0,
    droppedPulls: 0,
    rollerPulls: 0,
    avgPullHangTimeMs: null,
    maxPullHangTimeMs: null,
    minPullHangTimeMs: null,
    huckAttempts: 0,
    huckCompletions: 0,
    huckCompletionPct: null,
    huckIncompletions: 0,
    huckThrowaways: 0,
    huckDrops: 0,
    huckBlocks: 0,
    huckPressures: 0,
    resetThrowaways: 0,
    resetDrops: 0,
    resetBlocks: 0,
    resetPressures: 0,
    resetTurnovers: 0,
    hucksCaught: 0,
    hucksDropped: 0,
    resetsDropped: 0,
    pointsPlayed: 0,
    oPoints: 0,
    dPoints: 0,
    pointPlusMinus: 0,
    oEfficiency: null,
    dEfficiency: null,
    pointDurationMs: null,
    playingTimePct: null,
  };
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
  const throwTypeByPlayer = computeAdvancedPlayerThrowTypeStats(game, sideId);

  // Step 1: Bucket all attributions by participantId → type → summed weight
  const byParticipant = new Map<string, Map<AttributionType, number>>();
  for (const attr of game.attributions) {
    if (sideId != null) {
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
  for (const id of throwTypeByPlayer.keys()) {
    allParticipantIds.add(id);
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
    const weightByType = byParticipant.get(participantId) ?? new Map<AttributionType, number>();

    // Attribution-derived stats and plus/minus
    for (const [type, weight] of weightByType) {
      const { field, plusMinusWeight } = ATTRIBUTION_STAT_SPECS[type];
      if (field != null) stats[field] += weight;
      stats.plusMinus += weight * plusMinusWeight;
    }

    const throwTypes: AdvancedPlayerThrowTypeStats | undefined =
      throwTypeByPlayer.get(participantId);
    if (throwTypes) {
      stats.huckAttempts = throwTypes.huckAttempts;
      stats.huckCompletions = throwTypes.huckCompletions;
      stats.huckCompletionPct = throwTypes.huckCompletionPct;
      stats.huckIncompletions = throwTypes.huckIncompletions;
      stats.huckThrowaways = throwTypes.huckThrowaways;
      stats.huckDrops = throwTypes.huckDrops;
      stats.huckBlocks = throwTypes.huckBlocks;
      stats.huckPressures = throwTypes.huckPressures;
      stats.resetThrowaways = throwTypes.resetThrowaways;
      stats.resetDrops = throwTypes.resetDrops;
      stats.resetBlocks = throwTypes.resetBlocks;
      stats.resetPressures = throwTypes.resetPressures;
      stats.resetTurnovers = throwTypes.resetTurnovers;
      stats.hucksCaught = throwTypes.hucksCaught;
      stats.hucksDropped = throwTypes.hucksDropped;
      stats.resetsDropped = throwTypes.resetsDropped;
    }

    // Derived calculations
    stats.completionPct = stats.throwAttempts > 0 ? stats.completions / stats.throwAttempts : null;
    stats.turnovers = stats.throwaways + stats.drops + stats.stallsConceded;
    stats.totalTouches =
      stats.receptions + (weightByType.get('disc_pickup') ?? 0) + stats.pullReceptions;

    let pullHangTimeSumMs = 0;
    let timedPullCount = 0;
    for (const action of game.actions) {
      if (action.kind !== 'pull' || action.actorId !== participantId) continue;
      // Only count pulls thrown by our side (sideId is the pulling side for pull actions).
      if (sideId != null && action.sideId !== sideId) continue;

      if (action.result === 'inbound' || action.result === 'roller') stats.inboundPulls++;
      if (action.result === 'ob') stats.outOfBoundsPulls++;
      if (action.result === 'dropped') stats.droppedPulls++;
      if (action.result === 'roller') stats.rollerPulls++;

      if (action.result === 'ob' || action.result === 'roller' || action.hangTimeMs == null) {
        continue;
      }
      pullHangTimeSumMs += action.hangTimeMs;
      timedPullCount++;
      stats.maxPullHangTimeMs = Math.max(stats.maxPullHangTimeMs ?? 0, action.hangTimeMs);
      stats.minPullHangTimeMs = Math.min(
        stats.minPullHangTimeMs ?? action.hangTimeMs,
        action.hangTimeMs,
      );
    }
    stats.avgPullHangTimeMs = timedPullCount > 0 ? pullHangTimeSumMs / timedPullCount : null;

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
    stats.pointPlusMinus =
      oHolds * POINT_PLUS_MINUS_HOLD_VALUE +
      oTimesBroken * POINT_PLUS_MINUS_BROKEN_VALUE +
      dBreaks * POINT_PLUS_MINUS_BREAK_VALUE +
      dOppHolds * POINT_PLUS_MINUS_OPP_HOLD_VALUE;
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
 * Select a single participant's stats from a previously computed collection.
 * Returns empty stats if the participant is not found.
 */
export function getAdvancedPlayerStatsForParticipant(
  allPlayerStats: AdvancedPlayerStats[],
  participantId: string,
): AdvancedPlayerStats {
  return (
    allPlayerStats.find((stats) => stats.participantId === participantId) ??
    createEmptyStats(participantId)
  );
}
