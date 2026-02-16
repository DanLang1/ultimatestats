import { GameEvent, Player, PointLineRecord, SavedGame } from '@/lib/storage';
import { getPlayerName, UNKNOWN_PLAYER_ID } from './playerUtils';
import {
  computePlayingTimeStats,
  formatEfficiency,
  formatMinutesPlayed,
  PlayingTimeStats,
} from './playingTimeStatsUtils';
import {
  aggregateTeamStats,
  aggregateTimingStats,
  computeTeamStats,
  computeTimingStats,
  TeamStats,
  TimingStats,
} from './teamStatsUtils';
import { computePointByPointEvents } from './timelineUtils';

export interface PlayerStats {
  id: string; // Player ID (for lookups) - may be UNKNOWN_PLAYER_ID or OTHER_TEAM
  name: string; // Display name
  goals: number;
  assists: number;
  blocks: number;
  throwaways: number;
  drops: number;
  plusMinus: number;
  callahans: number;
}

/**
 * Compute player stats from events.
 * Stats are keyed by player ID to prevent collisions for players with the same name.
 * @param events - Game events
 * @param team - Which team's stats to compute
 * @param roster - Optional roster to resolve player IDs to names. If not provided, IDs are used as names.
 */
export function computePlayerStats(
  events: GameEvent[],
  team: 'team1' | 'team2',
  roster?: Player[],
): PlayerStats[] {
  // Key by player ID instead of name to prevent collisions
  const statsMap = new Map<string, PlayerStats>();

  // Helper to resolve playerId to name (falls back to ID if no roster or not found)
  const resolveName = (playerId: string | null) => getPlayerName(roster, playerId);

  const getOrCreate = (playerId: string): PlayerStats => {
    if (statsMap.has(playerId)) {
      return statsMap.get(playerId)!;
    }
    const stats: PlayerStats = {
      id: playerId,
      name: resolveName(playerId) ?? playerId,
      goals: 0,
      assists: 0,
      blocks: 0,
      throwaways: 0,
      drops: 0,
      plusMinus: 0,
      callahans: 0,
    };
    statsMap.set(playerId, stats);
    return stats;
  };

  for (const event of events) {
    if (event.type === 'goal') {
      if (event.team !== team) continue;

      // Treat null player IDs as UNKNOWN_PLAYER_ID (handles edge case where
      // user dismisses stat entry without selecting a player)
      const goalPlayerId = event.goalPlayerId ?? UNKNOWN_PLAYER_ID;
      const assistPlayerId = event.assistPlayerId;

      const stats = getOrCreate(goalPlayerId);
      stats.goals++;
      // Check for Callahan: assistPlayerId is 'OTHER_TEAM'
      if (assistPlayerId === 'OTHER_TEAM') {
        stats.callahans++;
      }

      // Don't count 'OTHER_TEAM' or null as an assist to any player
      if (assistPlayerId && assistPlayerId !== 'OTHER_TEAM') {
        const assistStats = getOrCreate(assistPlayerId);
        assistStats.assists++;
      }
    } else if (event.type === 'turnover') {
      if (event.team !== team) continue;

      // Handle fiftyfifty - player1 gets 0.5 throwaway, player2 gets 0.5 drop
      if (event.subtype === 'fiftyfifty') {
        if (event.playerId) {
          const stats = getOrCreate(event.playerId);
          stats.throwaways += 0.5; // Thrower gets half a throwaway
        }
        if (event.player2Id) {
          const stats = getOrCreate(event.player2Id);
          stats.drops += 0.5; // Receiver gets half a drop
        }
        continue;
      }

      if (!event.playerId) continue;

      const stats = getOrCreate(event.playerId);
      switch (event.subtype) {
        case 'block':
          stats.blocks++;
          break;
        case 'throwaway':
          stats.throwaways++;
          break;
        case 'drop':
          stats.drops++;
          break;
      }
    }
  }

  // Calculate plusMinus for each player
  for (const stats of statsMap.values()) {
    stats.plusMinus = stats.goals + stats.assists + stats.blocks - stats.throwaways - stats.drops;
  }

  // Sort by plusMinus descending, then by name
  return Array.from(statsMap.values()).sort(
    (a, b) => b.plusMinus - a.plusMinus || a.name.localeCompare(b.name),
  );
}

// --- Visualization Helpers ---

export interface ChemistryConnection {
  playerId: string; // Player ID for lookups
  playerName: string; // Display name
  goalsFrom: number; // How many goals did I catch from this person?
  assistsTo: number; // How many assists did I throw to this person?
  totalConnections: number;
}

/**
 * Get chemistry stats showing connections between players.
 * @param playerId - The player ID to analyze
 */
export function getChemistryStats(
  playerId: string,
  events: GameEvent[],
  team: 'team1' | 'team2',
  roster?: Player[],
): ChemistryConnection[] {
  // Key by player ID to prevent collisions
  const connections = new Map<
    string,
    { goalsFrom: number; assistsTo: number; totalConnections: number }
  >();

  const resolveName = (id: string | null) => getPlayerName(roster, id);

  const getOrCreate = (connPlayerId: string) => {
    if (!connections.has(connPlayerId)) {
      connections.set(connPlayerId, { goalsFrom: 0, assistsTo: 0, totalConnections: 0 });
    }
    return connections.get(connPlayerId)!;
  };

  for (const event of events) {
    if (event.type === 'goal' && event.team === team) {
      const goalPlayerId = event.goalPlayerId;
      const assistPlayerId = event.assistPlayerId;

      // Did I catch a goal? (player is the goal scorer, check if assist exists)
      if (goalPlayerId === playerId && assistPlayerId && assistPlayerId !== 'OTHER_TEAM') {
        const stats = getOrCreate(assistPlayerId);
        stats.goalsFrom++;
        stats.totalConnections++;
      }
      // Did I throw an assist? (player is the assister, check if goal scorer exists)
      if (assistPlayerId === playerId && goalPlayerId) {
        const stats = getOrCreate(goalPlayerId);
        stats.assistsTo++;
        stats.totalConnections++;
      }
    }
  }

  return Array.from(connections.entries())
    .map(([connId, stats]) => ({
      playerId: connId,
      playerName: resolveName(connId) ?? connId,
      ...stats,
    }))
    .sort((a, b) => b.totalConnections - a.totalConnections);
}

export interface ImpactPoint {
  eventIndex: number;
  cumulativePlusMinus: number;
  description?: string; // e.g. "Goal (+1)" or "Drop (-1)"
  score: string; // e.g. "0-0", "1-0", "3-2"
}

/**
 * Impact timelines always include a Start marker.
 * A game has player impact data if there is at least one stat event (length > 2)
 * or any non-zero cumulative impact value.
 */
export function hasImpactTimelineData(points: ImpactPoint[]): boolean {
  return points.some((point) => point.cumulativePlusMinus !== 0) || points.length > 2;
}

/**
 * Get impact timeline for a player showing cumulative +/- over the game.
 * @param playerId - The player ID to analyze
 */
export function getImpactStats(
  playerId: string,
  events: GameEvent[],
  team: 'team1' | 'team2',
  roster?: Player[],
): ImpactPoint[] {
  // Track score throughout the game
  let team1Score = 0;
  let team2Score = 0;
  const getScore = () => `${team1Score}-${team2Score}`;

  const points: ImpactPoint[] = [
    { eventIndex: 0, cumulativePlusMinus: 0, description: 'Start', score: '0-0' },
  ];
  let currentPlusMinus = 0;
  let eventIndex = 1; // Start at 1 so first event doesn't overlap with Start point

  for (const event of events) {
    // Track ALL goals for score (including opponent)
    if (event.type === 'goal') {
      if (event.team === 'team1') team1Score++;
      else team2Score++;
    }

    // Skip opponent events for impact calculation
    if (event.team !== team) {
      eventIndex++;
      continue;
    }

    let change = 0;
    let desc = '';

    if (event.type === 'goal') {
      // Check for Callahan: goal with 'OTHER_TEAM' assist AND same player got the block
      const isCallahan =
        event.goalPlayerId === playerId &&
        event.assistPlayerId === 'OTHER_TEAM' &&
        points.length > 1 &&
        points[points.length - 1].description?.includes('Block');

      if (isCallahan) {
        // Merge with the block - remove the block point and add a Callahan
        points.pop();
        currentPlusMinus -= 1; // Undo the block +1
        change = 2; // Callahan is worth +2 (block + goal)
        desc = 'Callahan (+2)';
      } else if (event.goalPlayerId === playerId) {
        change = 1;
        desc = 'Goal (+1)';
      } else if (event.assistPlayerId === playerId) {
        change = 1;
        desc = 'Assist (+1)';
      }
    } else if (event.type === 'turnover') {
      if (event.playerId === playerId) {
        if (event.subtype === 'block') {
          change = 1;
          desc = 'Block (+1)';
        } else if (event.subtype === 'fiftyfifty') {
          change = -0.5;
          desc = '50/50 Throw (-0.5)';
        } else {
          change = -1;
          desc = `${event.subtype.charAt(0).toUpperCase() + event.subtype.slice(1)} (-1)`;
        }
      } else if (event.player2Id === playerId && event.subtype === 'fiftyfifty') {
        change = -0.5;
        desc = '50/50 Drop (-0.5)';
      }
    }

    if (change !== 0) {
      currentPlusMinus += change;
      points.push({
        eventIndex,
        cumulativePlusMinus: currentPlusMinus,
        description: `${desc} (${change > 0 ? '+' : ''}${change})`,
        score: getScore(),
      });
    }
    eventIndex++;
  }

  // If no events, just return the start
  if (points.length === 1 && events.length > 0) {
    // Maybe add a point at the end so the graph spans the game?
    points.push({
      eventIndex,
      cumulativePlusMinus: 0,
      description: 'End',
      score: getScore(),
    });
  } else if (points.length > 1) {
    // Add an endpoint to show the final state sustained purely for visual length?
    // Actually, VictoryLine handles this fine.
    points.push({
      eventIndex,
      cumulativePlusMinus: currentPlusMinus,
      description: 'End',
      score: getScore(),
    });
  }

  return points;
}

export interface RoleStats {
  goals: number; // Normalized Goals (0-1)
  assists: number; // Normalized Assists (0-1)
  blocks: number; // Normalized Blocks (0-1)
  plusMinus: number; // Normalized +/- (0-1 where 0.5 = 0 +/-)
  turnovers: number; // Normalized Total Turnovers (0-1)
  throwaways: number; // Normalized Throwaways (0-1)
  drops: number; // Normalized Drops (0-1)
  rawDrops: number; // Raw drop count
  rawThrowaways: number; // Raw throwaway count
  totalEvents: number; // Raw count of total events
}

export type PlayerRoleLabel =
  | 'MVP'
  | 'Front Cone'
  | 'Reliable'
  | 'Hybrid'
  | 'Lockdown'
  | 'Shooter'
  | 'Glue Guy'
  | 'Butter Fingers'
  | 'Green Light'
  | null;

/**
 * Get role stats for radar chart visualization.
 * @param playerId - The player ID to analyze
 */
export function getRoleStats(
  playerId: string,
  events: GameEvent[],
  team: 'team1' | 'team2',
  roster?: Player[],
): RoleStats {
  const allPlayerStats = computePlayerStats(events, team, roster);

  // Find Team Maxes for normalization
  const maxGoals = Math.max(...allPlayerStats.map((p) => p.goals), 1);
  const maxAssists = Math.max(...allPlayerStats.map((p) => p.assists), 1);
  const maxBlocks = Math.max(...allPlayerStats.map((p) => p.blocks), 1);
  const maxThrowaways = Math.max(...allPlayerStats.map((p) => p.throwaways), 1);
  const maxDrops = Math.max(...allPlayerStats.map((p) => p.drops), 1);
  const maxTurns = Math.max(...allPlayerStats.map((p) => p.throwaways + p.drops), 1);
  const plusMinusValues = allPlayerStats.map((p) => p.plusMinus);
  const minPlusMinus = Math.min(...plusMinusValues, 0);
  const maxPlusMinus = Math.max(...plusMinusValues, 0);
  const plusMinusRange = Math.max(maxPlusMinus - minPlusMinus, 1);

  // Find by player ID instead of name
  const myStats = allPlayerStats.find((p) => p.id === playerId);

  if (!myStats) {
    return {
      goals: 0,
      assists: 0,
      blocks: 0,
      plusMinus: 0.5,
      turnovers: 0,
      throwaways: 0,
      drops: 0,
      rawDrops: 0,
      rawThrowaways: 0,
      totalEvents: 0,
    };
  }

  const myTurns = myStats.throwaways + myStats.drops;
  const totalEvents = myStats.goals + myStats.assists + myStats.blocks + myTurns;

  return {
    goals: myStats.goals / maxGoals,
    assists: myStats.assists / maxAssists,
    blocks: myStats.blocks / maxBlocks,
    plusMinus: (myStats.plusMinus - minPlusMinus) / plusMinusRange,
    turnovers: maxTurns === 0 ? 0 : myTurns / maxTurns,
    throwaways: myStats.throwaways / maxThrowaways,
    drops: myStats.drops / maxDrops,
    rawDrops: myStats.drops,
    rawThrowaways: myStats.throwaways,
    totalEvents,
  };
}

export function getPlayerRoleLabel(roleStats: RoleStats, isMVP = false): PlayerRoleLabel {
  const {
    goals,
    assists,
    blocks,
    plusMinus,
    throwaways,
    totalEvents,
    drops,
    rawDrops,
    rawThrowaways,
  } = roleStats;
  // Minimum threshold: need at least 2 events to get a label
  if (totalEvents < 2) return null;

  // MVP takes priority
  if (isMVP && plusMinus > 0.5) {
    return 'MVP';
  }

  // Priority order matters - check more specific conditions first

  // Shooter: High assists but high throwaways (risky handler)
  if (assists >= 0.5 && throwaways >= 0.5) {
    return 'Shooter';
  }

  // D-Liner: Has blocks
  if (blocks >= 0.6) {
    return 'Lockdown';
  }

  // Goal Getter: High goals, low assists
  if (goals >= 0.7 && assists < 0.2 && drops < 0.2) {
    return 'Front Cone';
  }

  // Handler: High assists, low goals
  if (assists >= 0.6 && throwaways < 0.2) {
    return 'Reliable';
  }

  // Hybrid: Has both goals and assists
  if (goals >= 0.5 && assists >= 0.5) {
    return 'Hybrid';
  }

  // Glue Guy: Positive impact but quiet stats
  if (plusMinus >= 0.75 && goals < 0.5 && assists < 0.5 && blocks < 0.5) {
    return 'Glue Guy';
  }

  if (drops === 1 && rawDrops > 2) {
    return 'Butter Fingers';
  }
  if (throwaways === 1 && rawThrowaways > 2) {
    return 'Green Light';
  }

  return null;
}

/**
 * Generate CSV for the current (live) game.
 * Note: Team stats require startingPossession and gameTo from the store.
 */
export function generateCurrentGameCSV(
  events: GameEvent[],
  team1Name: string,
  team2Name: string,
  startingPossession: 'team1' | 'team2' | null,
  gameTo: number,
  roster?: Player[],
  pointLines?: PointLineRecord[],
): string {
  const playerStats = computePlayerStats(events, 'team1', roster);
  const playingTimeStats = pointLines?.length
    ? computePlayingTimeStats(pointLines, events, startingPossession, gameTo)
    : null;
  const playerRows = mergePlayerRows(playerStats, playingTimeStats, roster);

  let csv = '# Play-by-Play\n';
  csv += playByPlayCSV(events, team1Name, team2Name, startingPossession, gameTo, roster);

  csv += '\n\n# Turnovers\n';
  csv += turnoversCSV(events, team1Name, team2Name, roster);

  csv += '\n\n# Player Summary\n';
  csv += playerSummaryCSV(playerRows, playingTimeStats !== null && playingTimeStats.size > 0);

  csv += '\n\n# Team Stats\n';
  csv += teamStatsCSV(computeTeamStats(events, startingPossession, gameTo));
  csv += timingStatsCSV(computeTimingStats(events, startingPossession, gameTo));

  return csv;
}

/**
 * Generate CSV for a single saved game.
 */
export function generateSavedGameCSV(game: SavedGame): string {
  const playerStats = computePlayerStats(game.events, 'team1', game.team1.roster);
  const playingTimeStats = game.pointLines?.length
    ? computePlayingTimeStats(game.pointLines, game.events, game.startingPossession, game.gameTo)
    : null;
  const playerRows = mergePlayerRows(playerStats, playingTimeStats, game.team1.roster);

  let csv = `# Game: ${game.team1.name} vs ${game.team2Name} - ${formatDateForCSV(game.createdAt)}\n`;

  csv += '\n# Play-by-Play\n';
  csv += playByPlayCSV(
    game.events,
    game.team1.name,
    game.team2Name,
    game.startingPossession,
    game.gameTo,
    game.team1.roster,
  );

  csv += '\n\n# Turnovers\n';
  csv += turnoversCSV(game.events, game.team1.name, game.team2Name, game.team1.roster);

  csv += '\n\n# Player Summary\n';
  csv += playerSummaryCSV(playerRows, playingTimeStats !== null && playingTimeStats.size > 0);

  csv += '\n\n# Team Stats\n';
  csv += teamStatsCSV(computeTeamStats(game.events, game.startingPossession, game.gameTo));
  csv += timingStatsCSV(computeTimingStats(game.events, game.startingPossession, game.gameTo));

  return csv;
}

/**
 * Generate CSV for aggregated stats across multiple saved games.
 */
export function generateAggregateCSV(
  games: SavedGame[],
  teamName: string,
  roster?: Player[],
): string {
  const mergedEvents = games.flatMap((g) => g.events);
  const playerStats = computePlayerStats(mergedEvents, 'team1', roster);
  const playingTimeStats = aggregatePlayingTimeStatsByPlayer(games);
  const playerRows = mergePlayerRows(playerStats, playingTimeStats, roster);

  let csv = `# Aggregated Stats: ${teamName} (${games.length} games)\n`;

  // Section 1: Combined Team Stats
  csv += '\n# Combined Team Stats\n';
  csv += teamStatsCSV(
    aggregateTeamStats(
      games.map((g) => computeTeamStats(g.events, g.startingPossession, g.gameTo)),
    ),
  );
  csv += timingStatsCSV(
    aggregateTimingStats(
      games.map((g) => computeTimingStats(g.events, g.startingPossession, g.gameTo)),
    ),
  );

  // Section 2: Combined Player Summary
  csv += '\n\n# Combined Player Summary\n';
  csv += playerSummaryCSV(playerRows, playingTimeStats.size > 0);

  // Section 3: Game Log
  csv += '\n\n# Game Log\n';
  csv += 'Date,Opponent,Result,Score,Our Score,Their Score\n';
  csv += games
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((g) => {
      const date = formatDateForCSV(g.createdAt);
      const win = g.team1Score > g.team2Score;
      const result = win ? 'Win' : 'Loss';
      return `${date},${g.team2Name},${result},${g.team1Score}-${g.team2Score},${g.team1Score},${g.team2Score}`;
    })
    .join('\n');

  // Section 4: Individual Games
  csv += '\n\n# Individual Game Details';
  for (const game of games) {
    csv += `\n\nGame: vs ${game.team2Name} - ${formatDateForCSV(game.createdAt)}`;

    csv += '\n\n# Team Stats\n';
    csv += teamStatsCSV(computeTeamStats(game.events, game.startingPossession, game.gameTo));
    csv += timingStatsCSV(computeTimingStats(game.events, game.startingPossession, game.gameTo));

    csv += '\n\n# Player Summary\n';
    const perGamePlayerStats = computePlayerStats(game.events, 'team1', game.team1.roster);
    const perGamePlayingTimeStats = game.pointLines?.length
      ? computePlayingTimeStats(game.pointLines, game.events, game.startingPossession, game.gameTo)
      : null;
    const perGameRows = mergePlayerRows(
      perGamePlayerStats,
      perGamePlayingTimeStats,
      game.team1.roster,
    );
    csv += playerSummaryCSV(
      perGameRows,
      perGamePlayingTimeStats !== null && perGamePlayingTimeStats.size > 0,
    );

    csv += '\n\n# Play-by-Play\n';
    csv += playByPlayCSV(
      game.events,
      game.team1.name,
      game.team2Name,
      game.startingPossession,
      game.gameTo,
      game.team1.roster,
    );

    csv += '\n\n# Turnovers\n';
    csv += turnoversCSV(game.events, game.team1.name, game.team2Name, game.team1.roster);
  }

  return csv;
}

// --- CSV Helper Functions ---

interface PlayerSummaryCSVRow extends PlayerStats {
  pointsPlayed?: number;
  oPoints?: number;
  dPoints?: number;
  oLineHolds?: number;
  dLineBreaks?: number;
  minutesPlayed?: number;
  oEfficiency?: number;
  dEfficiency?: number;
}

interface AggregatedPlayingTimeCSVRow {
  pointsPlayed: number;
  oPoints: number;
  dPoints: number;
  oLineHolds: number;
  dLineBreaks: number;
  minutesPlayed?: number;
}

type PlayingTimeStatsForCSV = Pick<
  PlayingTimeStats,
  'pointsPlayed' | 'oPoints' | 'dPoints' | 'oLineHolds' | 'dLineBreaks' | 'minutesPlayed'
>;

function mergePlayerRows(
  playerStats: PlayerStats[],
  playingTimeStats: Map<string, PlayingTimeStatsForCSV> | null,
  roster?: Player[],
): PlayerSummaryCSVRow[] {
  const rowsById = new Map<string, PlayerSummaryCSVRow>();

  for (const stats of playerStats) {
    rowsById.set(stats.id, { ...stats });
  }

  if (playingTimeStats) {
    for (const [playerId, pt] of playingTimeStats.entries()) {
      const existing = rowsById.get(playerId);
      const oEfficiency = pt.oPoints > 0 ? pt.oLineHolds / pt.oPoints : undefined;
      const dEfficiency = pt.dPoints > 0 ? pt.dLineBreaks / pt.dPoints : undefined;
      if (existing) {
        existing.pointsPlayed = pt.pointsPlayed;
        existing.oPoints = pt.oPoints;
        existing.dPoints = pt.dPoints;
        existing.oLineHolds = pt.oLineHolds;
        existing.dLineBreaks = pt.dLineBreaks;
        existing.minutesPlayed = pt.minutesPlayed;
        existing.oEfficiency = oEfficiency;
        existing.dEfficiency = dEfficiency;
        continue;
      }

      rowsById.set(playerId, {
        id: playerId,
        name: getPlayerName(roster, playerId) ?? playerId,
        goals: 0,
        assists: 0,
        blocks: 0,
        throwaways: 0,
        drops: 0,
        plusMinus: 0,
        callahans: 0,
        pointsPlayed: pt.pointsPlayed,
        oPoints: pt.oPoints,
        dPoints: pt.dPoints,
        oLineHolds: pt.oLineHolds,
        dLineBreaks: pt.dLineBreaks,
        minutesPlayed: pt.minutesPlayed,
        oEfficiency,
        dEfficiency,
      });
    }
  }

  return Array.from(rowsById.values()).sort(
    (a, b) => b.plusMinus - a.plusMinus || a.name.localeCompare(b.name),
  );
}

function aggregatePlayingTimeStatsByPlayer(
  games: SavedGame[],
): Map<string, AggregatedPlayingTimeCSVRow> {
  const totals = new Map<string, AggregatedPlayingTimeCSVRow>();

  for (const game of games) {
    if (!game.pointLines?.length) continue;
    const perGame = computePlayingTimeStats(
      game.pointLines,
      game.events,
      game.startingPossession,
      game.gameTo,
      game.pointStartTimestamps,
    );

    for (const [playerId, stats] of perGame.entries()) {
      const existing = totals.get(playerId);
      if (existing) {
        existing.pointsPlayed += stats.pointsPlayed;
        existing.oPoints += stats.oPoints;
        existing.dPoints += stats.dPoints;
        existing.oLineHolds += stats.oLineHolds;
        existing.dLineBreaks += stats.dLineBreaks;
        if (stats.minutesPlayed !== undefined) {
          existing.minutesPlayed = (existing.minutesPlayed ?? 0) + stats.minutesPlayed;
        }
      } else {
        totals.set(playerId, {
          pointsPlayed: stats.pointsPlayed,
          oPoints: stats.oPoints,
          dPoints: stats.dPoints,
          oLineHolds: stats.oLineHolds,
          dLineBreaks: stats.dLineBreaks,
          minutesPlayed: stats.minutesPlayed,
        });
      }
    }
  }

  return totals;
}

function playerSummaryCSV(stats: PlayerSummaryCSVRow[], includePlayingTimeStats = false): string {
  const hasCallahans = stats.some((p) => p.callahans > 0);
  const headerBase = hasCallahans
    ? 'Player,Goals,Assists,Blocks,Throwaways,Drops,Callahans,Plus/Minus'
    : 'Player,Goals,Assists,Blocks,Throwaways,Drops,Plus/Minus';
  const header = includePlayingTimeStats
    ? `${headerBase},Points Played,O-Points,D-Points,O-Line Holds,D-Line Breaks,Minutes Played,O-Eff,D-Eff`
    : headerBase;

  const rows = stats.map((p) => {
    const rowBase = hasCallahans
      ? `${p.name},${p.goals},${p.assists},${p.blocks},${p.throwaways},${p.drops},${p.callahans},${p.plusMinus}`
      : `${p.name},${p.goals},${p.assists},${p.blocks},${p.throwaways},${p.drops},${p.plusMinus}`;
    if (!includePlayingTimeStats) {
      return rowBase;
    }

    const pointsPlayed = p.pointsPlayed ?? 0;
    const oPoints = p.oPoints ?? 0;
    const dPoints = p.dPoints ?? 0;
    const oLineHolds = p.oLineHolds ?? 0;
    const dLineBreaks = p.dLineBreaks ?? 0;
    const minutesPlayed = formatMinutesPlayed(p.minutesPlayed);
    const oEff = p.oEfficiency !== undefined ? formatEfficiency(p.oEfficiency) : '-';
    const dEff = p.dEfficiency !== undefined ? formatEfficiency(p.dEfficiency) : '-';
    return `${rowBase},${pointsPlayed},${oPoints},${dPoints},${oLineHolds},${dLineBreaks},${minutesPlayed},${oEff},${dEff}`;
  });

  return header + '\n' + rows.join('\n');
}

function teamStatsCSV(stats: TeamStats): string {
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const formatDecimal = (value: number) =>
    Number.isInteger(value) ? value.toString() : value.toFixed(2);

  return (
    'Stat,Value,Detail\n' +
    `Hold %,${formatPercent(stats.holdPercentage)},${stats.holds}/${stats.offensivePoints} O-points\n` +
    `Break Efficiency,${formatPercent(stats.breakEfficiency)},${stats.breaks}/${stats.dPointsWithTurnover} D-points with turnover\n` +
    `D-Efficiency,${formatPercent(stats.dEfficiency)},${stats.breaks}/${stats.defensivePoints} D-points\n` +
    `Conversion Rate,${formatPercent(stats.conversionRate)},Goals / Possessions\n` +
    `Clean Holds,${stats.cleanHolds},\n` +
    `Dirty Holds,${stats.dirtyHolds},\n` +
    `Total Breaks,${stats.breaks},\n` +
    `Times Broken,${stats.timesBroken},\n` +
    `Offensive Points,${stats.offensivePoints},\n` +
    `Defensive Points,${stats.defensivePoints},\n` +
    `Total Turnovers,${stats.totalTurnovers},Our turnovers\n` +
    `Opponent Turnovers,${stats.opponentTurnovers},Gives us possession\n` +
    `Turnovers per Point,${formatDecimal(stats.turnoversPerPoint)},\n` +
    `Points per Turnover,${formatDecimal(stats.pointsPerTurnover)},\n` +
    `Blocks per D-Point,${formatDecimal(stats.blocksPerDPoint)},\n` +
    `Total Blocks,${stats.totalBlocks},\n` +
    `Longest Scoring Run,${stats.longestScoringRun},\n` +
    `Longest Drought,${stats.longestDrought},`
  );
}

function timingStatsCSV(stats: TimingStats): string {
  if (!stats.hasTimingData) {
    return '';
  }

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    '\n# Timing Stats\n' +
    'Stat,Value,Detail\n' +
    `Avg Point Duration,${formatDuration(stats.avgPointDurationMs)},${stats.timedPointCount} points\n` +
    `Avg O-Point Duration,${formatDuration(stats.avgOPointDurationMs)},${stats.timedOPointCount} O-points\n` +
    `Avg D-Point Duration,${formatDuration(stats.avgDPointDurationMs)},${stats.timedDPointCount} D-points\n` +
    `Longest Point,${formatDuration(stats.longestPointDurationMs)},\n` +
    `Shortest Point,${formatDuration(stats.shortestPointDurationMs)},`
  );
}

function formatDurationForCSV(ms: number | undefined): string {
  if (ms === undefined || ms === 0) return '';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function playByPlayCSV(
  events: GameEvent[],
  team1Name: string,
  team2Name: string,
  startingPossession: 'team1' | 'team2' | null,
  gameTo: number,
  roster?: Player[],
): string {
  const points = computePointByPointEvents(events, startingPossession, gameTo);
  let csv = 'Point Number,Curr Score,Pulling Team,Goal Team,Goal,Assist,Duration\n';

  const resolveName = (playerId: string | null) => getPlayerName(roster, playerId);

  for (const point of points) {
    if (point.isInProgress) continue;

    const pointIdx = points.indexOf(point);
    const scoreBefore =
      pointIdx === 0
        ? '0-0'
        : `${points[pointIdx - 1].scoreAfter.team1}-${points[pointIdx - 1].scoreAfter.team2}`;

    const pullingTeam = point.offensiveTeam === 'team1' ? team2Name : team1Name;
    const goalTeamName = point.scoringTeam === 'team1' ? team1Name : team2Name;
    const goalName = resolveName(point.goalPlayerId);
    const assistName = resolveName(point.assistPlayerId);

    csv += `${point.pointNumber},${scoreBefore},${pullingTeam},${goalTeamName},${goalName || ''},${assistName || ''},${formatDurationForCSV(point.pointDurationMs)}\n`;
  }

  return csv.trimEnd();
}

function turnoversCSV(
  events: GameEvent[],
  team1Name: string,
  team2Name: string,
  roster?: Player[],
): string {
  let csv = 'Team,Type,Player,Player2,Timestamp\n';

  const resolveName = (playerId: string | null) => getPlayerName(roster, playerId);

  for (const event of events) {
    if (event.type === 'turnover') {
      const teamName = event.team === 'team1' ? team1Name : team2Name;
      const p1Name = resolveName(event.playerId);
      const p2Name = resolveName(event.player2Id || null);
      csv += `${teamName},${event.subtype},${p1Name || ''},${p2Name || ''},${formatDurationForCSV(event.elapsedMs)}\n`;
    }
  }

  return csv.trimEnd();
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// CSV-safe date format (no commas or special chars)
export function formatDateForCSV(timestamp: number): string {
  const date = new Date(timestamp);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
