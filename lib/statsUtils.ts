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

  // Process turnover records (blocks/throwaways/drops)
  for (const record of turnoverRecords) {
    if (record.team !== team || !record.player) continue;

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
): string {
  // Section 1: Play-by-play
  let csv = '# Play-by-Play\n';
  csv += 'Point Number,Team,Goal,Assist\n';
  csv += statRecords
    .map((r) => {
      const teamName = r.team === 'team1' ? team1Name : team2Name;
      return `${r.pointNumber},${teamName},${r.goal || ''},${r.assist || ''}`;
    })
    .join('\n');

  // Section 2: Turnovers
  csv += '\n\n# Turnovers\n';
  csv += 'Team,Type,Player\n';
  csv += turnoverRecords
    .map((r) => {
      const teamName = r.team === 'team1' ? team1Name : team2Name;
      return `${teamName},${r.type},${r.player || ''}`;
    })
    .join('\n');

  // Section 3: Player Summary
  csv += '\n\n# Player Summary\n';
  csv += 'Player,Goals,Assists,Blocks,Throwaways,Drops,Plus/Minus\n';
  csv += playerStats
    .map(
      (p) =>
        `${p.name},${p.goals},${p.assists},${p.blocks},${p.throwaways},${p.drops},${p.plusMinus}`,
    )
    .join('\n');

  return csv;
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
