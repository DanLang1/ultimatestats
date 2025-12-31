import { GameEvent, SavedGame } from '@/lib/storage';
import { computeTeamStats, TeamStats } from './teamStatsUtils';

export interface PlayerStats {
  name: string;
  goals: number;
  assists: number;
  blocks: number;
  throwaways: number;
  drops: number;
  plusMinus: number;
}

export function computePlayerStats(events: GameEvent[], team: 'team1' | 'team2'): PlayerStats[] {
  const statsMap = new Map<string, PlayerStats>();

  const getOrCreate = (name: string): PlayerStats =>
    statsMap.get(name) || {
      name,
      goals: 0,
      assists: 0,
      blocks: 0,
      throwaways: 0,
      drops: 0,
      plusMinus: 0,
    };

  for (const event of events) {
    if (event.type === 'goal') {
      if (event.team !== team) continue;

      if (event.goal) {
        const stats = getOrCreate(event.goal);
        stats.goals++;
        statsMap.set(event.goal, stats);
      }

      if (event.assist) {
        const stats = getOrCreate(event.assist);
        stats.assists++;
        statsMap.set(event.assist, stats);
      }
    } else if (event.type === 'turnover') {
      if (event.team !== team) continue;

      // Handle fiftyfifty - player1 gets 0.5 throwaway, player2 gets 0.5 drop
      if (event.subtype === 'fiftyfifty') {
        if (event.player) {
          const stats = getOrCreate(event.player);
          stats.throwaways += 0.5; // Thrower gets half a throwaway
          statsMap.set(event.player, stats);
        }
        if (event.player2) {
          const stats = getOrCreate(event.player2);
          stats.drops += 0.5; // Receiver gets half a drop
          statsMap.set(event.player2, stats);
        }
        continue;
      }

      if (!event.player) continue;

      const stats = getOrCreate(event.player);
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
      statsMap.set(event.player, stats);
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
): string {
  const playerStats = computePlayerStats(events, 'team1');

  let csv = '# Play-by-Play\n';
  csv += playByPlayCSV(events, team1Name, team2Name);

  csv += '\n\n# Turnovers\n';
  csv += turnoversCSV(events, team1Name, team2Name);

  csv += '\n\n# Player Summary\n';
  csv += playerSummaryCSV(playerStats);

  csv += '\n\n# Team Stats\n';
  csv += teamStatsCSV(computeTeamStats(events, startingPossession, gameTo));

  return csv;
}

/**
 * Generate CSV for a single saved game.
 */
export function generateSavedGameCSV(game: SavedGame): string {
  const playerStats = computePlayerStats(game.events, 'team1');

  let csv = `# Game: ${game.team1Name} vs ${game.team2Name} - ${formatDateForCSV(game.createdAt)}\n`;

  csv += '\n# Play-by-Play\n';
  csv += playByPlayCSV(game.events, game.team1Name, game.team2Name);

  csv += '\n\n# Turnovers\n';
  csv += turnoversCSV(game.events, game.team1Name, game.team2Name);

  csv += '\n\n# Player Summary\n';
  csv += playerSummaryCSV(playerStats);

  csv += '\n\n# Team Stats\n';
  csv += teamStatsCSV(computeTeamStats(game.events, game.startingPossession, game.gameTo));

  return csv;
}

/**
 * Generate CSV for aggregated stats across multiple saved games.
 */
export function generateAggregateCSV(games: SavedGame[], teamName: string): string {
  const mergedEvents = games.flatMap((g) => g.events);
  const playerStats = computePlayerStats(mergedEvents, 'team1');

  let csv = `# Aggregated Stats: ${teamName} (${games.length} games)\n`;

  // Section 1: Combined Team Stats
  csv += '\n# Combined Team Stats\n';
  csv += teamStatsCSV(aggregateTeamStats(games));

  // Section 2: Combined Player Summary
  csv += '\n\n# Combined Player Summary\n';
  csv += playerSummaryCSV(playerStats);

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

    csv += '\n\n# Player Summary\n';
    csv += playerSummaryCSV(computePlayerStats(game.events, 'team1'));

    csv += '\n\n# Play-by-Play\n';
    csv += playByPlayCSV(game.events, game.team1Name, game.team2Name);

    csv += '\n\n# Turnovers\n';
    csv += turnoversCSV(game.events, game.team1Name, game.team2Name);
  }

  return csv;
}

/**
 * Aggregates team stats from multiple games by summing individual game stats.
 * This properly handles different gameTo values per game.
 */
function aggregateTeamStats(games: SavedGame[]): TeamStats {
  const allStats = games.map((g) => computeTeamStats(g.events, g.startingPossession, g.gameTo));

  const sum = (key: keyof TeamStats) => allStats.reduce((acc, s) => acc + s[key], 0);

  const offensivePoints = sum('offensivePoints');
  const defensivePoints = sum('defensivePoints');
  const holds = sum('holds');
  const breaks = sum('breaks');
  const dPointsWithTurnover = sum('dPointsWithTurnover');
  const totalTurnovers = sum('totalTurnovers');
  const opponentTurnovers = sum('opponentTurnovers');

  // Recalculate percentages from sums
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

// --- CSV Helper Functions ---

function playerSummaryCSV(stats: PlayerStats[]): string {
  return (
    'Player,Goals,Assists,Blocks,Throwaways,Drops,Plus/Minus\n' +
    stats
      .map(
        (p) =>
          `${p.name},${p.goals},${p.assists},${p.blocks},${p.throwaways},${p.drops},${p.plusMinus}`,
      )
      .join('\n')
  );
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

function playByPlayCSV(events: GameEvent[], team1Name: string, team2Name: string): string {
  let csv = 'Point Number,Team,Goal,Assist\n';
  let pointNumber = 0;

  for (const event of events) {
    if (event.type === 'goal') {
      pointNumber++;
      const teamName = event.team === 'team1' ? team1Name : team2Name;
      csv += `${pointNumber},${teamName},${event.goal || ''},${event.assist || ''}\n`;
    }
  }

  return csv.trimEnd();
}

function turnoversCSV(events: GameEvent[], team1Name: string, team2Name: string): string {
  let csv = 'Team,Type,Player,Player2\n';

  for (const event of events) {
    if (event.type === 'turnover') {
      const teamName = event.team === 'team1' ? team1Name : team2Name;
      csv += `${teamName},${event.subtype},${event.player || ''},${event.player2 || ''}\n`;
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
