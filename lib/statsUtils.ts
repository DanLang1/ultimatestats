import { GameEvent, SavedGame } from '@/lib/storage';

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

export function generateCSV(
  events: GameEvent[],
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
      const gameStats = computePlayerStats(game.events, 'team1');
      csv += '\n\n# Player Summary\n';
      csv += playerSummaryCSV(gameStats);

      // Play-by-play for this game
      csv += '\n\n# Play-by-Play\n';
      csv += playByPlayCSV(game.events, game.team1Name, game.team2Name);

      // Turnovers for this game
      csv += '\n\n# Turnovers\n';
      csv += turnoversCSV(game.events, game.team1Name, game.team2Name);
    }

    return csv;
  }

  // --- SINGLE GAME EXPORT ---
  let csv = '# Play-by-Play\n';
  csv += playByPlayCSV(events, team1Name, team2Name);

  csv += '\n\n# Turnovers\n';
  csv += turnoversCSV(events, team1Name, team2Name);

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
