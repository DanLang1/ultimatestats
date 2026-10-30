// See docs/features/advanced-tracking/data-model.md

import type { GenderRatio } from '@/lib/genderRatioUtils';

/** A tracker modifier that changes what the next player tap records. */
export type ArmedPassModifier =
  | 'fifty-fifty'
  | 'callahan'
  | 'stall'
  | 'block'
  | 'pressure'
  // Button-mode alternatives to the goal and drop swipes.
  | 'goal'
  | 'drop';

export type PassModifier = ArmedPassModifier | null;

export interface PassModifierSpec {
  /** The throw result the next tap records; its credited role decides which side is tapped. */
  result: ThrowResult;
  /** True when the grid offers an Unknown chip while armed. */
  allowsUnknownTarget: boolean;
}

export const PASS_MODIFIER_SPECS = {
  'fifty-fifty': { result: 'drop', allowsUnknownTarget: false },
  callahan: { result: 'callahan', allowsUnknownTarget: false },
  stall: { result: 'stall', allowsUnknownTarget: false },
  block: { result: 'block', allowsUnknownTarget: false },
  pressure: { result: 'pressure', allowsUnknownTarget: false },
  goal: { result: 'goal', allowsUnknownTarget: true },
  drop: { result: 'drop', allowsUnknownTarget: true },
} as const satisfies Record<ArmedPassModifier, PassModifierSpec>;

/** True when the next tap names a defender, so the grid shows the side without the disc. */
export function isDefensivePassModifier(modifier: PassModifier): boolean {
  if (modifier == null) return false;
  return THROW_RESULT_SPECS[PASS_MODIFIER_SPECS[modifier].result].creditedRole === 'defender';
}

// --- Core Game ---

export const ADVANCED_TRACKING_SCHEMA_VERSION = 4;

export type AdvancedGameType = 'game' | 'scrimmage';

export type AdvancedGameEndReason = 'time_limit' | 'weather' | 'conceded' | 'manual';

export const GAME_STATUSES = ['in_progress', 'final', 'terminated'] as const;

export type GameStatus = (typeof GAME_STATUSES)[number];

export type GameClockPauseReason = 'weather' | 'field' | 'admin' | 'manual';

export const FLIP_RESULTS = ['won', 'lost'] as const;

export type FlipResult = (typeof FLIP_RESULTS)[number];

export const FLIP_CHOICES = ['offense', 'defense', 'side'] as const;

export type FlipChoice = (typeof FLIP_CHOICES)[number];

export interface GameFlip {
  result: FlipResult;
  /** Only applies when `result` is `'won'`. Missing means the choice was not recorded. */
  choice?: FlipChoice;
}

export interface GameClockPause {
  id: string;
  reason: GameClockPauseReason;
  pausedAt: number;
  resumedAt?: number;
  pointId?: string;
}

export interface AdvancedTrackedGame {
  id: string;
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
  importedAt?: number;

  gameType: AdvancedGameType;
  status: GameStatus;
  /** Only set when `status` is `'terminated'`. */
  endReason?: AdvancedGameEndReason;

  /**
   * The side the coach is tracking for. Used as the default perspective for stats and UI.
   * In `'single-team'` mode this is always the `full-roster` side and could be derived,
   * but in `'both-teams'` mode it cannot be derived so it is stored explicitly.
   */
  focusSideId: string;
  metadata?: GameMetadata;
  settings: AdvancedTrackingSettings;
  /** Optional pregame flip result and, when won, the focus side's choice. */
  flip?: GameFlip;

  /**
   * Only set when `locationMode` is `'zone'` or `'xy'`. Records which endzone each side
   * attacks at the start of the game. Sides flip after the `halftime` `GameTransition`.
   * Per-point endzone is derived from this — not stored on each point.
   *
   * Scrimmage side-switch support is not yet handled — revisit when needed.
   */
  initialAttackingEndzoneBySide?: Record<string, Endzone>;

  /**
   * Which side received the pull to start the game.
   * Per-point offense is derived: the side that did not score receives next,
   * with roles flipping after the `halftime` `GameTransition`.
   */
  initialReceivingSideId: string;

  sides: GameSide[];
  participants: Participant[];
  /**
   * Derived or timer-driven game-flow transitions: halftime, soft cap, hard cap.
   * Team-controlled between-point events (timeouts, etc.) live on
   * `TrackedPoint.transitionsAfter` instead.
   */
  gameTransitions?: GameTransition[];
  gameClockPauses?: GameClockPause[];
  points: TrackedPoint[];
}

export interface GameMetadata {
  title?: string;
  opponentName?: string;
  location?: string;
  date?: string;
  notes?: string;
}

export interface AdvancedTrackingSettings {
  locationMode: 'none' | 'zone' | 'xy';
  format?: GameFormatSettings;
}

export interface GameFormatSettings {
  /** Extend this union as new formats are supported (e.g. `'ufa'`, `'goaltimate'`). */
  formatType: 'standard';
  gameTo?: number;
  /** Score at which halftime is called, e.g. `8` in a game to 15. */
  halftimeAt?: number;
  /** Whether soft cap tracking is enabled for this game. Missing means enabled for legacy games. */
  softCapEnabled?: boolean;
  /** Whether hard cap tracking is enabled for this game. Missing means enabled for legacy games. */
  hardCapEnabled?: boolean;
  /** Regular timeouts per team per half. */
  timeoutsPerHalf?: number;
  /** Whether a once-per-game floater timeout is available after regulars are used. */
  floaterEnabled?: boolean;
}

// --- Sides & Participants ---

export const SIDE_TRACKING_MODES = ['full-roster', 'anonymous'] as const;

export type SideTrackingMode = (typeof SIDE_TRACKING_MODES)[number];

export interface GameSide {
  id: string;
  /** Display name, e.g. `"Home"`, `"Away"`, `"White"`, `"Dark"`. */
  label: string;
  colorToken?: string;
  /** Set when this side maps to a saved team in the app. */
  sourceTeamId?: string | null;
  /**
   * `'full-roster'`: participants are tracked individually.
   * `'anonymous'`: opponent side where player identity is not captured.
   */
  trackingMode: SideTrackingMode;
}

export interface Participant {
  id: string;
  name: string;
  number?: string;
  /** Set when this participant maps to a saved player in the app. */
  sourcePlayerId?: string | null;
  /**
   * Mirrors `matchingType` from the basic tracking `Player` type.
   * `'fmp'` = female matching player, `'mmp'` = male matching player, `null` = not set.
   * Required for gender ratio validation in mixed games.
   */
  matchingType?: 'fmp' | 'mmp' | null;
  /**
   * Mirrors `role` from the basic tracking `Player` type.
   * Used for display in line selection UI and role-based stat breakdowns.
   */
  role?: 'handler' | 'cutter' | 'hybrid' | null;
}

// --- Points ---

export type Endzone = 'near' | 'far';

export interface PointLine {
  sideId: string;
  /**
   * Participants on this side for this point. The same participant can appear on
   * different sides in different points — important for scrimmages.
   * Between-point subs are implicit: the next point's lines simply reflect the new lineup.
   */
  participantIds: string[];
}

export interface PointSub {
  id: string;
  sideId: string;
  type: 'injury';
  inIds: string[];
  outIds: string[];
  /**
   * Links to the `StoppageAction` that triggered this sub.
   * Use this to locate the sub in the possession/action timeline — e.g. to determine
   * whether the injured player had the disc, and whether play resumed in the same
   * possession or restarted with a `dead_disc_check`.
   */
  stoppageActionId: string;
}

export interface InjurySubChange {
  sideId: string;
  inIds: string[];
  outIds: string[];
}

export interface PointRevivalPause {
  /** Absolute timestamp when the scoring action originally ended the point. */
  pausedAt: number;
  /** Absolute timestamp when undo resumed tracking for the point. */
  resumedAt: number;
}

export interface TrackedPoint {
  id: string;
  /** Optional private coaching note, omitted from sharing and CSV exports. */
  note?: string;
  lines: PointLine[];
  /** Mid-point substitutions. Between-point subs are implicit in the next point's lines. */
  subs?: PointSub[];
  possessions: PointPossession[];
  /** Team-controlled events after this point ended (timeouts). */
  transitionsAfter?: BetweenPointTransition[];
  /**
   * Gender ratio for this point in mixed games.
   * `'more-women'` = FMP (female matching player majority), `'more-men'` = MMP.
   * Only set when relevant.
   */
  genderRatio?: GenderRatio;
  /**
   * Absolute timestamp (ms epoch) when this point started — set when the coach taps START.
   * Point duration and per-action elapsed times are derived from this.
   * Mirrors `pointStartTimestamps` from basic stat tracking.
   */
  startedAt?: number;
  /** Completed dead-time intervals caused by undoing a scoring action. */
  revivalPauses?: PointRevivalPause[];
}

// --- Possessions ---

export interface RedZoneData {
  /** Absolute timestamp (ms epoch) when Red Zone was selected during live play. */
  enteredAt: number;
  /** True when selecting Red Zone created the anonymous possession and pickup scaffold. */
  anonymousScaffold?: true;
}

export interface PointPossession {
  id: string;
  /** Which side holds the disc during this possession. */
  sideId: string;
  /** Live coach observation that this possession entered the attacking red zone. */
  redZone?: RedZoneData;
  actions: PossessionAction[];
}

// --- Transitions ---

/** A timeout called between points. */
export interface BetweenPointTransition {
  id: string;
  transitionType: 'timeout';
  /** Which side called the timeout. */
  sideId: string;
  /** True when this was the one-per-game floater rather than a regular timeout. */
  isFloater?: boolean;
  /** Absolute timestamp (ms epoch) when the between-point timeout was called. */
  startedAt?: number;
  /** Absolute timestamp (ms epoch) when the between-point timeout display was ended. */
  endedAt?: number;
}

export type GameTransition =
  | {
      id: string;
      /** Derived from score progression at halftimeAt, unless marked as an early start. */
      transitionType: 'halftime';
      afterPointId: string;
      triggeredEarly?: boolean;
    }
  | {
      id: string;
      transitionType: 'soft_cap';
      /** Timer-driven event. Soft cap always activates between points. */
      afterPointId: string;
    }
  | {
      id: string;
      transitionType: 'hard_cap';
      /** Timer-driven event. Recorded at the point-end that crosses the hard cap. */
      afterPointId: string;
    };

// --- Player References ---

/**
 * Distinguishes three meaningfully different cases for who performed an action:
 * - `'participant'`: a known tracked player
 * - `'unknown'`: player identity matters for this side but was not captured
 * - `'untracked'`: this side is intentionally anonymous (e.g. opponent in single-team mode)
 */
export type PlayerRef =
  | { refType: 'participant'; participantId: string }
  | { refType: 'unknown' }
  | { refType: 'untracked' };

// --- Field Location ---

export type FieldLocation =
  | { locationType: 'zone'; zoneId: string }
  | { locationType: 'xy'; x: number; y: number };

// --- Actions ---

export type PossessionAction = PullAction | DiscPickupAction | ThrowAction | StoppageAction;

export const PULL_RESULTS = ['inbound', 'ob', 'dropped', 'roller'] as const;

export type PullResult = (typeof PULL_RESULTS)[number];

export interface PullResultSpec {
  /** True when the pull counts as landing in bounds for pull stats. */
  countsAsInbound: boolean;
  /** True when hang time is meaningful for pull hang-time stats. */
  countsHangTime: boolean;
}

/**
 * Single source of pull-result semantics. Adding a `PullResult` fails to compile until it has a
 * spec here; pull stats derive from this table.
 */
export const PULL_RESULT_SPECS = {
  inbound: { countsAsInbound: true, countsHangTime: true },
  ob: { countsAsInbound: false, countsHangTime: false },
  dropped: { countsAsInbound: false, countsHangTime: true },
  roller: { countsAsInbound: true, countsHangTime: false },
} as const satisfies Record<PullResult, PullResultSpec>;

export interface PullAction {
  id: string;
  kind: 'pull';
  /** Side that pulled. */
  sideId: string;
  receivingSideId: string;
  puller: PlayerRef;
  /** Optional — pull may be OB or receiver may be untracked. */
  receiver?: PlayerRef;
  result: PullResult;
  hangTimeMs?: number;
  origin?: FieldLocation;
  landing?: FieldLocation;
  /** Absolute timestamp (ms epoch) when this action was logged. */
  recordedAt?: number;
}

export interface DiscPickupAction {
  id: string;
  kind: 'disc_pickup';
  sideId: string;
  player: PlayerRef;
  location?: FieldLocation;
  /** Absolute timestamp (ms epoch) when this action was logged. */
  recordedAt?: number;
}

export const THROW_RESULTS = [
  'complete',
  'goal',
  'drop',
  'throwaway',
  'stall',
  'block',
  'pressure',
  'callahan',
] as const;

export type ThrowResult = (typeof THROW_RESULTS)[number];

export const THROW_TYPES = ['huck', 'backfield_reset'] as const;

export type ThrowType = (typeof THROW_TYPES)[number];

/**
 * What a throw result does to play:
 * - `'continues'`: the throwing side keeps the disc.
 * - `'scores'`: the throwing side scores and the point ends.
 * - `'turnover'`: the defending side gains possession.
 * - `'defense_scores'`: the defending side intercepts in the end zone and the point ends.
 */
export type ThrowOutcome = 'continues' | 'scores' | 'turnover' | 'defense_scores';

/** The action field that names the player credited with the result, besides the thrower. */
export type ThrowCreditedRole = 'receiver' | 'defender';

export interface ThrowResultSpec {
  outcome: ThrowOutcome;
  creditedRole: ThrowCreditedRole | null;
  /** True when the defender must be a tracked participant (never unknown or untracked). */
  requiresTrackedDefender: boolean;
  /** Manual classifications the result supports. */
  eligibleThrowTypes: readonly ThrowType[];
  /** False when no throw was released (a stall). */
  countsAsAttempt: boolean;
}

/**
 * Single source of throw-result semantics. Adding a `ThrowResult` fails to compile until it has a
 * spec here; predicates, analytics, correction, and import validation derive from this table.
 */
export const THROW_RESULT_SPECS = {
  complete: {
    outcome: 'continues',
    creditedRole: 'receiver',
    requiresTrackedDefender: false,
    eligibleThrowTypes: ['huck'],
    countsAsAttempt: true,
  },
  goal: {
    outcome: 'scores',
    creditedRole: 'receiver',
    requiresTrackedDefender: false,
    eligibleThrowTypes: ['huck'],
    countsAsAttempt: true,
  },
  drop: {
    outcome: 'turnover',
    creditedRole: 'receiver',
    requiresTrackedDefender: false,
    eligibleThrowTypes: ['huck', 'backfield_reset'],
    countsAsAttempt: true,
  },
  throwaway: {
    outcome: 'turnover',
    creditedRole: null,
    requiresTrackedDefender: false,
    eligibleThrowTypes: ['huck', 'backfield_reset'],
    countsAsAttempt: true,
  },
  stall: {
    outcome: 'turnover',
    creditedRole: 'defender',
    requiresTrackedDefender: false,
    eligibleThrowTypes: [],
    countsAsAttempt: false,
  },
  block: {
    outcome: 'turnover',
    creditedRole: 'defender',
    requiresTrackedDefender: false,
    eligibleThrowTypes: ['huck', 'backfield_reset'],
    countsAsAttempt: true,
  },
  pressure: {
    outcome: 'turnover',
    creditedRole: 'defender',
    requiresTrackedDefender: true,
    eligibleThrowTypes: ['huck', 'backfield_reset'],
    countsAsAttempt: true,
  },
  callahan: {
    outcome: 'defense_scores',
    creditedRole: 'defender',
    requiresTrackedDefender: false,
    eligibleThrowTypes: [],
    countsAsAttempt: true,
  },
} as const satisfies Record<ThrowResult, ThrowResultSpec>;

type ThrowResultWithOutcome<O extends ThrowOutcome> = {
  [R in ThrowResult]: (typeof THROW_RESULT_SPECS)[R]['outcome'] extends O ? R : never;
}[ThrowResult];

/** Results that hand possession to the defense without ending the point. */
export type TurnoverThrowResult = ThrowResultWithOutcome<'turnover'>;

/** Results that end a possession by giving the disc (or the point) to the defense. */
export type PossessionLosingThrowResult = ThrowResultWithOutcome<'turnover' | 'defense_scores'>;

export function getEligibleThrowTypes(result: ThrowResult): readonly ThrowType[] {
  return THROW_RESULT_SPECS[result].eligibleThrowTypes;
}

/** True when the throw's defender satisfies its result's tracked-defender requirement. */
export function hasRequiredThrowDefender(
  throwAction: Pick<ThrowAction, 'result' | 'defender'>,
): boolean {
  if (!THROW_RESULT_SPECS[throwAction.result].requiresTrackedDefender) return true;
  return throwAction.defender?.refType === 'participant';
}

export interface ThrowDetails {
  type: ThrowType;
}

export interface ThrowAction {
  id: string;
  kind: 'throw';
  sideId: string;
  thrower: PlayerRef;
  /**
   * Who caught or was in position to catch the throw. Present on `complete` and `goal`
   * (the receiver), and optionally on `drop`. Absent on `throwaway`, `block`,
   * `pressure`, and `callahan` — coaches record what happened, not intent.
   */
  toPlayer?: PlayerRef;
  /**
   * `'stall'` — count reached 10, disc turns over at the spot with no throw.
   * Attributed to the thrower (player holding the disc). No `toPlayer`.
   */
  result: ThrowResult;
  defender?: PlayerRef;
  /** True when blame is shared 50/50 between thrower and toPlayer (e.g. a floaty huck both could have done better on). Single attribution is derived from result + thrower/toPlayer. */
  splitAttribution?: boolean;
  /** Optional manual classification for eligible throw results. */
  details?: ThrowDetails;
  origin?: FieldLocation;
  target?: FieldLocation;
  /** Absolute timestamp (ms epoch) when this action was logged. */
  recordedAt?: number;
}

export const STOPPAGE_REASONS = ['timeout', 'injury', 'manual_pause'] as const;

export type StoppageReason = (typeof STOPPAGE_REASONS)[number];

export interface StoppageAction {
  id: string;
  kind: 'stoppage';
  reason: StoppageReason;
  sideId?: string;
  /** For `reason: 'timeout'`, true when this was the one-per-game floater. */
  isFloater?: boolean;
  /** Absolute timestamp (ms epoch) when this action was logged. */
  recordedAt?: number;
  /**
   * When the point timer was paused — set immediately when the stoppage is logged.
   * Undefined if the point timer was not running.
   */
  pausedAt?: number;
  /**
   * When play resumed and the point timer restarted.
   * Undefined until the coach taps resume. If the stoppage is undone before
   * resuming, neither field affects elapsed time since the action is removed.
   */
  resumedAt?: number;
}
