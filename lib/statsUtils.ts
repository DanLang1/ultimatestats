import { SavedGame } from '@/lib/storage';
import { StatRecord, TurnoverRecord } from '@/store/gameStore';

export interface PlayerStats {
  name: string;
  goals: number;
  assists: number;
  blocks: number;
  throwaways: number;
  drops: number;
  plusMinus: number;
}

export function computePlayerStats(
  statRecords: StatRecord[],
  turnoverRecords: TurnoverRecord[],
  team: 'team1' | 'team2',
): PlayerStats[] {
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

  // Process stat records (goals/assists)
  for (const record of statRecords) {
    if (record.team !== team) continue;

    if (record.goal) {
      const stats = getOrCreate(record.goal);
      stats.goals++;
      statsMap.set(record.goal, stats);
    }

    if (record.assist) {
      const stats = getOrCreate(record.assist);
      stats.assists++;
      statsMap.set(record.assist, stats);
    }
  }

  // Process turnover records (blocks/throwaways/drops/fiftyfifties)
  for (const record of turnoverRecords) {
    if (record.team !== team) continue;

    // Handle fiftyfifty - player1 gets 0.5 throwaway, player2 gets 0.5 drop
    if (record.type === 'fiftyfifty') {
      if (record.player) {
        const stats = getOrCreate(record.player);
        stats.throwaways += 0.5; // Thrower gets half a throwaway
        statsMap.set(record.player, stats);
      }
      if (record.player2) {
        const stats = getOrCreate(record.player2);
        stats.drops += 0.5; // Receiver gets half a drop
        statsMap.set(record.player2, stats);
      }
      continue;
    }

    if (!record.player) continue;

    const stats = getOrCreate(record.player);
    switch (record.type) {
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
    statsMap.set(record.player, stats);
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

export function generateCSV(
  statRecords: StatRecord[],
  turnoverRecords: TurnoverRecord[],
  playerStats: PlayerStats[],
  team1Name: string,
  team2Name: string,
  gamesList?: SavedGame[],
): string {
  // --- AGGREGATED EXPORT ---
  if (gamesList) {
    let csv = `# Aggregated Stats: ${team1Name} (${gamesList.length} games)\n`;

    // Section 1: Combined Player Summary
    csv += '\n# Combined Player Summary\n';
    csv += playerSummaryCSV(playerStats);

    // Section 2: Game Log
    csv += '\n\n# Game Log\n';
    csv += 'Date,Opponent,Result,Score,Our Score,Their Score\n';
    csv += gamesList
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((g) => {
        const date = formatDateForCSV(g.createdAt);
        const win = g.team1Score > g.team2Score;
        const result = win ? 'Win' : 'Loss';
        return `${date},${g.team2Name},${result},${g.team1Score}-${g.team2Score},${g.team1Score},${g.team2Score}`;
      })
      .join('\n');

    // Section 3: Individual Games (with full details)
    csv += '\n\n# Individual Game Details';
    for (const game of gamesList) {
      csv += `\n\nGame: vs ${game.team2Name} - ${formatDateForCSV(game.createdAt)}`;

      // Player stats for this game
      const gameStats = computePlayerStats(
        game.statRecords as StatRecord[],
        game.turnoverRecords as TurnoverRecord[],
        'team1',
      );
      csv += '\n\n# Player Summary\n';
      csv += playerSummaryCSV(gameStats);

      // Play-by-play for this game
      csv += '\n\n# Play-by-Play\n';
      csv += playByPlayCSV(game.statRecords as StatRecord[], game.team1Name, game.team2Name);

      // Turnovers for this game
      csv += '\n\n# Turnovers\n';
      csv += turnoversCSV(game.turnoverRecords as TurnoverRecord[], game.team1Name, game.team2Name);
    }

    return csv;
  }

  // --- SINGLE GAME EXPORT ---
  let csv = '# Play-by-Play\n';
  csv += playByPlayCSV(statRecords, team1Name, team2Name);

  csv += '\n\n# Turnovers\n';
  csv += turnoversCSV(turnoverRecords, team1Name, team2Name);

  csv += '\n\n# Player Summary\n';
  csv += playerSummaryCSV(playerStats);

  return csv;
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

function playByPlayCSV(records: StatRecord[], team1Name: string, team2Name: string): string {
  return (
    'Point Number,Team,Goal,Assist\n' +
    records
      .map((r) => {
        const teamName = r.team === 'team1' ? team1Name : team2Name;
        return `${r.pointNumber},${teamName},${r.goal || ''},${r.assist || ''}`;
      })
      .join('\n')
  );
}

function turnoversCSV(records: TurnoverRecord[], team1Name: string, team2Name: string): string {
  return (
    'Team,Type,Player,Player2\n' +
    records
      .map((r) => {
        const teamName = r.team === 'team1' ? team1Name : team2Name;
        return `${teamName},${r.type},${r.player || ''},${r.player2 || ''}`;
      })
      .join('\n')
  );
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
function formatDateForCSV(timestamp: number): string {
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
