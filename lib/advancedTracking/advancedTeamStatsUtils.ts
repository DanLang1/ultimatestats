import {
  computeAdvancedThrowTypeStats,
  type AdvancedThrowTypeStats,
} from './advancedThrowTypeStatsUtils';
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
  /** breaks / dPointsWithTurnover. Null if no D-point break chances. */
  breakEfficiencyPct: number | null;
  /** Average number of possessions by this side per point. Null if 0 points. */
  possessionsPerPoint: number | null;
  /** Average possessions by this side per O-point. Null if 0 O-points. */
  possessionsPerOPoint: number | null;
  /** Average possessions by this side per D-point. Null if 0 D-points. */
  possessionsPerDPoint: number | null;
  /** Average turnovers per point. Null if 0 points. */
  turnoversPerPoint: number | null;
  /** Completed passes by this side divided by points. Null if 0 points. */
  completedPassesPerPoint: number | null;
  /** Completed passes by this side divided by possessions. Null if 0 possessions. */
  completedPassesPerPossession: number | null;
  /** Completed passes divided by throw attempts. Null if 0 attempts. */
  completionPct: number | null;
  /** Throw attempts by this side. Stalls are excluded. */
  totalThrowAttempts: number;
  /** Completed passes by this side, including goal throws. */
  totalCompletedPasses: number;
  pointsPerTurnover: number;
  /** Scoring possessions by this side divided by all possessions. Null if none. */
  possessionConversionPct: number | null;
  /** Scored possessions owned by this side on O-points, including synthetic Callahan possessions. */
  scoredOPossessions: number;
  /** All possessions owned by this side on O-points, including the current possession. */
  totalPossessionsOnO: number;
  /** scoredOPossessions / totalPossessionsOnO. Null if no O-point possessions. */
  oPossessionConversionPct: number | null;
  /** Scored possessions owned by this side on D-points, including synthetic Callahan possessions. */
  scoredDPossessions: number;
  /** All possessions owned by this side on D-points, including the current possession. */
  totalPossessionsOnD: number;
  /** scoredDPossessions / totalPossessionsOnD. Null if no D-point possessions. */
  dPossessionConversionPct: number | null;
  /** Goals scored by this side. */
  totalGoals: number;
  /** All possessions by this side, including a current unresolved possession. */
  totalPossessions: number;
  /** All possessions by this side that were manually marked as entering the red zone. */
  redZoneEntries: number;
  /** Marked possessions that ended in either a score or turnover. */
  resolvedRedZonePossessions: number;
  /** Marked possessions that ended in a score. */
  scoredRedZonePossessions: number;
  /** scoredRedZonePossessions / resolvedRedZonePossessions. Null if none resolved. */
  redZoneConversionPct: number | null;
  /** Average active-play time from point start to red-zone entry. */
  averageTimeToRedZoneMs: number | null;
  /** Average active-play time from red-zone entry to a resolved possession outcome. */
  averageRedZoneOutcomeDurationMs: number | null;
  /** Average active-play time from red-zone entry to a goal; scored possessions only. */
  averageRedZoneTimeToScoreMs: number | null;
  /** Average active-play time from red-zone entry to a turnover; turned-over possessions only. */
  averageRedZoneTimeToTurnoverMs: number | null;
  /** Opponent possessions manually marked as entering the red zone. */
  opponentRedZoneEntries: number;
  /** Opponent marked possessions ending in a goal or turnover. */
  resolvedOpponentRedZonePossessions: number;
  /** Opponent marked possessions ending in a turnover. */
  redZoneStops: number;
  /** redZoneStops / resolvedOpponentRedZonePossessions. Null if none resolved. */
  redZoneStopPct: number | null;
  /** Average active-play time from opponent red-zone entry to an opponent goal. */
  averageRedZoneTimeToOpponentGoalMs: number | null;
  /** Average active-play time from opponent red-zone entry to an opponent turnover. */
  averageRedZoneTimeToOpponentTurnoverMs: number | null;
  blocksPerDPoint: number;
  pressuresPerDPoint: number;
  totalTurnovers: number;
  totalBlocks: number;
  totalPressures: number;
  /** Possessions by this side where possessionIndex > 0 and result === 'scored'. */
  scoresAfterTurnovers: number;
  /** D-points where this side gained possession or scored. */
  dPointsWithTurnover: number;
  /** Completed points used for game-flow percentages. */
  completedPoints: number;
  /** Completed points where this side had two or more possessions. */
  multiPossessionPoints: number;
  /** multiPossessionPoints / completed points. Null if 0 completed points. */
  multiPossessionPointPct: number | null;
  longestScoringRun: number;
  longestDrought: number;
  /** Optional manual throw classifications derived from canonical actions. */
  throwTypes: AdvancedThrowTypeStats;
}

interface AdvancedRedZoneDefenseStats {
  opponentRedZoneEntries: number;
  resolvedOpponentRedZonePossessions: number;
  redZoneStops: number;
  redZoneStopPct: number | null;
  averageRedZoneTimeToOpponentGoalMs: number | null;
  averageRedZoneTimeToOpponentTurnoverMs: number | null;
}

function averageDuration(durations: number[]): number | null {
  return durations.length > 0
    ? durations.reduce((total, duration) => total + duration, 0) / durations.length
    : null;
}

function computeAdvancedRedZoneDefenseStats(
  game: AnalyticsGame,
  sideId: string,
): AdvancedRedZoneDefenseStats {
  const enteredPossessions = game.possessions.filter(
    (possession) => possession.sideId !== sideId && possession.enteredRedZone,
  );
  const resolvedPossessions = enteredPossessions.filter(
    (possession) => possession.result === 'scored' || possession.result === 'turned_over',
  );
  const stoppedPossessions = resolvedPossessions.filter(
    (possession) => possession.result === 'turned_over',
  );
  const goalTimings = resolvedPossessions.flatMap((possession) =>
    possession.result === 'scored' && possession.redZoneOutcomeDurationMs != null
      ? [possession.redZoneOutcomeDurationMs]
      : [],
  );
  const turnoverTimings = stoppedPossessions.flatMap((possession) =>
    possession.redZoneOutcomeDurationMs == null ? [] : [possession.redZoneOutcomeDurationMs],
  );

  return {
    opponentRedZoneEntries: enteredPossessions.length,
    resolvedOpponentRedZonePossessions: resolvedPossessions.length,
    redZoneStops: stoppedPossessions.length,
    redZoneStopPct:
      resolvedPossessions.length > 0
        ? stoppedPossessions.length / resolvedPossessions.length
        : null,
    averageRedZoneTimeToOpponentGoalMs: averageDuration(goalTimings),
    averageRedZoneTimeToOpponentTurnoverMs: averageDuration(turnoverTimings),
  };
}

interface AdvancedRedZoneStats {
  redZoneEntries: number;
  resolvedRedZonePossessions: number;
  scoredRedZonePossessions: number;
  redZoneConversionPct: number | null;
  averageTimeToRedZoneMs: number | null;
  averageRedZoneOutcomeDurationMs: number | null;
  /** Average active-play time from red-zone entry to a goal; scored possessions only. */
  averageRedZoneTimeToScoreMs: number | null;
  /** Average active-play time from red-zone entry to a turnover; turned-over possessions only. */
  averageRedZoneTimeToTurnoverMs: number | null;
}

function computeAdvancedRedZoneStats(game: AnalyticsGame, sideId: string): AdvancedRedZoneStats {
  const enteredPossessions = game.possessions.filter(
    (possession) => possession.sideId === sideId && possession.enteredRedZone,
  );
  const resolvedPossessions = enteredPossessions.filter(
    (possession) => possession.result === 'scored' || possession.result === 'turned_over',
  );
  const scoredPossessions = resolvedPossessions.filter(
    (possession) => possession.result === 'scored',
  );
  const entryTimings = enteredPossessions.flatMap((possession) =>
    possession.redZoneEntryElapsedMs == null ? [] : [possession.redZoneEntryElapsedMs],
  );
  const outcomeTimings = resolvedPossessions.flatMap((possession) =>
    possession.redZoneOutcomeDurationMs == null ? [] : [possession.redZoneOutcomeDurationMs],
  );

  const scoreTimings = scoredPossessions.flatMap((possession) =>
    possession.redZoneOutcomeDurationMs == null ? [] : [possession.redZoneOutcomeDurationMs],
  );
  const turnoverTimings = resolvedPossessions.flatMap((possession) =>
    possession.result === 'turned_over' && possession.redZoneOutcomeDurationMs != null
      ? [possession.redZoneOutcomeDurationMs]
      : [],
  );

  return {
    redZoneEntries: enteredPossessions.length,
    resolvedRedZonePossessions: resolvedPossessions.length,
    scoredRedZonePossessions: scoredPossessions.length,
    redZoneConversionPct:
      resolvedPossessions.length > 0 ? scoredPossessions.length / resolvedPossessions.length : null,
    averageTimeToRedZoneMs: averageDuration(entryTimings),
    averageRedZoneOutcomeDurationMs: averageDuration(outcomeTimings),
    averageRedZoneTimeToScoreMs: averageDuration(scoreTimings),
    averageRedZoneTimeToTurnoverMs: averageDuration(turnoverTimings),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function computeAdvancedTeamStats(game: AnalyticsGame, sideId: string): AdvancedTeamStats {
  const throwTypes = computeAdvancedThrowTypeStats(game, sideId);
  const redZoneStats = computeAdvancedRedZoneStats(game, sideId);
  const redZoneDefenseStats = computeAdvancedRedZoneDefenseStats(game, sideId);
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
  let completedPointCount = 0;

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
      completedPointCount++;
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
  let totalBlocks = 0;
  let totalPressures = 0;
  let scoresAfterTurnovers = 0;
  let totalThrowAttempts = 0;
  let totalCompletedPasses = 0;
  let scoredOPossessions = 0;
  let scoredDPossessions = 0;
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
      if (poss.result === 'scored') {
        if (isOPointById.get(poss.pointId)) {
          scoredOPossessions++;
        } else {
          scoredDPossessions++;
        }
      }
      if (poss.result === 'turned_over') {
        turnoversByPoint.set(poss.pointId, (turnoversByPoint.get(poss.pointId) ?? 0) + 1);
      }
      if (poss.possessionIndex > 0 && poss.result === 'scored') {
        scoresAfterTurnovers++;
      }
    } else {
      if (poss.turnoverType === 'block' || poss.turnoverType === 'callahan') {
        totalBlocks++;
      }
      if (poss.turnoverType === 'pressure') {
        totalPressures++;
      }
      if (poss.turnoverType === 'callahan') {
        // Raw tracking records a Callahan inside the thrower's possession, because the point ends
        // immediately. For team conversion stats, credit the scoring defense with one derived
        // possession so a Callahan goal is not counted as a goal with zero possessions.
        possessionsByPoint.set(poss.pointId, (possessionsByPoint.get(poss.pointId) ?? 0) + 1);
        if (isOPointById.get(poss.pointId)) {
          scoredOPossessions++;
        } else {
          scoredDPossessions++;
        }
      }
    }
  }

  for (const action of game.actions) {
    if (action.sideId !== sideId) continue;
    if (action.kind !== 'throw') continue;

    if (action.result !== 'stall') totalThrowAttempts++;
    if (action.result === 'complete' || action.result === 'goal') {
      totalCompletedPasses++;
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
  for (const count of turnoversByPoint.values()) {
    totalTurnoversInGame += count;
  }

  const oTotal = holds + timesBroken;
  const dTotal = breaks + oppHolds;
  const totalGoals = scoredOPossessions + scoredDPossessions;
  let multiPossessionPoints = 0;
  let dPointsWithTurnover = 0;
  for (const point of game.points) {
    const state = getPointStateForSide(point, sideId);
    if (state === 'terminated' || state === 'in_progress') continue;
    if (
      point.receivingSideId !== sideId &&
      ((possessionsByPoint.get(point.id) ?? 0) > 0 || state === 'break')
    ) {
      dPointsWithTurnover++;
    }
    if ((possessionsByPoint.get(point.id) ?? 0) >= 2) {
      multiPossessionPoints++;
    }
  }

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
    breakEfficiencyPct: dPointsWithTurnover > 0 ? breaks / dPointsWithTurnover : null,
    possessionsPerPoint: pointCount > 0 ? totalPossessionsInGame / pointCount : null,
    possessionsPerOPoint: oPoints > 0 ? totalPossessionsOnO / oPoints : null,
    possessionsPerDPoint: dPoints > 0 ? totalPossessionsOnD / dPoints : null,
    turnoversPerPoint: pointCount > 0 ? totalTurnoversInGame / pointCount : null,
    completedPassesPerPoint: pointCount > 0 ? totalCompletedPasses / pointCount : null,
    completedPassesPerPossession:
      totalPossessionsInGame > 0 ? totalCompletedPasses / totalPossessionsInGame : null,
    completionPct: totalThrowAttempts > 0 ? totalCompletedPasses / totalThrowAttempts : null,
    totalThrowAttempts,
    totalCompletedPasses,
    pointsPerTurnover: totalTurnoversInGame > 0 ? totalGoals / totalTurnoversInGame : totalGoals,
    possessionConversionPct:
      totalPossessionsInGame > 0 ? totalGoals / totalPossessionsInGame : null,
    scoredOPossessions,
    totalPossessionsOnO,
    oPossessionConversionPct:
      totalPossessionsOnO > 0 ? scoredOPossessions / totalPossessionsOnO : null,
    scoredDPossessions,
    totalPossessionsOnD,
    dPossessionConversionPct:
      totalPossessionsOnD > 0 ? scoredDPossessions / totalPossessionsOnD : null,
    totalGoals,
    totalPossessions: totalPossessionsInGame,
    ...redZoneStats,
    ...redZoneDefenseStats,
    blocksPerDPoint: dPoints > 0 ? totalBlocks / dPoints : 0,
    pressuresPerDPoint: dPoints > 0 ? totalPressures / dPoints : 0,
    totalTurnovers: totalTurnoversInGame,
    totalBlocks,
    totalPressures,
    scoresAfterTurnovers,
    dPointsWithTurnover,
    completedPoints: completedPointCount,
    multiPossessionPoints,
    multiPossessionPointPct:
      completedPointCount > 0 ? multiPossessionPoints / completedPointCount : null,
    longestScoringRun,
    longestDrought,
    throwTypes,
  };
}
