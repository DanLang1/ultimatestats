import type { AnalyticsGame } from './analyticsTypes';
import { getFinalScores, getPointStateForSide, UNKNOWN_PARTICIPANT_ID } from './buildAnalyticsGame';
import { computeAdvancedPlayerStats, type AdvancedPlayerStats } from './advancedPlayerStatsUtils';
import { computeAdvancedTeamStats, type AdvancedTeamStats } from './advancedTeamStatsUtils';
import { computeAdvancedTimingStats, type AdvancedTimingStats } from './advancedTimingStatsUtils';
import { computePullStats, getInboundPullCount, type PullStats } from './advancedPullStatsUtils';
import { getPointStateLabel } from './advancedTimelineUtils';
import { csvRow, type CSVCell } from '@/lib/csvUtils';
import { formatDateForCSV } from '@/lib/statsUtils';

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDecimal(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

function formatNullablePercent(value: number | null): string {
  if (value == null) return '-';
  return formatPercent(value);
}

function formatNullableDuration(ms: number | null): string {
  if (ms == null) return '';
  return formatDuration(ms);
}

function resolveName(names: Map<string, string>, id: string | null): string {
  if (id == null) return '';
  if (id === UNKNOWN_PARTICIPANT_ID) return 'Unknown';
  return names.get(id) ?? id;
}

function getOpponentName(game: AnalyticsGame): string {
  if (game.metadata?.opponentName) return game.metadata.opponentName;
  return game.sideLabels[game.oppSideId] ?? 'Opponent';
}

function getGameTimestamp(game: AnalyticsGame): number {
  if (!game.metadata?.date) return game.createdAt;
  return new Date(game.metadata.date).getTime() || game.createdAt;
}

function getResultLabel(ourScore: number, theirScore: number): string {
  if (ourScore > theirScore) return 'Win';
  if (ourScore < theirScore) return 'Loss';
  return 'Draw';
}

/**
 * Generate CSV for a single advanced game.
 */
export function generateAdvancedGameCSV(analyticsGame: AnalyticsGame): string {
  const names = analyticsGame.participantNames;
  const focusSideId = analyticsGame.focusSideId;
  const myTeamName = analyticsGame.sideLabels[focusSideId] ?? 'My Team';
  const opponentName = getOpponentName(analyticsGame);
  const timestamp = getGameTimestamp(analyticsGame);

  let csv = `# Game: ${myTeamName} vs ${opponentName} - ${formatDateForCSV(timestamp)}\n`;

  csv += '\n# Team Stats\n';
  csv += teamStatsCSV(computeAdvancedTeamStats(analyticsGame, focusSideId), myTeamName);

  const timingStats = computeAdvancedTimingStats(analyticsGame);
  if (timingStats.hasTimingData) {
    csv += timingStatsCSV(timingStats);
  }

  const pullStats = computePullStats(analyticsGame, focusSideId);
  if (pullStats.totalPulls > 0) {
    csv += pullStatsCSV(pullStats);
  }

  csv += '\n\n# Player Summary\n';
  const focusPlayers = computeAdvancedPlayerStats(analyticsGame, focusSideId);
  csv += playerSummaryCSV(focusPlayers, names, timingStats.hasTimingData);

  csv += '\n\n# Point-by-Point\n';
  csv += pointByPointCSV(analyticsGame, names);

  csv += '\n\n# Action Log\n';
  csv += actionLogCSV(analyticsGame, names);

  return csv;
}

/**
 * Generate CSV for aggregate advanced stats across multiple games.
 */
export function generateAggregateAdvancedCSV(
  games: AnalyticsGame[],
  aggregatedGame: AnalyticsGame,
  teamName: string,
): string {
  const names = aggregatedGame.participantNames;
  const focusSideId = aggregatedGame.focusSideId;

  let csv = `# Aggregated Stats: ${teamName} (${games.length} games)\n`;

  csv += '\n# Combined Team Stats\n';
  csv += teamStatsCSV(computeAdvancedTeamStats(aggregatedGame, focusSideId), teamName);

  const timingStats = computeAdvancedTimingStats(aggregatedGame);
  if (timingStats.hasTimingData) {
    csv += timingStatsCSV(timingStats);
  }

  const pullStats = computePullStats(aggregatedGame, focusSideId);
  if (pullStats.totalPulls > 0) {
    csv += pullStatsCSV(pullStats);
  }

  csv += '\n\n# Combined Player Summary\n';
  const focusPlayers = computeAdvancedPlayerStats(aggregatedGame, focusSideId);
  csv += playerSummaryCSV(focusPlayers, names, timingStats.hasTimingData);

  csv += '\n\n# Game Log\n';
  csv += csvRow(['Date', 'Opponent', 'Result', 'Score', 'Our Score', 'Their Score']) + '\n';
  csv += games
    .map((game) => {
      const date = formatDateForCSV(getGameTimestamp(game));
      const oppName = getOpponentName(game);
      const finalScores = getFinalScores(game);
      const ourScore = finalScores[game.focusSideId] ?? 0;
      const theirScore = finalScores[game.oppSideId] ?? 0;
      const result = getResultLabel(ourScore, theirScore);
      return csvRow([date, oppName, result, `${ourScore}-${theirScore}`, ourScore, theirScore]);
    })
    .join('\n');

  csv += '\n\n# Individual Game Details';
  for (const game of games) {
    const oppName = getOpponentName(game);
    const timestamp = getGameTimestamp(game);
    const gameFocusSideId = game.focusSideId;
    const gameTeamName = game.sideLabels[gameFocusSideId] ?? teamName;

    csv += `\n\n## Game: vs ${oppName} - ${formatDateForCSV(timestamp)}`;

    csv += '\n\n### Team Stats\n';
    csv += teamStatsCSV(computeAdvancedTeamStats(game, gameFocusSideId), gameTeamName);

    const gameTiming = computeAdvancedTimingStats(game);
    if (gameTiming.hasTimingData) {
      csv += timingStatsCSV(gameTiming);
    }

    const gamePulls = computePullStats(game, gameFocusSideId);
    if (gamePulls.totalPulls > 0) {
      csv += pullStatsCSV(gamePulls);
    }

    csv += '\n\n### Player Summary\n';
    const gameFocusPlayers = computeAdvancedPlayerStats(game, gameFocusSideId);
    csv += playerSummaryCSV(gameFocusPlayers, game.participantNames, gameTiming.hasTimingData);

    csv += '\n\n### Point-by-Point\n';
    csv += pointByPointCSV(game, game.participantNames);

    csv += '\n\n### Action Log\n';
    csv += actionLogCSV(game, game.participantNames);
  }

  return csv;
}

// ── Section builders ───────────────────────────────────────────────────────────

function teamStatsCSV(stats: AdvancedTeamStats, teamName: string): string {
  return [
    csvRow(['Stat', 'Value', 'Detail']),
    csvRow(['Holds', stats.holds, `${stats.holds}/${stats.oPoints} O-points`]),
    csvRow(['Times Broken', stats.timesBroken, '']),
    csvRow([
      'O-Efficiency',
      formatNullablePercent(stats.oEfficiency),
      `${stats.holds}/${stats.holds + stats.timesBroken}`,
    ]),
    csvRow(['Breaks', stats.breaks, `${stats.breaks}/${stats.dPoints} D-points`]),
    csvRow([
      'D-Efficiency',
      formatNullablePercent(stats.dEfficiency),
      `${stats.breaks}/${stats.breaks + stats.oppHolds}`,
    ]),
    csvRow(['Clean Holds', stats.cleanHolds, '']),
    csvRow(['Dirty Holds', stats.dirtyHolds, '']),
    csvRow([
      'D-Points with Turnover',
      stats.dPointsWithTurnover,
      `${stats.breaks}/${stats.dPoints} D-points`,
    ]),
    csvRow(['Scores After Turnover', stats.scoresAfterTurnovers, 'Our scores on possession 2+']),
    csvRow(['Offensive Points', stats.oPoints, '']),
    csvRow(['Defensive Points', stats.dPoints, '']),
    csvRow(['Total Turns', stats.totalTurnovers, '']),
    csvRow(['Total Blocks', stats.totalBlocks, '']),
    csvRow(['Turns per Point', formatDecimal(stats.turnoversPerPoint ?? 0), '']),
    csvRow(['Points per Turn', formatDecimal(stats.pointsPerTurnover ?? 0), '']),
    csvRow([
      'Possession Conversion',
      formatNullablePercent(stats.possessionConversionPct),
      `${stats.totalGoals}/${stats.totalPossessions}`,
    ]),
    csvRow(['Blocks per D-Point', formatDecimal(stats.blocksPerDPoint), '']),
    csvRow(['Our Possessions per Point', formatDecimal(stats.possessionsPerPoint ?? 0), '']),
    csvRow([
      'Multi-Possession Points',
      formatNullablePercent(stats.multiPossessionPointPct),
      `${stats.multiPossessionPoints}/${stats.completedPoints}`,
    ]),
    csvRow([`${teamName} Longest Scoring Run`, stats.longestScoringRun, '']),
    csvRow([`${teamName} Longest Drought`, stats.longestDrought, '']),
  ].join('\n');
}

function timingStatsCSV(stats: AdvancedTimingStats): string {
  return (
    '\n# Timing Stats\n' +
    [
      csvRow(['Stat', 'Value', 'Detail']),
      csvRow([
        'Avg Point Duration',
        formatNullableDuration(stats.avgPointDurationMs),
        `${stats.timedPointCount} points`,
      ]),
      csvRow(['Longest Point', formatNullableDuration(stats.longestPointDurationMs), '']),
      csvRow(['Shortest Point', formatNullableDuration(stats.shortestPointDurationMs), '']),
    ].join('\n')
  );
}

function pullStatsCSV(stats: PullStats): string {
  return (
    '\n# Pull Stats\n' +
    [
      csvRow(['Stat', 'Value']),
      csvRow(['Total Pulls', stats.totalPulls]),
      csvRow(['Inbound', getInboundPullCount(stats)]),
      csvRow(['Out of Bounds', stats.outcomes.ob ?? 0]),
      csvRow(['Dropped', stats.outcomes.dropped ?? 0]),
      csvRow(['Roller', stats.outcomes.roller ?? 0]),
      csvRow([
        'Avg Hang Time',
        stats.avgHangTimeMs != null ? `${(stats.avgHangTimeMs / 1000).toFixed(1)}s` : '-',
      ]),
    ].join('\n')
  );
}

function playerSummaryCSV(
  players: AdvancedPlayerStats[],
  names: Map<string, string>,
  hasTimingData: boolean,
): string {
  if (players.length === 0) {
    return csvRow(['Player', 'Goals']) + '\n(no players)';
  }

  const hasCallahans = players.some((p) => p.callahans > 0);
  const hasStalls = players.some((p) => p.stalls > 0 || p.stallsConceded > 0);
  const hasPulls = players.some((p) => p.pulls > 0 || p.pullReceptions > 0);

  const columns = ['Player', 'Goals', 'Assists', 'Hockey Assists'];
  if (hasCallahans) columns.push('Callahans');
  columns.push('Completions', 'Throw Attempts', 'Completion %', 'Throwaways', 'Drops');
  if (hasStalls) columns.push('Stalls', 'Stalls Conceded');
  if (hasPulls) {
    columns.push(
      'Pulls',
      'Inbound Pulls',
      'Out of Bounds Pulls',
      'Dropped Pulls',
      'Roller Pulls',
      'Avg Pull Hang Time',
      'Max Pull Hang Time',
      'Min Pull Hang Time',
      'Pull Receptions',
    );
  }
  columns.push('Blocks', 'Receptions', 'Total Touches', 'Plus/Minus');

  if (hasTimingData) {
    columns.push('Points Played', 'O-Points', 'D-Points', 'O-Eff', 'D-Eff');
  }

  const header = csvRow(columns);

  const rows = players
    .sort((a, b) => {
      const diff = b.plusMinus - a.plusMinus;
      if (diff !== 0) return diff;
      return resolveName(names, a.participantId).localeCompare(resolveName(names, b.participantId));
    })
    .map((p) => {
      const cells: CSVCell[] = [resolveName(names, p.participantId)];
      cells.push(p.goals);
      cells.push(p.assists);
      cells.push(p.hockeyAssists);
      if (hasCallahans) cells.push(p.callahans);
      cells.push(p.completions);
      cells.push(p.throwAttempts);
      cells.push(p.completionPct != null ? formatPercent(p.completionPct) : '-');
      cells.push(p.throwaways);
      cells.push(p.drops);
      if (hasStalls) {
        cells.push(p.stalls);
        cells.push(p.stallsConceded);
      }
      if (hasPulls) {
        cells.push(p.pulls);
        cells.push(p.inboundPulls);
        cells.push(p.outOfBoundsPulls);
        cells.push(p.droppedPulls);
        cells.push(p.rollerPulls);
        cells.push(
          p.avgPullHangTimeMs != null ? `${(p.avgPullHangTimeMs / 1000).toFixed(1)}s` : '-',
        );
        cells.push(
          p.maxPullHangTimeMs != null ? `${(p.maxPullHangTimeMs / 1000).toFixed(1)}s` : '-',
        );
        cells.push(
          p.minPullHangTimeMs != null ? `${(p.minPullHangTimeMs / 1000).toFixed(1)}s` : '-',
        );
        cells.push(p.pullReceptions);
      }
      cells.push(p.blocks);
      cells.push(p.receptions);
      cells.push(p.totalTouches);
      cells.push(p.plusMinus);

      if (hasTimingData) {
        cells.push(p.pointsPlayed);
        cells.push(p.oPoints);
        cells.push(p.dPoints);
        cells.push(p.oEfficiency != null ? formatPercent(p.oEfficiency) : '-');
        cells.push(p.dEfficiency != null ? formatPercent(p.dEfficiency) : '-');
      }

      return csvRow(cells);
    });

  return header + '\n' + rows.join('\n');
}

function pointByPointCSV(game: AnalyticsGame, names: Map<string, string>): string {
  if (game.points.length === 0) {
    return (
      csvRow([
        'Point',
        'Score Before',
        'Half',
        'Pulling Side',
        'Receiving Side',
        'Outcome',
        'Duration',
      ]) + '\n(no points)'
    );
  }

  let csv =
    csvRow([
      'Point',
      'Score Before',
      'Half',
      'Pulling Side',
      'Receiving Side',
      'Outcome',
      'Duration',
    ]) + '\n';

  for (const point of game.points) {
    const scoreBefore = `${point.scoresBySide[game.focusSideId] ?? 0}-${point.scoresBySide[game.oppSideId] ?? 0}`;
    const pullingName = game.sideLabels[point.pullingSideId] ?? point.pullingSideId;
    const receivingName = game.sideLabels[point.receivingSideId] ?? point.receivingSideId;
    const state = getPointStateForSide(point, game.focusSideId);
    const stateLabel = getPointStateLabel(state);
    const duration = formatNullableDuration(point.durationMs);

    csv +=
      csvRow([
        point.pointIndex + 1,
        scoreBefore,
        point.half,
        pullingName,
        receivingName,
        stateLabel,
        duration,
      ]) + '\n';
  }

  return csv.trimEnd();
}

function actionLogCSV(game: AnalyticsGame, names: Map<string, string>): string {
  const relevant = game.actions.filter((a) => a.kind !== 'stoppage');
  if (relevant.length === 0) {
    return (
      csvRow(['Point', 'Action', 'Player', 'Result', 'Receiver', 'Defender']) + '\n(no actions)'
    );
  }

  let csv = csvRow(['Point', 'Action', 'Player', 'Result', 'Receiver', 'Defender']) + '\n';

  for (const action of relevant) {
    const pointNum = action.pointIndex + 1;
    const actorName = resolveName(names, action.actorId);
    const receiverName = resolveName(names, action.receiverId);
    const defenderName = resolveName(names, action.defenderId);

    let actionType: string;
    let result: string;
    if (action.kind === 'pull') {
      actionType = 'Pull';
      result = action.result;
    } else if (action.kind === 'disc_pickup') {
      actionType = 'Pickup';
      result = '';
    } else {
      actionType = 'Throw';
      result = action.result;
    }

    csv += csvRow([pointNum, actionType, actorName, result, receiverName, defenderName]) + '\n';
  }

  return csv.trimEnd();
}
