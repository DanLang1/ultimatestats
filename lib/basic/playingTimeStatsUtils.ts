import { GameEvent, PointLineRecord, SavedGame } from '@/lib/storage';
import { getAllPlayersByPoint } from '../lineUtils';
import { computePointByPointEvents } from './timelineUtils';

export { formatEfficiency } from '../efficiencyFormatUtils';

/**
 * Playing time-based statistics for a player
 */
export interface PlayingTimeStats {
  pointsPlayed: number;
  oPoints: number; // Points where team received pull
  dPoints: number; // Points where team pulled
  oEfficiency: number; // Hold rate: oLineHolds / oPoints (0.0 to 1.0)
  dEfficiency: number; // Break rate: dLineBreaks / dPoints (0.0 to 1.0)
  pointWins: number; // Points where team scored while player was on field
  pointLosses: number; // Points where opponent scored while player was on field
  oLineHolds: number;
  oLineBreaksAgainst: number;
  dLineBreaks: number;
  dLineHoldsAgainst: number;
  // Timing stats (optional - only if point timer was enabled)
  minutesPlayed?: number;
  avgPointDurationMs?: number;
  playingTimePercent?: number;
}

export interface ComputePlayingTimeStatsOptions {
  pointStartTimestamps?: Record<number, number>;
  autoHalftimeEnabled?: boolean;
}

/**
 * Compute playing time-based stats for all players
 * Returns a map from player ID to their PlayingTimeStats
 */
export function computePlayingTimeStats(
  pointLines: PointLineRecord[],
  events: GameEvent[],
  startingPossession: 'team1' | 'team2' | null,
  gameTo: number,
  options: ComputePlayingTimeStatsOptions = {},
): Map<string, PlayingTimeStats> {
  const { pointStartTimestamps, autoHalftimeEnabled = true } = options;

  // Key by player ID instead of name
  const statsMap = new Map<string, PlayingTimeStats>();

  // If no point lines, return empty stats
  if (!pointLines || pointLines.length === 0) {
    return statsMap;
  }

  // Get all players who appeared in each point (including mid-point subs)
  const finalLines = getAllPlayersByPoint(pointLines);

  // Compute point-by-point events to determine O-line/D-line and outcomes
  const pointEvents = computePointByPointEvents(
    events,
    startingPossession,
    gameTo,
    pointStartTimestamps,
    undefined,
    autoHalftimeEnabled,
  );

  // Helper to get or create stats for a player by ID
  const getOrCreate = (playerId: string): PlayingTimeStats => {
    if (!statsMap.has(playerId)) {
      statsMap.set(playerId, createEmptyStats());
    }
    return statsMap.get(playerId)!;
  };

  // Process each completed point
  for (const point of pointEvents) {
    // Skip in-progress points
    if (point.isInProgress) continue;

    const lineForPoint = finalLines.get(point.pointNumber);
    if (!lineForPoint) continue;

    // Determine if this was O-line or D-line for team1 (our team)
    const isOLine = point.offensiveTeam === 'team1';
    const team1Scored = point.scoringTeam === 'team1';

    // For each player on the field at point end
    for (const playerId of lineForPoint) {
      const stats = getOrCreate(playerId);
      if (!stats) continue;

      stats.pointsPlayed++;

      if (isOLine) {
        stats.oPoints++;
        if (team1Scored) {
          // O-line hold
          stats.pointWins++;
          stats.oLineHolds++;
        } else {
          // O-line break against (we got broken)
          stats.pointLosses++;
          stats.oLineBreaksAgainst++;
        }
      } else {
        stats.dPoints++;
        if (team1Scored) {
          // D-line break (we broke them)
          stats.pointWins++;
          stats.dLineBreaks++;
        } else {
          // D-line hold against (they held)
          stats.pointLosses++;
          stats.dLineHoldsAgainst++;
        }
      }

      // Timing stats
      if (point.pointDurationMs !== undefined && point.pointDurationMs > 0) {
        stats.minutesPlayed = (stats.minutesPlayed ?? 0) + point.pointDurationMs / 60000;
        // Track for average calculation
        const existingDurations = stats.avgPointDurationMs ?? 0;
        const existingCount = stats.pointsPlayed - 1;
        stats.avgPointDurationMs =
          (existingDurations * existingCount + point.pointDurationMs) / stats.pointsPlayed;
      }
    }
  }

  // Calculate playing time percent and efficiency rates
  const completedPoints = pointEvents.filter((p) => !p.isInProgress).length;
  if (completedPoints > 0) {
    for (const stats of statsMap.values()) {
      stats.playingTimePercent = (stats.pointsPlayed / completedPoints) * 100;
      // Calculate efficiency rates
      stats.oEfficiency = stats.oPoints > 0 ? stats.oLineHolds / stats.oPoints : 0;
      stats.dEfficiency = stats.dPoints > 0 ? stats.dLineBreaks / stats.dPoints : 0;
    }
  }

  return statsMap;
}

/**
 * Aggregate playing-time statistics across multiple saved games.
 * Each game is computed independently first so point numbers restarting at 1
 * do not collide when combining line data.
 */
export function aggregatePlayingTimeStats(games: SavedGame[]): Map<string, PlayingTimeStats> {
  const totals = new Map<string, PlayingTimeStats>();
  const timedDurationsByPlayer = new Map<
    string,
    { totalDurationMs: number; timedPoints: number }
  >();
  let completedTrackedPoints = 0;

  const getOrCreate = (playerId: string): PlayingTimeStats => {
    if (!totals.has(playerId)) {
      totals.set(playerId, createEmptyStats());
    }
    return totals.get(playerId)!;
  };

  for (const game of games) {
    if (!game.pointLines?.length) {
      continue;
    }

    completedTrackedPoints += game.events.filter((event) => event.type === 'goal').length;

    const perGame = computePlayingTimeStats(
      game.pointLines,
      game.events,
      game.startingPossession,
      game.gameTo,
      {
        pointStartTimestamps: game.pointStartTimestamps,
        autoHalftimeEnabled: game.autoHalftimeEnabled ?? true,
      },
    );

    for (const [playerId, stats] of perGame.entries()) {
      const existing = getOrCreate(playerId);

      existing.pointsPlayed += stats.pointsPlayed;
      existing.oPoints += stats.oPoints;
      existing.dPoints += stats.dPoints;
      existing.pointWins += stats.pointWins;
      existing.pointLosses += stats.pointLosses;
      existing.oLineHolds += stats.oLineHolds;
      existing.oLineBreaksAgainst += stats.oLineBreaksAgainst;
      existing.dLineBreaks += stats.dLineBreaks;
      existing.dLineHoldsAgainst += stats.dLineHoldsAgainst;

      if (stats.minutesPlayed !== undefined) {
        existing.minutesPlayed = (existing.minutesPlayed ?? 0) + stats.minutesPlayed;
      }

      if (stats.avgPointDurationMs !== undefined && stats.avgPointDurationMs > 0) {
        const durationTotals = timedDurationsByPlayer.get(playerId) ?? {
          totalDurationMs: 0,
          timedPoints: 0,
        };
        durationTotals.totalDurationMs += stats.avgPointDurationMs * stats.pointsPlayed;
        durationTotals.timedPoints += stats.pointsPlayed;
        timedDurationsByPlayer.set(playerId, durationTotals);
      }
    }
  }

  for (const [playerId, stats] of totals.entries()) {
    stats.playingTimePercent =
      completedTrackedPoints > 0 ? (stats.pointsPlayed / completedTrackedPoints) * 100 : 0;
    stats.oEfficiency = stats.oPoints > 0 ? stats.oLineHolds / stats.oPoints : 0;
    stats.dEfficiency = stats.dPoints > 0 ? stats.dLineBreaks / stats.dPoints : 0;

    const durationTotals = timedDurationsByPlayer.get(playerId);
    if (durationTotals && durationTotals.timedPoints > 0) {
      stats.avgPointDurationMs = durationTotals.totalDurationMs / durationTotals.timedPoints;
    }
  }

  return totals;
}

/**
 * Create empty PlayingTimeStats object
 */
function createEmptyStats(): PlayingTimeStats {
  return {
    pointsPlayed: 0,
    oPoints: 0,
    dPoints: 0,
    oEfficiency: 0,
    dEfficiency: 0,
    pointWins: 0,
    pointLosses: 0,
    oLineHolds: 0,
    oLineBreaksAgainst: 0,
    dLineBreaks: 0,
    dLineHoldsAgainst: 0,
  };
}

/**
 * Compute per-point stats (goals, assists, blocks, turnovers, throwaways, drops per point played)
 */
export function computePerPointStats(
  pointsPlayed: number,
  goals: number,
  assists: number,
  blocks: number,
  turnovers: number,
  throwaways: number,
  drops: number,
): {
  goalsPerPoint: number;
  assistsPerPoint: number;
  blocksPerPoint: number;
  turnoversPerPoint: number;
  throwawaysPerPoint: number;
  dropsPerPoint: number;
} {
  if (pointsPlayed === 0) {
    return {
      goalsPerPoint: 0,
      assistsPerPoint: 0,
      blocksPerPoint: 0,
      turnoversPerPoint: 0,
      throwawaysPerPoint: 0,
      dropsPerPoint: 0,
    };
  }
  return {
    goalsPerPoint: goals / pointsPlayed,
    assistsPerPoint: assists / pointsPlayed,
    blocksPerPoint: blocks / pointsPlayed,
    turnoversPerPoint: turnovers / pointsPlayed,
    throwawaysPerPoint: throwaways / pointsPlayed,
    dropsPerPoint: drops / pointsPlayed,
  };
}

/**
 * Calculate win rates and hold/break rates from PlayingTimeStats
 */
export function computeRates(stats: PlayingTimeStats): {
  pointWinRate: number;
} {
  const pointWinRate = stats.pointsPlayed > 0 ? (stats.pointWins / stats.pointsPlayed) * 100 : 0;

  return { pointWinRate };
}

/**
 * Format minutes played for display
 */
export function formatMinutesPlayed(minutes: number | undefined): string {
  if (minutes === undefined || minutes === 0) return '-';
  const totalSeconds = Math.round(minutes * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
