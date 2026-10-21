import { csvRow, type CSVCell } from '@/lib/csvUtils';
import { formatTimestampForCSV } from '@/lib/dateUtils';

import { computeAdvancedGameStats } from './advancedGameStats';
import type { AdvancedPlayerStats } from './advancedPlayerStatsUtils';
import { getInboundPullCount, type PullStats } from './advancedPullStatsUtils';
import type { AdvancedTeamStats } from './advancedTeamStatsUtils';
import { getPointStateLabel } from './advancedTimelineUtils';
import type { AdvancedTimingStats } from './advancedTimingStatsUtils';
import {
  getAnalyticsOpposingSideId,
  getAnalyticsSidePerspective,
} from './analyticsPerspectiveUtils';
import type { AnalyticsGame } from './analyticsTypes';
import { getFinalScores, getPointStateForSide, UNKNOWN_PARTICIPANT_ID } from './buildAnalyticsGame';
import { getPlayerStatLabel, type AdvancedPlayerStatKey } from './playerStatLabels';

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
  return getAnalyticsSidePerspective(game).opposingSideName;
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

function getThrowTypeLabel(type: 'huck' | 'backfield_reset' | undefined): string {
  if (type === 'huck') return 'Huck';
  if (type === 'backfield_reset') return 'Backfield Reset';
  return '';
}

/**
 * Generate CSV for a single advanced game.
 */
export function generateAdvancedGameCSV(
  analyticsGame: AnalyticsGame,
  perspectiveSideId = analyticsGame.focusSideId,
): string {
  const names = analyticsGame.participantNames;
  const { perspective, teamStats, timingStats, pullStats, playerStats } = computeAdvancedGameStats(
    analyticsGame,
    perspectiveSideId,
  );
  const myTeamName = perspective.sideName;
  const opponentName = perspective.opposingSideName;
  const timestamp = getGameTimestamp(analyticsGame);

  let csv = `# Game: ${myTeamName} vs ${opponentName} - ${formatTimestampForCSV(timestamp)}\n`;

  csv += '\n# Team Stats\n';
  csv += teamStatsCSV(teamStats, myTeamName);

  if (timingStats.hasTimingData) {
    csv += timingStatsCSV(timingStats);
  }

  if (pullStats.totalPulls > 0) {
    csv += pullStatsCSV(pullStats);
  }

  csv += '\n\n# Player Summary\n';
  csv += playerSummaryCSV(playerStats, names, timingStats.hasTimingData);

  csv += '\n\n# Point-by-Point\n';
  csv += pointByPointCSV(analyticsGame, perspectiveSideId);

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

  const combinedStats = computeAdvancedGameStats(aggregatedGame, focusSideId);

  csv += '\n# Combined Team Stats\n';
  csv += teamStatsCSV(combinedStats.teamStats, teamName);

  if (combinedStats.timingStats.hasTimingData) {
    csv += timingStatsCSV(combinedStats.timingStats);
  }

  if (combinedStats.pullStats.totalPulls > 0) {
    csv += pullStatsCSV(combinedStats.pullStats);
  }

  csv += '\n\n# Combined Player Summary\n';
  csv += playerSummaryCSV(
    combinedStats.playerStats,
    names,
    combinedStats.timingStats.hasTimingData,
  );

  csv += '\n\n# Game Log\n';
  csv += csvRow(['Date', 'Opponent', 'Result', 'Score', 'Our Score', 'Their Score']) + '\n';
  csv += games
    .map((game) => {
      const date = formatTimestampForCSV(getGameTimestamp(game));
      const oppName = getOpponentName(game);
      const finalScores = getFinalScores(game);
      const ourScore = finalScores[game.focusSideId];
      const theirScore = finalScores[game.oppSideId];
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
    const gameStats = computeAdvancedGameStats(game, gameFocusSideId);

    csv += `\n\n## Game: vs ${oppName} - ${formatTimestampForCSV(timestamp)}`;

    csv += '\n\n### Team Stats\n';
    csv += teamStatsCSV(gameStats.teamStats, gameTeamName);

    if (gameStats.timingStats.hasTimingData) {
      csv += timingStatsCSV(gameStats.timingStats);
    }

    if (gameStats.pullStats.totalPulls > 0) {
      csv += pullStatsCSV(gameStats.pullStats);
    }

    csv += '\n\n### Player Summary\n';
    csv += playerSummaryCSV(
      gameStats.playerStats,
      game.participantNames,
      gameStats.timingStats.hasTimingData,
    );

    csv += '\n\n### Point-by-Point\n';
    csv += pointByPointCSV(game);

    csv += '\n\n### Action Log\n';
    csv += actionLogCSV(game, game.participantNames);
  }

  return csv;
}

// ── Section builders ───────────────────────────────────────────────────────────

function teamStatsCSV(stats: AdvancedTeamStats, teamName: string): string {
  const redZoneRows =
    stats.redZoneEntries > 0
      ? [
          csvRow([
            'Red Zone Conversion',
            formatNullablePercent(stats.redZoneConversionPct),
            `${stats.scoredRedZonePossessions}/${stats.resolvedRedZonePossessions}`,
          ]),
          csvRow([
            'Red Zone Turnovers',
            stats.resolvedRedZonePossessions - stats.scoredRedZonePossessions,
            'Marked possessions ending in a turnover',
          ]),
          csvRow([
            'Red Zone Avg Time to Score',
            formatNullableDuration(stats.averageRedZoneTimeToScoreMs),
            'Active play from entry to goal (m:ss)',
          ]),
          csvRow([
            'Red Zone Avg Time to Turnover',
            formatNullableDuration(stats.averageRedZoneTimeToTurnoverMs),
            'Active play from entry to turnover (m:ss)',
          ]),
        ]
      : [];
  const redZoneDefenseRows =
    stats.opponentRedZoneEntries > 0
      ? [
          csvRow([
            'Red Zone Stop Rate',
            formatNullablePercent(stats.redZoneStopPct),
            `${stats.redZoneStops}/${stats.resolvedOpponentRedZonePossessions}`,
          ]),
          csvRow([
            'Red Zone Stops',
            stats.redZoneStops,
            'Opponent marked possessions ending in a turnover',
          ]),
          csvRow([
            'Red Zone Avg Time to Opp Goal',
            formatNullableDuration(stats.averageRedZoneTimeToOpponentGoalMs),
            'Active play from entry to opponent goal (m:ss)',
          ]),
          csvRow([
            'Red Zone Avg Time to Opp Turn',
            formatNullableDuration(stats.averageRedZoneTimeToOpponentTurnoverMs),
            'Active play from entry to opponent turnover (m:ss)',
          ]),
        ]
      : [];
  const huckRows =
    stats.throwTypes.huckAttempts > 0
      ? [
          csvRow(['Huck Attempts', stats.throwTypes.huckAttempts, '']),
          csvRow([
            'Huck Completions',
            stats.throwTypes.huckCompletions,
            `${stats.throwTypes.huckCompletions}/${stats.throwTypes.huckAttempts}`,
          ]),
          csvRow([
            'Huck Completion %',
            formatNullablePercent(stats.throwTypes.huckCompletionPct),
            '',
          ]),
          csvRow(['Huck Turnovers', stats.throwTypes.huckTurnovers, '']),
        ]
      : [];
  const resetRows =
    stats.throwTypes.resetTurnovers > 0
      ? [csvRow(['Backfield Turnovers', stats.throwTypes.resetTurnovers, ''])]
      : [];

  return [
    csvRow(['Stat', 'Value', 'Detail']),
    csvRow([
      'Holds',
      stats.holds,
      `${stats.holds}/${stats.holds + stats.timesBroken} completed O-points`,
    ]),
    csvRow(['Times Broken', stats.timesBroken, '']),
    csvRow([
      'Hold Rate',
      formatNullablePercent(stats.oEfficiency),
      `${stats.holds}/${stats.holds + stats.timesBroken}`,
    ]),
    csvRow([
      'O-Possession Conversion',
      formatNullablePercent(stats.oPossessionConversionPct),
      `${stats.scoredOPossessions}/${stats.totalPossessionsOnO}`,
    ]),
    csvRow([
      'Breaks',
      stats.breaks,
      `${stats.breaks}/${stats.breaks + stats.oppHolds} completed D-points`,
    ]),
    csvRow([
      'Break Efficiency',
      formatNullablePercent(stats.breakEfficiencyPct),
      `${stats.breaks}/${stats.dPointsWithTurnover}`,
    ]),
    csvRow([
      'D-Possession Conversion',
      formatNullablePercent(stats.dPossessionConversionPct),
      `${stats.scoredDPossessions}/${stats.totalPossessionsOnD}`,
    ]),
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
    csvRow(['Total Pressures', stats.totalPressures, '']),
    ...huckRows,
    ...resetRows,
    ...redZoneRows,
    ...redZoneDefenseRows,
    csvRow(['Turns per Point', formatDecimal(stats.turnoversPerPoint ?? 0), '']),
    csvRow(['Points per Turn', formatDecimal(stats.pointsPerTurnover ?? 0), '']),
    csvRow([
      'Overall Conversion',
      formatNullablePercent(stats.possessionConversionPct),
      `${stats.totalGoals}/${stats.totalPossessions}`,
    ]),
    csvRow(['Blocks per D-Point', formatDecimal(stats.blocksPerDPoint), '']),
    csvRow(['Pressures per D-Point', formatDecimal(stats.pressuresPerDPoint), '']),
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
      csvRow(['Inbounds Pulls', getInboundPullCount(stats)]),
      csvRow(['OB Pulls', stats.outcomes.ob ?? 0]),
      csvRow(['Dropped Pulls', stats.outcomes.dropped ?? 0]),
      csvRow(['Roller Pulls', stats.outcomes.roller ?? 0]),
      csvRow([
        'Avg Hang Time',
        stats.avgHangTimeMs != null ? `${(stats.avgHangTimeMs / 1000).toFixed(1)}s` : '-',
      ]),
    ].join('\n')
  );
}

interface PlayerCSVColumn {
  header: string;
  value: (stats: AdvancedPlayerStats) => CSVCell;
}

interface PlayerCSVContext {
  players: AdvancedPlayerStats[];
  hasTimingData: boolean;
}

interface PlayerCSVColumnGroup {
  /** Optional groups export only when this returns true; others always export. */
  include?: (context: PlayerCSVContext) => boolean;
  columns: PlayerCSVColumn[];
}

function percentCell(value: number | null): CSVCell {
  return value != null ? formatPercent(value) : '-';
}

function hangTimeCell(ms: number | null): CSVCell {
  return ms != null ? `${(ms / 1000).toFixed(1)}s` : '-';
}

const anyPlayer =
  (hasData: (stats: AdvancedPlayerStats) => boolean) =>
  ({ players }: PlayerCSVContext) =>
    players.some(hasData);

/** A player stat column headed by its shared label; `format` overrides the raw value. */
function statColumn(
  key: AdvancedPlayerStatKey,
  format?: (stats: AdvancedPlayerStats) => CSVCell,
): PlayerCSVColumn {
  return { header: getPlayerStatLabel(key), value: format ?? ((stats) => stats[key]) };
}

/** Player summary columns in export order; each header sits beside the value it labels. */
const PLAYER_CSV_COLUMN_GROUPS: PlayerCSVColumnGroup[] = [
  { columns: [statColumn('goals'), statColumn('assists'), statColumn('hockeyAssists')] },
  { include: anyPlayer((p) => p.callahans > 0), columns: [statColumn('callahans')] },
  {
    columns: [
      statColumn('completions'),
      statColumn('throwAttempts'),
      statColumn('completionPct', (p) => percentCell(p.completionPct)),
      statColumn('throwaways'),
      statColumn('drops'),
    ],
  },
  {
    include: anyPlayer((p) => p.huckAttempts > 0),
    columns: [
      statColumn('huckAttempts'),
      statColumn('huckCompletions'),
      statColumn('huckCompletionPct', (p) => percentCell(p.huckCompletionPct)),
      statColumn('huckIncompletions'),
    ],
  },
  { include: anyPlayer((p) => p.resetTurnovers > 0), columns: [statColumn('resetTurnovers')] },
  {
    include: anyPlayer((p) => p.hucksCaught + p.hucksDropped > 0),
    columns: [statColumn('hucksCaught'), statColumn('hucksDropped')],
  },
  { include: anyPlayer((p) => p.resetsDropped > 0), columns: [statColumn('resetsDropped')] },
  {
    include: anyPlayer((p) => p.stalls > 0 || p.stallsConceded > 0),
    columns: [statColumn('stalls'), statColumn('stallsConceded')],
  },
  {
    include: anyPlayer((p) => p.pulls > 0 || p.pullReceptions > 0),
    columns: [
      statColumn('pulls'),
      statColumn('inboundPulls'),
      statColumn('outOfBoundsPulls'),
      statColumn('droppedPulls'),
      statColumn('rollerPulls'),
      statColumn('avgPullHangTimeMs', (p) => hangTimeCell(p.avgPullHangTimeMs)),
      statColumn('maxPullHangTimeMs', (p) => hangTimeCell(p.maxPullHangTimeMs)),
      statColumn('minPullHangTimeMs', (p) => hangTimeCell(p.minPullHangTimeMs)),
      statColumn('pullReceptions'),
    ],
  },
  {
    columns: [
      statColumn('blocks'),
      statColumn('pressures'),
      statColumn('receptions'),
      statColumn('totalTouches'),
      statColumn('plusMinus'),
    ],
  },
  {
    include: ({ hasTimingData }) => hasTimingData,
    columns: [
      statColumn('pointsPlayed'),
      statColumn('oPoints'),
      statColumn('dPoints'),
      statColumn('oEfficiency', (p) => percentCell(p.oEfficiency)),
      statColumn('dEfficiency', (p) => percentCell(p.dEfficiency)),
    ],
  },
];

function playerSummaryCSV(
  players: AdvancedPlayerStats[],
  names: Map<string, string>,
  hasTimingData: boolean,
): string {
  if (players.length === 0) {
    return csvRow(['Player', getPlayerStatLabel('goals')]) + '\n(no players)';
  }

  const context: PlayerCSVContext = { players, hasTimingData };
  const columns = PLAYER_CSV_COLUMN_GROUPS.filter(
    (group) => group.include?.(context) ?? true,
  ).flatMap((group) => group.columns);

  const rows = players
    .sort((a, b) => {
      const diff = b.plusMinus - a.plusMinus;
      if (diff !== 0) return diff;
      return resolveName(names, a.participantId).localeCompare(resolveName(names, b.participantId));
    })
    .map((p) =>
      csvRow([resolveName(names, p.participantId), ...columns.map((column) => column.value(p))]),
    );

  return [csvRow(['Player', ...columns.map((column) => column.header)]), ...rows].join('\n');
}

function pointByPointCSV(game: AnalyticsGame, perspectiveSideId = game.focusSideId): string {
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

  const opponentSideId = getAnalyticsOpposingSideId(game, perspectiveSideId);
  for (const point of game.points) {
    const scoreBefore = `${point.scoresBySide[perspectiveSideId] ?? 0}-${point.scoresBySide[opponentSideId] ?? 0}`;
    const pullingName = game.sideLabels[point.pullingSideId] ?? point.pullingSideId;
    const receivingName = game.sideLabels[point.receivingSideId] ?? point.receivingSideId;
    const state = getPointStateForSide(point, perspectiveSideId);
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
      csvRow(['Point', 'Action', 'Player', 'Result', 'Throw Type', 'Receiver', 'Defender']) +
      '\n(no actions)'
    );
  }

  let csv =
    csvRow(['Point', 'Action', 'Player', 'Result', 'Throw Type', 'Receiver', 'Defender']) + '\n';

  for (const action of relevant) {
    const pointNum = action.pointIndex + 1;
    const actorName = resolveName(names, action.actorId);
    const receiverName = resolveName(names, action.receiverId);
    const defenderName = resolveName(names, action.defenderId);

    let actionType: string;
    let result: string;
    let throwType = '';
    if (action.kind === 'pull') {
      actionType = 'Pull';
      result = action.result;
    } else if (action.kind === 'disc_pickup') {
      actionType = 'Pickup';
      result = '';
    } else {
      actionType = 'Throw';
      result = action.result;
      throwType = getThrowTypeLabel(action.details?.type);
    }

    csv +=
      csvRow([pointNum, actionType, actorName, result, throwType, receiverName, defenderName]) +
      '\n';
  }

  return csv.trimEnd();
}
