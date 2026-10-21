import type { AdvancedPlayerStats } from './advancedPlayerStatsUtils';

export type AdvancedPlayerStatKey = Exclude<keyof AdvancedPlayerStats, 'participantId'>;

export interface PlayerStatLabel {
  /** Full label for legends, CSV headers, and cards. */
  label: string;
  /** Compact form for table headers; defaults to `label`. */
  short?: string;
  /** Singular form for counted card rows ("1 Block"); defaults to `label`. */
  singular?: string;
}

/**
 * One wording per player stat, shared by the player stat views and the player CSV. Team stats and
 * the impact timeline keep their own labels. Adding a stat field fails to compile until it has a
 * label here.
 */
const PLAYER_STAT_LABELS = {
  goals: { label: 'Goals', singular: 'Goal' },
  assists: { label: 'Assists', short: 'Ast', singular: 'Assist' },
  hockeyAssists: { label: 'Hockey Assists', short: 'HA', singular: 'Hockey Assist' },
  callahans: { label: 'Callahans', singular: 'Callahan' },
  plusMinus: { label: 'Plus/Minus', short: '+/-' },
  completions: { label: 'Completions', short: 'Cmp' },
  throwAttempts: { label: 'Throw Attempts', short: 'Att' },
  completionPct: { label: 'Completion %', short: 'Cmp%' },
  throwaways: { label: 'Throwaways', short: 'T/A', singular: 'Throwaway' },
  stalls: { label: 'Stalls', short: 'Stl', singular: 'Stall' },
  stallsConceded: { label: 'Stalled', short: 'Stld' },
  turnovers: { label: 'Turnovers', short: 'Turns', singular: 'Turnover' },
  receptions: { label: 'Receptions', short: 'Rec' },
  drops: { label: 'Drops', short: 'Drp', singular: 'Drop' },
  totalTouches: { label: 'Total Touches', short: 'Tch' },
  blocks: { label: 'Blocks', short: 'Blk', singular: 'Block' },
  pressures: { label: 'Pressures', short: 'Prs', singular: 'Pressure' },
  pulls: { label: 'Pulls', short: 'Pls' },
  pullReceptions: { label: 'Pull Receptions' },
  inboundPulls: { label: 'Inbounds Pulls', short: 'In' },
  outOfBoundsPulls: { label: 'OB Pulls', short: 'OB' },
  droppedPulls: { label: 'Dropped Pulls', short: 'Drop' },
  rollerPulls: { label: 'Roller Pulls', short: 'Rol' },
  avgPullHangTimeMs: { label: 'Avg Hang Time', short: 'Avg' },
  maxPullHangTimeMs: { label: 'Max Hang Time', short: 'Max' },
  minPullHangTimeMs: { label: 'Min Hang Time', short: 'Min' },
  huckAttempts: { label: 'Huck Attempts', short: 'Huck Att' },
  huckCompletions: { label: 'Huck Completions', short: 'Huck Cmp' },
  huckCompletionPct: { label: 'Huck Completion %', short: 'Huck %' },
  huckIncompletions: { label: 'Huck Incompletions' },
  huckThrowaways: { label: 'Huck Throwaways' },
  huckDrops: { label: 'Huck Drops' },
  huckBlocks: { label: 'Huck Blocks' },
  huckPressures: { label: 'Huck Pressures' },
  resetThrowaways: { label: 'Backfield Throwaways' },
  resetDrops: { label: 'Backfield Drops' },
  resetBlocks: { label: 'Backfield Blocks' },
  resetPressures: { label: 'Backfield Pressures' },
  resetTurnovers: { label: 'Backfield Turnovers', short: 'BF Turn' },
  hucksCaught: { label: 'Hucks Caught' },
  hucksDropped: { label: 'Hucks Dropped' },
  resetsDropped: { label: 'Resets Dropped' },
  pointsPlayed: { label: 'Points Played', short: 'PP' },
  oPoints: { label: 'O-Points', short: 'O-Pts' },
  dPoints: { label: 'D-Points', short: 'D-Pts' },
  pointPlusMinus: { label: 'Point Plus/Minus', short: 'Pt +/-' },
  oEfficiency: { label: 'Offensive Efficiency', short: 'O-Eff' },
  dEfficiency: { label: 'Defensive Efficiency', short: 'D-Eff' },
  pointDurationMs: { label: 'Point Time' },
  playingTimePct: { label: 'Playing Time' },
} as const satisfies Record<AdvancedPlayerStatKey, PlayerStatLabel>;

function getLabelSpec(key: AdvancedPlayerStatKey): PlayerStatLabel {
  return PLAYER_STAT_LABELS[key];
}

export function getPlayerStatLabel(key: AdvancedPlayerStatKey): string {
  return getLabelSpec(key).label;
}

export function getPlayerStatShortLabel(key: AdvancedPlayerStatKey): string {
  const { label, short } = getLabelSpec(key);
  return short ?? label;
}

/** Singular or plural label for a counted stat, e.g. "1 Block" / "2 Blocks". */
export function getPlayerStatCountLabel(key: AdvancedPlayerStatKey, count: number): string {
  const { label, singular } = getLabelSpec(key);
  return count === 1 ? (singular ?? label) : label;
}
