/**
 * PDF Generator for game stats export
 * Uses expo-print to convert HTML to PDF
 */

import { computePlayerStats, PlayerStats } from '@/lib/statsUtils';
import { GameEvent, Player, SavedGame } from '@/lib/storage';
import { aggregateTeamStats, computeTeamStats, TeamStats } from '@/lib/teamStatsUtils';
import * as Print from 'expo-print';

// =============================================================================
// TYPES
// =============================================================================

export interface GamePDFData {
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  events: GameEvent[];
  roster?: Player[];
  startingPossession: 'team1' | 'team2' | null;
  gameTo: number;
  date?: number; // timestamp
}

export interface AggregatePDFData {
  teamName: string;
  games: SavedGame[];
  roster?: Player[];
}

// =============================================================================
// MAIN EXPORT FUNCTIONS
// =============================================================================

/**
 * Generate PDF for a single game (current or saved)
 */
export async function generateGamePDF(data: GamePDFData): Promise<string> {
  const playerStats = computePlayerStats(data.events, 'team1', data.roster);
  const teamStats = computeTeamStats(data.events, data.startingPossession, data.gameTo);

  const html = buildGameHTML({
    ...data,
    playerStats,
    teamStats,
  });

  const { uri } = await Print.printToFileAsync({
    html,
    // Landscape: swap width/height (72 PPI US Letter)
    width: 792,
    height: 612,
  });

  return uri;
}

/**
 * Generate PDF for aggregated stats across multiple games
 */
export async function generateAggregatePDF(data: AggregatePDFData): Promise<string> {
  const mergedEvents = data.games.flatMap((g) => g.events);

  // Merge rosters from all games
  const rosterMap = new Map<string, Player>();
  data.games.forEach((g) => g.team1.roster.forEach((p) => rosterMap.set(p.id, p)));
  const mergedRoster = data.roster || Array.from(rosterMap.values());

  const playerStats = computePlayerStats(mergedEvents, 'team1', mergedRoster);

  // Aggregate team stats
  const allTeamStats = data.games.map((g) =>
    computeTeamStats(g.events, g.startingPossession, g.gameTo),
  );
  const teamStats = aggregateTeamStats(allTeamStats);

  const html = buildAggregateHTML({
    teamName: data.teamName,
    gameCount: data.games.length,
    playerStats,
    teamStats,
    games: data.games,
  });

  const { uri } = await Print.printToFileAsync({
    html,
    // Landscape: swap width/height (72 PPI US Letter)
    width: 792,
    height: 612,
  });

  return uri;
}

// =============================================================================
// HTML BUILDERS
// =============================================================================

interface GameHTMLData extends GamePDFData {
  playerStats: PlayerStats[];
  teamStats: TeamStats;
}

function buildGameHTML(data: GameHTMLData): string {
  const dateStr = data.date ? formatDateForPDF(data.date) : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${getStyles()}
</head>
<body>
  <div class="container">
    ${buildHeader(data.team1Name, data.team2Name, data.team1Score, data.team2Score, dateStr)}
    <div class="content-grid">
      <div class="left-column">
        ${buildTeamStatsSection(data.teamStats)}
      </div>
      <div class="right-column">
        ${buildPlayerStatsSection(data.playerStats)}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

interface AggregateHTMLData {
  teamName: string;
  gameCount: number;
  playerStats: PlayerStats[];
  teamStats: TeamStats;
  games: SavedGame[];
}

function buildAggregateHTML(data: AggregateHTMLData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${getStyles()}
</head>
<body>
  <div class="container">
    ${buildAggregateHeader(data.teamName, data.gameCount, data.games)}
    <div class="content-grid">
      <div class="left-column">
        ${buildTeamStatsSection(data.teamStats)}
      </div>
      <div class="right-column">
        ${buildPlayerStatsSection(data.playerStats)}
      </div>
    </div>
    ${buildGameLog(data.games)}
  </div>
</body>
</html>
  `.trim();
}

// =============================================================================
// SECTION BUILDERS
// =============================================================================

function buildHeader(
  team1Name: string,
  team2Name: string,
  team1Score: number,
  team2Score: number,
  dateStr: string,
): string {
  const won = team1Score > team2Score;
  const resultClass = won ? 'win' : 'loss';
  const resultText = won ? 'WIN' : 'LOSS';

  return `
    <div class="header">
      <div class="matchup">
        <div class="team-name">${escapeHtml(team1Name)}</div>
        <div class="score-block ${resultClass}">
          <span class="score">${team1Score} - ${team2Score}</span>
          <span class="result-badge">${resultText}</span>
        </div>
        <div class="team-name opponent">vs ${escapeHtml(team2Name)}</div>
      </div>
      ${dateStr ? `<div class="date">${dateStr}</div>` : ''}
    </div>
  `;
}

function buildAggregateHeader(teamName: string, gameCount: number, games: SavedGame[]): string {
  const wins = games.filter((g) => g.team1Score > g.team2Score).length;
  const losses = gameCount - wins;

  return `
    <div class="header aggregate">
      <div class="team-name">${escapeHtml(teamName)}</div>
      <div class="record-block">
        <span class="record">${wins}W - ${losses}L</span>
        <span class="game-count">${gameCount} Games</span>
      </div>
    </div>
  `;
}

function buildTeamStatsSection(stats: TeamStats): string {
  const formatPercent = (val: number) => `${val.toFixed(0)}%`;
  const formatDecimal = (val: number) => (Number.isInteger(val) ? val.toString() : val.toFixed(2));

  return `
    <div class="section">
      <h2>Team Stats</h2>
      <table class="stats-table">
        <tbody>
          <tr><td>Hold %</td><td class="value">${formatPercent(stats.holdPercentage)}</td><td class="detail">${stats.holds}/${stats.offensivePoints} O-pts</td></tr>
          <tr><td>Break Efficiency</td><td class="value">${formatPercent(stats.breakEfficiency)}</td><td class="detail">${stats.breaks}/${stats.dPointsWithTurnover} D-pts w/ turn</td></tr>
          <tr><td>D-Efficiency</td><td class="value">${formatPercent(stats.dEfficiency)}</td><td class="detail">${stats.breaks}/${stats.defensivePoints} D-pts</td></tr>
          <tr><td>Conversion Rate</td><td class="value">${formatPercent(stats.conversionRate)}</td><td class="detail">Goals / Possessions</td></tr>
          <tr class="divider"><td colspan="3"></td></tr>
          <tr><td>Clean Holds</td><td class="value">${stats.cleanHolds}</td><td></td></tr>
          <tr><td>Dirty Holds</td><td class="value">${stats.dirtyHolds}</td><td></td></tr>
          <tr><td>Total Breaks</td><td class="value">${stats.breaks}</td><td></td></tr>
          <tr><td>Times Broken</td><td class="value">${stats.timesBroken}</td><td></td></tr>
          <tr class="divider"><td colspan="3"></td></tr>
          <tr><td>Total Turnovers</td><td class="value">${stats.totalTurnovers}</td><td></td></tr>
          <tr><td>Opponent Turnovers</td><td class="value">${stats.opponentTurnovers}</td><td></td></tr>
          <tr><td>Turnovers/Pt</td><td class="value">${formatDecimal(stats.turnoversPerPoint)}</td><td></td></tr>
          <tr><td>Points/Turnover</td><td class="value">${formatDecimal(stats.pointsPerTurnover)}</td><td></td></tr>
          <tr class="divider"><td colspan="3"></td></tr>
          <tr><td>Total Blocks</td><td class="value">${stats.totalBlocks}</td><td></td></tr>
          <tr><td>Blocks/D-Pt</td><td class="value">${formatDecimal(stats.blocksPerDPoint)}</td><td></td></tr>
          <tr><td>Longest Run</td><td class="value">${stats.longestScoringRun}</td><td></td></tr>
          <tr><td>Longest Drought</td><td class="value">${stats.longestDrought}</td><td></td></tr>
        </tbody>
      </table>
    </div>
  `;
}

function buildPlayerStatsSection(players: PlayerStats[]): string {
  if (players.length === 0) {
    return `
      <div class="section">
        <h2>Player Stats</h2>
        <p class="empty">No player stats recorded</p>
      </div>
    `;
  }

  const rows = players
    .map(
      (p) => `
      <tr>
        <td class="player-name">${escapeHtml(p.name)}</td>
        <td>${p.goals}</td>
        <td>${p.assists}</td>
        <td>${p.blocks}</td>
        <td>${p.throwaways}</td>
        <td>${p.drops}</td>
        <td class="plus-minus ${p.plusMinus >= 0 ? 'positive' : 'negative'}">${p.plusMinus >= 0 ? '+' : ''}${p.plusMinus}</td>
      </tr>
    `,
    )
    .join('');

  return `
    <div class="section">
      <h2>Player Stats</h2>
      <table class="player-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Goals</th>
            <th>Assists</th>
            <th>Blocks</th>
            <th>Throwaways</th>
            <th>Drops</th>
            <th>+/-</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function buildGameLog(games: SavedGame[]): string {
  const sortedGames = [...games].sort((a, b) => b.createdAt - a.createdAt);

  const rows = sortedGames
    .map((g) => {
      const won = g.team1Score > g.team2Score;
      return `
        <tr>
          <td>${formatDateForPDF(g.createdAt)}</td>
          <td>${escapeHtml(g.team2Name)}</td>
          <td class="${won ? 'win' : 'loss'}">${won ? 'W' : 'L'}</td>
          <td>${g.team1Score} - ${g.team2Score}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="section game-log">
      <h2>Game Log</h2>
      <table class="log-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Opponent</th>
            <th>Result</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

// =============================================================================
// STYLES
// =============================================================================

function getStyles(): string {
  return `
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background: #0F172A;
        color: #F8FAFC;
        padding: 24px;
        font-size: 11px;
        line-height: 1.4;
      }

      .container {
        max-width: 100%;
      }

      .header {
        text-align: center;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid rgba(255,255,255,0.15);
      }

      .matchup {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 24px;
      }

      .team-name {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 1px;
      }

      .team-name.opponent {
        color: #94A3B8;
        font-weight: 500;
      }

      .score-block {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px 20px;
        border-radius: 8px;
      }

      .score-block.win {
        background: rgba(16, 185, 129, 0.2);
      }

      .score-block.loss {
        background: rgba(244, 63, 94, 0.2);
      }

      .score {
        font-size: 28px;
        font-weight: 700;
        letter-spacing: 2px;
      }

      .result-badge {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 2px;
        margin-top: 4px;
      }

      .win .result-badge { color: #10B981; }
      .loss .result-badge { color: #F43F5E; }

      .date {
        color: #64748B;
        margin-top: 8px;
        font-size: 12px;
      }

      .header.aggregate .team-name {
        font-size: 24px;
      }

      .record-block {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 8px;
      }

      .record {
        font-size: 18px;
        font-weight: 700;
        color: #3B82F6;
      }

      .game-count {
        color: #64748B;
        font-size: 12px;
        margin-top: 4px;
      }

      .content-grid {
        display: flex;
        gap: 24px;
      }

      .left-column {
        flex: 0 0 45%;
      }

      .right-column {
        flex: 1;
      }

      .section {
        margin-bottom: 20px;
      }

      h2 {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: #94A3B8;
        margin-bottom: 12px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      .stats-table td {
        padding: 6px 0;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }

      .stats-table td.value {
        font-weight: 600;
        text-align: right;
        padding-right: 12px;
        min-width: 60px;
      }

      .stats-table td.detail {
        color: #64748B;
        font-size: 10px;
      }

      .stats-table tr.divider td {
        padding: 8px 0;
        border-bottom: none;
      }

      .player-table th,
      .player-table td {
        padding: 8px 6px;
        text-align: center;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }

      .player-table th {
        background: rgba(255,255,255,0.05);
        font-weight: 600;
        font-size: 10px;
        letter-spacing: 1px;
      }

      .player-table td.player-name {
        text-align: left;
        font-weight: 500;
      }

      .plus-minus.positive { color: #10B981; }
      .plus-minus.negative { color: #F43F5E; }

      .log-table th,
      .log-table td {
        padding: 6px 8px;
        text-align: left;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }

      .log-table th {
        font-weight: 600;
        font-size: 10px;
        letter-spacing: 1px;
        background: rgba(255,255,255,0.05);
      }

      .log-table .win { color: #10B981; font-weight: 600; }
      .log-table .loss { color: #F43F5E; font-weight: 600; }

      .empty {
        color: #64748B;
        font-style: italic;
      }

      .game-log {
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid rgba(255,255,255,0.15);
      }
    </style>
  `;
}

// =============================================================================
// HELPERS
// =============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateForPDF(timestamp: number): string {
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
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
