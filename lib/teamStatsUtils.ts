import { GameEvent } from '@/store/gameStore.types';
import { computePointByPointEvents } from './timelineUtils';

export interface TeamStats {
  // Offensive
  offensivePoints: number;
  holds: number;
  cleanHolds: number;
  dirtyHolds: number;
  holdPercentage: number;

  // Defensive
  defensivePoints: number;
  breaks: number;
  dPointsWithTurnover: number;
  breakEfficiency: number;
  dEfficiency: number;
  totalBlocks: number;

  // Negative
  timesBroken: number;
  totalTurnovers: number;

  // Game flow
  longestScoringRun: number;
  longestDrought: number;
  turnoversPerPoint: number;

  // Efficiency
  pointsPerTurnover: number;
  blocksPerDPoint: number;
  opponentTurnovers: number;
  conversionRate: number; // team1 goals / total possessions
}

/**
 * Computes team-level statistics from game events.
 * All stats are from team1's perspective.
 */
export function computeTeamStats(
  events: GameEvent[],
  startingPossession: 'team1' | 'team2' | null,
  gameTo: number,
): TeamStats {
  const pointEvents = computePointByPointEvents(events, startingPossession, gameTo);

  // Count totals
  let offensivePoints = 0;
  let defensivePoints = 0;
  let holds = 0;
  let cleanHolds = 0;
  let dirtyHolds = 0;
  let breaks = 0;
  let timesBroken = 0;
  let dPointsWithTurnover = 0;
  let totalTurnovers = 0;
  let opponentTurnovers = 0;
  let team1Blocks = 0;

  // Game flow tracking
  let currentRun = 0;
  let currentDrought = 0;
  let longestScoringRun = 0;
  let longestDrought = 0;
  let team1Goals = 0;

  for (const point of pointEvents) {
    const isTeam1Offense = point.offensiveTeam === 'team1';
    const team1Scored = point.scoringTeam === 'team1';

    // Count O-points and D-points
    if (isTeam1Offense) {
      offensivePoints++;
    } else {
      defensivePoints++;
    }

    // Count team1 turnovers (errors) during this point
    // Logic: team1 made a throwaway/drop OR team2 got a block on team1
    const team1TurnoversThisPoint = point.turnovers.filter(
      (t) =>
        (t.team === 'team1' && t.type !== 'block') || (t.team === 'team2' && t.type === 'block'),
    ).length;
    totalTurnovers += team1TurnoversThisPoint;

    // Count ALL opponent turnovers (gives us possession)
    // Logic: team2 made a throwaway/drop OR team1 got a block on team2
    const opponentTurnoversThisPoint = point.turnovers.filter(
      (t) =>
        (t.team === 'team2' && t.type !== 'block') || (t.team === 'team1' && t.type === 'block'),
    ).length;
    opponentTurnovers += opponentTurnoversThisPoint;

    // D-point specific stats (only on D-points)
    if (!isTeam1Offense) {
      if (opponentTurnoversThisPoint > 0 || team1Scored) {
        dPointsWithTurnover++;
      }
    }

    // Count ALL blocks team1 got (regardless of O-point or D-point)
    const blocksThisPoint = point.turnovers.filter(
      (t) => t.team === 'team1' && t.type === 'block',
    ).length;
    team1Blocks += blocksThisPoint;

    // Classify the point outcome
    if (isTeam1Offense && team1Scored) {
      // Hold
      holds++;
      if (team1TurnoversThisPoint === 0) {
        cleanHolds++;
      } else {
        dirtyHolds++;
      }
    } else if (!isTeam1Offense && team1Scored) {
      // Break
      breaks++;
    } else if (isTeam1Offense && !team1Scored) {
      // Broken
      timesBroken++;
    }

    // Track scoring runs and droughts
    if (team1Scored) {
      team1Goals++;
      currentRun++;
      longestScoringRun = Math.max(longestScoringRun, currentRun);
      currentDrought = 0;
    } else {
      currentDrought++;
      longestDrought = Math.max(longestDrought, currentDrought);
      currentRun = 0;
    }
  }

  // Calculate percentages (avoid divide by zero)
  const holdPercentage = offensivePoints > 0 ? (holds / offensivePoints) * 100 : 0;
  const breakEfficiency = dPointsWithTurnover > 0 ? (breaks / dPointsWithTurnover) * 100 : 0;
  const dEfficiency = defensivePoints > 0 ? (breaks / defensivePoints) * 100 : 0;

  // Calculate efficiency stats
  const totalPoints = pointEvents.length;
  const turnoversPerPoint = totalPoints > 0 ? totalTurnovers / totalPoints : 0;
  const pointsPerTurnover = totalTurnovers > 0 ? team1Goals / totalTurnovers : team1Goals;
  const blocksPerDPoint = defensivePoints > 0 ? team1Blocks / defensivePoints : 0;

  // Conversion rate: what % of our possessions resulted in a goal
  // Our possessions = O-points (we start with disc) + forced turnovers (opponent gave us disc)
  const totalPossessions = offensivePoints + opponentTurnovers;
  const conversionRate = totalPossessions > 0 ? (team1Goals / totalPossessions) * 100 : 0;

  return {
    offensivePoints,
    holds,
    cleanHolds,
    dirtyHolds,
    holdPercentage,
    defensivePoints,
    breaks,
    dPointsWithTurnover,
    breakEfficiency,
    dEfficiency,
    timesBroken,
    totalTurnovers,
    longestScoringRun,
    longestDrought,
    turnoversPerPoint,
    pointsPerTurnover,
    blocksPerDPoint,
    totalBlocks: team1Blocks,
    opponentTurnovers,
    conversionRate,
  };
}

/**
 * Aggregates multiple TeamStats objects into a single combined TeamStats.
 * Percentages are recalculated from the summed raw values.
 */
export function aggregateTeamStats(allStats: TeamStats[]): TeamStats {
  if (allStats.length === 0) {
    return {
      offensivePoints: 0,
      holds: 0,
      cleanHolds: 0,
      dirtyHolds: 0,
      holdPercentage: 0,
      defensivePoints: 0,
      breaks: 0,
      dPointsWithTurnover: 0,
      breakEfficiency: 0,
      dEfficiency: 0,
      timesBroken: 0,
      totalTurnovers: 0,
      longestScoringRun: 0,
      longestDrought: 0,
      turnoversPerPoint: 0,
      pointsPerTurnover: 0,
      blocksPerDPoint: 0,
      totalBlocks: 0,
      opponentTurnovers: 0,
      conversionRate: 0,
    };
  }

  const sum = (key: keyof TeamStats) => allStats.reduce((acc, s) => acc + s[key], 0);

  const offensivePoints = sum('offensivePoints');
  const defensivePoints = sum('defensivePoints');
  const holds = sum('holds');
  const breaks = sum('breaks');
  const dPointsWithTurnover = sum('dPointsWithTurnover');
  const totalTurnovers = sum('totalTurnovers');
  const opponentTurnovers = sum('opponentTurnovers');
  const totalPoints = offensivePoints + defensivePoints;
  const team1Goals = holds + breaks;

  return {
    offensivePoints,
    holds,
    cleanHolds: sum('cleanHolds'),
    dirtyHolds: sum('dirtyHolds'),
    holdPercentage: offensivePoints > 0 ? (holds / offensivePoints) * 100 : 0,
    defensivePoints,
    breaks,
    dPointsWithTurnover,
    breakEfficiency: dPointsWithTurnover > 0 ? (breaks / dPointsWithTurnover) * 100 : 0,
    dEfficiency: defensivePoints > 0 ? (breaks / defensivePoints) * 100 : 0,
    timesBroken: sum('timesBroken'),
    totalTurnovers,
    longestScoringRun: Math.max(...allStats.map((s) => s.longestScoringRun)),
    longestDrought: Math.max(...allStats.map((s) => s.longestDrought)),
    turnoversPerPoint: totalPoints > 0 ? totalTurnovers / totalPoints : 0,
    pointsPerTurnover: totalTurnovers > 0 ? team1Goals / totalTurnovers : team1Goals,
    blocksPerDPoint:
      defensivePoints > 0
        ? allStats.reduce((acc, s) => acc + s.blocksPerDPoint * s.defensivePoints, 0) /
          defensivePoints
        : 0,
    totalBlocks: sum('totalBlocks'),
    opponentTurnovers,
    conversionRate:
      offensivePoints + opponentTurnovers > 0
        ? (team1Goals / (offensivePoints + opponentTurnovers)) * 100
        : 0,
  };
}

// --- Timing Stats (separate for easy testing) ---

export interface TimingStats {
  /** Whether any timing data is available */
  hasTimingData: boolean;
  /** Average duration of all completed points (ms) */
  avgPointDurationMs: number;
  /** Average duration of offensive points (ms) */
  avgOPointDurationMs: number;
  /** Average duration of defensive points (ms) */
  avgDPointDurationMs: number;
  /** Duration of the longest point (ms) */
  longestPointDurationMs: number;
  /** Duration of the shortest point (ms) */
  shortestPointDurationMs: number;
  /** Number of points with timing data */
  timedPointCount: number;
  /** Number of O-points with timing data */
  timedOPointCount: number;
  /** Number of D-points with timing data */
  timedDPointCount: number;
}

/**
 * Computes timing statistics from game events.
 * Returns null-like stats (hasTimingData=false) if no points have duration data.
 */
export function computeTimingStats(
  events: GameEvent[],
  startingPossession: 'team1' | 'team2' | null,
  gameTo: number,
): TimingStats {
  const pointEvents = computePointByPointEvents(events, startingPossession, gameTo);

  const allDurations: number[] = [];
  const oDurations: number[] = [];
  const dDurations: number[] = [];

  for (const point of pointEvents) {
    // Skip in-progress points
    if (point.isInProgress) continue;

    const isTeam1Offense = point.offensiveTeam === 'team1';

    // Only track points with valid duration
    if (point.pointDurationMs !== undefined && point.pointDurationMs > 0) {
      allDurations.push(point.pointDurationMs);
      if (isTeam1Offense) {
        oDurations.push(point.pointDurationMs);
      } else {
        dDurations.push(point.pointDurationMs);
      }
    }
  }

  const hasTimingData = allDurations.length > 0;

  return {
    hasTimingData,
    avgPointDurationMs: hasTimingData
      ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length
      : 0,
    avgOPointDurationMs:
      oDurations.length > 0 ? oDurations.reduce((a, b) => a + b, 0) / oDurations.length : 0,
    avgDPointDurationMs:
      dDurations.length > 0 ? dDurations.reduce((a, b) => a + b, 0) / dDurations.length : 0,
    longestPointDurationMs: hasTimingData ? Math.max(...allDurations) : 0,
    shortestPointDurationMs: hasTimingData ? Math.min(...allDurations) : 0,
    timedPointCount: allDurations.length,
    timedOPointCount: oDurations.length,
    timedDPointCount: dDurations.length,
  };
}

// --- Time of Possession Stats ---

export interface TimeOfPossessionStats {
  hasTopData: boolean;
  team1TotalPossessionMs: number;
  team2TotalPossessionMs: number;
  /** 0–100 */
  team1PossessionPct: number;
  /** 0–100 */
  team2PossessionPct: number;
  /** Points included in the calculation */
  timedPointCount: number;
}

/**
 * Computes time-of-possession stats from game events.
 * Only counts points where every event has a valid elapsedMs.
 * Returns hasTopData=false if no qualifying points exist.
 */
export function computeTimeOfPossessionStats(
  events: GameEvent[],
  startingPossession: 'team1' | 'team2' | null,
  gameTo: number,
): TimeOfPossessionStats {
  const pointEvents = computePointByPointEvents(events, startingPossession, gameTo);

  let team1TotalMs = 0;
  let team2TotalMs = 0;
  let timedPointCount = 0;

  for (const point of pointEvents) {
    if (point.isInProgress) continue;

    // Need a valid goal elapsed time
    if (!point.goalElapsedMs) continue;

    // Every turnover must also have elapsedMs
    if (!point.turnovers.every((t) => t.elapsedMs !== undefined)) continue;

    let currentPossessor: 'team1' | 'team2' = point.offensiveTeam;
    let prevElapsedMs = 0;
    let team1PointMs = 0;
    let team2PointMs = 0;
    let validPoint = true;

    for (const turnover of point.turnovers) {
      const segment = turnover.elapsedMs! - prevElapsedMs;
      if (segment < 0) {
        validPoint = false;
        break;
      }
      if (currentPossessor === 'team1') {
        team1PointMs += segment;
      } else {
        team2PointMs += segment;
      }
      currentPossessor = currentPossessor === 'team1' ? 'team2' : 'team1';
      prevElapsedMs = turnover.elapsedMs!;
    }

    if (!validPoint) continue;

    // Final possession up to the goal
    const finalSegment = point.goalElapsedMs - prevElapsedMs;
    if (finalSegment < 0) continue; // goal timestamp before last turnover — skip

    if (currentPossessor === 'team1') {
      team1PointMs += finalSegment;
    } else {
      team2PointMs += finalSegment;
    }

    team1TotalMs += team1PointMs;
    team2TotalMs += team2PointMs;
    timedPointCount++;
  }

  const totalMs = team1TotalMs + team2TotalMs;
  const hasTopData = timedPointCount > 0;

  return {
    hasTopData,
    team1TotalPossessionMs: team1TotalMs,
    team2TotalPossessionMs: team2TotalMs,
    team1PossessionPct: totalMs > 0 ? (team1TotalMs / totalMs) * 100 : 50,
    team2PossessionPct: totalMs > 0 ? (team2TotalMs / totalMs) * 100 : 50,
    timedPointCount,
  };
}

/**
 * Aggregates multiple TimeOfPossessionStats by summing raw ms totals,
 * then recomputing percentages.
 */
export function aggregateTopStats(allStats: TimeOfPossessionStats[]): TimeOfPossessionStats {
  const statsWithData = allStats.filter((s) => s.hasTopData);

  if (statsWithData.length === 0) {
    return {
      hasTopData: false,
      team1TotalPossessionMs: 0,
      team2TotalPossessionMs: 0,
      team1PossessionPct: 50,
      team2PossessionPct: 50,
      timedPointCount: 0,
    };
  }

  const team1TotalMs = statsWithData.reduce((acc, s) => acc + s.team1TotalPossessionMs, 0);
  const team2TotalMs = statsWithData.reduce((acc, s) => acc + s.team2TotalPossessionMs, 0);
  const totalMs = team1TotalMs + team2TotalMs;
  const timedPointCount = statsWithData.reduce((acc, s) => acc + s.timedPointCount, 0);

  return {
    hasTopData: true,
    team1TotalPossessionMs: team1TotalMs,
    team2TotalPossessionMs: team2TotalMs,
    team1PossessionPct: totalMs > 0 ? (team1TotalMs / totalMs) * 100 : 50,
    team2PossessionPct: totalMs > 0 ? (team2TotalMs / totalMs) * 100 : 50,
    timedPointCount,
  };
}

/**
 * Aggregates multiple TimingStats into a combined TimingStats.
 * Durations are weighted by point count to get accurate averages.
 */
export function aggregateTimingStats(allStats: TimingStats[]): TimingStats {
  const statsWithData = allStats.filter((s) => s.hasTimingData);

  if (statsWithData.length === 0) {
    return {
      hasTimingData: false,
      avgPointDurationMs: 0,
      avgOPointDurationMs: 0,
      avgDPointDurationMs: 0,
      longestPointDurationMs: 0,
      shortestPointDurationMs: 0,
      timedPointCount: 0,
      timedOPointCount: 0,
      timedDPointCount: 0,
    };
  }

  const totalPoints = statsWithData.reduce((acc, s) => acc + s.timedPointCount, 0);
  const totalOPoints = statsWithData.reduce((acc, s) => acc + s.timedOPointCount, 0);
  const totalDPoints = statsWithData.reduce((acc, s) => acc + s.timedDPointCount, 0);

  // Weighted average: sum(avg * count) / totalCount
  const weightedAvgAll = statsWithData.reduce(
    (acc, s) => acc + s.avgPointDurationMs * s.timedPointCount,
    0,
  );
  const weightedAvgO = statsWithData.reduce(
    (acc, s) => acc + s.avgOPointDurationMs * s.timedOPointCount,
    0,
  );
  const weightedAvgD = statsWithData.reduce(
    (acc, s) => acc + s.avgDPointDurationMs * s.timedDPointCount,
    0,
  );

  return {
    hasTimingData: true,
    avgPointDurationMs: totalPoints > 0 ? weightedAvgAll / totalPoints : 0,
    avgOPointDurationMs: totalOPoints > 0 ? weightedAvgO / totalOPoints : 0,
    avgDPointDurationMs: totalDPoints > 0 ? weightedAvgD / totalDPoints : 0,
    longestPointDurationMs: Math.max(...statsWithData.map((s) => s.longestPointDurationMs)),
    shortestPointDurationMs: Math.min(...statsWithData.map((s) => s.shortestPointDurationMs)),
    timedPointCount: totalPoints,
    timedOPointCount: totalOPoints,
    timedDPointCount: totalDPoints,
  };
}
