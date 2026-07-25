// Advanced Stat Tracking Types
// See docs/future-features/advanced-stat-tracking/data-model.md

import type { GenderRatio } from '@/lib/genderRatioUtils';

export type PassModifier = 'fifty-fifty' | 'callahan' | 'stall' | 'pressure' | null;

// --- Core Game ---

export const ADVANCED_TRACKING_SCHEMA_VERSION = 2;

export type GameStatus = 'in_progress' | 'final' | 'terminated';

export type GameClockPauseReason = 'weather' | 'field' | 'admin' | 'manual';

export type FlipResult = 'won' | 'lost';

export type FlipChoice = 'offense' | 'defense' | 'side';

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

  gameType: 'game' | 'scrimmage' | 'practice' | 'other';
  status: GameStatus;
  /** Only set when `status` is `'terminated'`. */
  endReason?: 'time_limit' | 'weather' | 'conceded' | 'manual';

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
  trackingMode: 'full-roster' | 'anonymous';
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

export interface TrackedPoint {
  id: string;
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
  /**
   * Timer value (ms elapsed) at the moment the goal/callahan was recorded.
   * Accounts for all previous revivals and pauses, so it chains correctly across
   * multiple undo cycles. Used with revivedAt to resume the timer accurately.
   */
  elapsedMsAtEnd?: number;
  /**
   * Absolute timestamp (ms epoch) when this point was last revived by undoing its goal.
   * Combined with elapsedMsAtEnd: adjustedTimestamp = revivedAt - elapsedMsAtEnd.
   */
  revivedAt?: number;
}

// --- Possessions ---

export interface PointPossession {
  id: string;
  /** Which side holds the disc during this possession. */
  sideId: string;
  actions: PossessionAction[];
}

// --- Transitions ---

export type BetweenPointTransition =
  | {
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
  | {
      id: string;
      transitionType: 'spirit_timeout' | 'administrative' | 'heat_timeout';
      /** Not all stoppages are called by a specific side. */
      sideId?: string;
    };

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
      /** Timer-driven event. May be absent if hard cap ends the game mid-point. */
      afterPointId?: string;
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

export type PullResult = 'inbound' | 'ob' | 'dropped' | 'roller';

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

export type ThrowResult =
  | 'complete'
  | 'goal'
  | 'drop'
  | 'throwaway'
  | 'stall'
  | 'block'
  | 'pressure'
  | 'callahan';

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
  origin?: FieldLocation;
  target?: FieldLocation;
  /** Absolute timestamp (ms epoch) when this action was logged. */
  recordedAt?: number;
}

export interface StoppageAction {
  id: string;
  kind: 'stoppage';
  reason: 'timeout' | 'injury' | 'manual_pause';
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
