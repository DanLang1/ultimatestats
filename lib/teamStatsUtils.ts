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

    // D-point specific stats
    if (!isTeam1Offense) {
      if (opponentTurnoversThisPoint > 0 || team1Scored) {
        dPointsWithTurnover++;
      }

      // Count blocks team1 got
      const blocksThisPoint = point.turnovers.filter(
        (t) => t.team === 'team1' && t.type === 'block',
      ).length;
      team1Blocks += blocksThisPoint;
    }

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
