import type { AnalyticsGame } from './analyticsTypes';
import { getPointStateForSide } from './buildAnalyticsGame';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdvancedTeamStats {
  sideId: string;
  holds: number;
  breaks: number;
  timesBroken: number;
  oppHolds: number;
  /** holds / (holds + timesBroken). Null if 0 O-points. */
  oEfficiency: number | null;
  /** breaks / (breaks + oppHolds). Null if 0 D-points. */
  dEfficiency: number | null;
  cleanHolds: number;
  dirtyHolds: number;
  oPoints: number;
  dPoints: number;
  /** holds / oPoints. Null if 0 O-points. */
  oLineConversionPct: number | null;
  /** breaks / dPoints. Null if 0 D-points. */
  dLineConversionPct: number | null;
  /** Average number of possessions per point. Null if 0 points. */
  possessionsPerPoint: number | null;
  /** Average possessions per O-point. Null if 0 O-points. */
  possessionsPerOPoint: number | null;
  /** Average possessions per D-point. Null if 0 D-points. */
  possessionsPerDPoint: number | null;
  /** Average turnovers per point. Null if 0 points. */
  turnoversPerPoint: number | null;
  /** Possessions where possessionIndex > 0 and result === 'scored'. */
  scoresAfterTurnovers: number;
  longestScoringRun: number;
  longestDrought: number;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function computeAdvancedTeamStats(game: AnalyticsGame, sideId: string): AdvancedTeamStats {
  let holds = 0;
  let breaks = 0;
  let timesBroken = 0;
  let oppHolds = 0;
  let cleanHolds = 0;
  let dirtyHolds = 0;
  let oPoints = 0;
  let dPoints = 0;

  // Scoring run tracking
  let currentScoringRun = 0;
  let longestScoringRun = 0;
  let currentDrought = 0;
  let longestDrought = 0;

  for (const point of game.points) {
    const state = getPointStateForSide(point, sideId);

    const sideScored = state === 'hold' || state === 'break';

    // O/D classification: include completed and in-progress points
    if (state !== 'terminated') {
      if (point.receivingSideId === sideId) {
        oPoints++;
      } else {
        dPoints++;
      }
    }

    // Scoring runs: only for completed points
    if (state !== 'terminated' && state !== 'in_progress') {
      if (sideScored) {
        currentScoringRun++;
        longestScoringRun = Math.max(longestScoringRun, currentScoringRun);
        currentDrought = 0;
      } else {
        currentDrought++;
        longestDrought = Math.max(longestDrought, currentDrought);
        currentScoringRun = 0;
      }
    }

    switch (state) {
      case 'hold':
        holds++;
        if (point.isCleanHold === true) cleanHolds++;
        else if (point.isCleanHold === false) dirtyHolds++;
        break;
      case 'break':
        breaks++;
        break;
      case 'broken':
        timesBroken++;
        break;
      case 'opp_hold':
        oppHolds++;
        break;
      case 'terminated':
      case 'in_progress':
        // Terminated/in-progress points don't contribute to hold/break counts
        break;
    }
  }

  // Possession-level stats
  const pointCount = game.points.length;
  let totalPossessionsInGame = 0;
  let totalPossessionsOnO = 0;
  let totalPossessionsOnD = 0;
  let totalTurnoversInGame = 0;
  let scoresAfterTurnovers = 0;

  // Build O/D lookup for each point
  const isOPointById = new Map<string, boolean>();
  for (const point of game.points) {
    isOPointById.set(point.id, point.receivingSideId === sideId);
  }

  // Group possessions by point to get per-point possession counts
  const possessionsByPoint = new Map<string, number>();
  const turnoversByPoint = new Map<string, number>();

  for (const poss of game.possessions) {
    if (poss.sideId === sideId) {
      possessionsByPoint.set(poss.pointId, (possessionsByPoint.get(poss.pointId) ?? 0) + 1);
      if (poss.result === 'turned_over') {
        turnoversByPoint.set(poss.pointId, (turnoversByPoint.get(poss.pointId) ?? 0) + 1);
      }
      if (poss.possessionIndex > 0 && poss.result === 'scored') {
        scoresAfterTurnovers++;
      }
    }
  }

  for (const [pointId, count] of possessionsByPoint.entries()) {
    totalPossessionsInGame += count;
    if (isOPointById.get(pointId)) {
      totalPossessionsOnO += count;
    } else {
      totalPossessionsOnD += count;
    }
  }
  for (const count of turnoversByPoint.values()) totalTurnoversInGame += count;

  const oTotal = holds + timesBroken;
  const dTotal = breaks + oppHolds;

  return {
    sideId,
    holds,
    breaks,
    timesBroken,
    oppHolds,
    oEfficiency: oTotal > 0 ? holds / oTotal : null,
    dEfficiency: dTotal > 0 ? breaks / dTotal : null,
    cleanHolds,
    dirtyHolds,
    oPoints,
    dPoints,
    oLineConversionPct: oPoints > 0 ? holds / oPoints : null,
    dLineConversionPct: dPoints > 0 ? breaks / dPoints : null,
    possessionsPerPoint: pointCount > 0 ? totalPossessionsInGame / pointCount : null,
    possessionsPerOPoint: oPoints > 0 ? totalPossessionsOnO / oPoints : null,
    possessionsPerDPoint: dPoints > 0 ? totalPossessionsOnD / dPoints : null,
    turnoversPerPoint: pointCount > 0 ? totalTurnoversInGame / pointCount : null,
    scoresAfterTurnovers,
    longestScoringRun,
    longestDrought,
  };
}
