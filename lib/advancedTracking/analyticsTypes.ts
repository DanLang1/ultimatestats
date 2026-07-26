// Analytics Layer Types
// See docs/future-features/advanced-stat-tracking/analytics-layer.md

import type { GameFlip, GameMetadata, GameSide, PullResult, ThrowResult } from './types';

export type PointState =
  | 'hold' // focus side received and scored
  | 'break' // focus side pulled and scored
  | 'broken' // focus side received, opponent scored
  | 'opp_hold' // focus side pulled, opponent scored
  | 'terminated' // game ended mid-point before a score was recorded
  | 'in_progress'; // point is still being played (mid-game live view)

export type AttributionType =
  | 'goal'
  | 'assist'
  | 'hockey_assist'
  | 'completion'
  | 'throw_attempt'
  | 'receiving_touch'
  | 'throwaway'
  | 'drop'
  | 'stall'
  | 'stall_conceded'
  | 'block'
  | 'pressure'
  | 'callahan'
  | 'pull'
  | 'pull_reception'
  | 'disc_pickup';

export interface AnalyticsPoint {
  id: string;
  pointIndex: number;
  half: 1 | 2;
  /**
   * Perspective-neutral fields — valid regardless of which side you consider the focus.
   * Use these with getPointStateForSide() to derive hold/break/etc. for any side.
   */
  receivingSideId: string;
  pullingSideId: string;
  /** Which side scored this point. Null when the game ended mid-point or the point is in progress. */
  scoringSideId: string | null;
  /**
   * Convenience view of point outcome from game.focusSideId's perspective.
   * For dual-perspective queries (both-team tracking, scrimmages) use getPointStateForSide()
   * instead, which derives state for any sideId without recompiling the game.
   */
  state: PointState;
  /** Participants on the field for this point, by sideId. */
  linesBySide: Record<string, string[]>;
  /**
   * Each side's cumulative score at the START of this point (before this point's outcome).
   * Useful for contextual stats — e.g. "break rate when trailing".
   * Perspective-neutral: keyed by sideId.
   */
  scoresBySide: Record<string, number>;
  genderRatio?: 'more-women' | 'more-men';
  /**
   * Total point duration in ms, excluding paused time from stoppages.
   * Derived from the last action's elapsedMs. Null if timestamps are absent.
   */
  durationMs: number | null;
  /**
   * True when only one side possessed the disc for the entire point (no turnovers).
   * Only ever true for 'hold' or 'opp_hold' — breaks and broken points always involve
   * two possessions by definition, so isCleanHold is always false for those states.
   * Null when the point ended early due to game termination.
   */
  isCleanHold: boolean | null;
}

export type AnalyticsPossessionResult = 'scored' | 'turned_over' | 'terminated' | 'in_progress';

export type AnalyticsTurnoverType =
  | 'drop'
  | 'throwaway'
  | 'stall'
  | 'block'
  | 'pressure'
  | 'callahan';

export interface AnalyticsPossession {
  id: string;
  pointId: string;
  pointIndex: number;
  possessionIndex: number;
  sideId: string;
  result: AnalyticsPossessionResult;
  turnoverType?: AnalyticsTurnoverType;
}

export interface AnalyticsActionBase {
  id: string;
  pointId: string;
  pointIndex: number;
  possessionId: string;
  possessionIndex: number;
  actionIndex: number;
  sideId: string;
  /** Resolved from PlayerRef — null if unknown or untracked. */
  actorId: string | null;
  /** toPlayer on throws, receiver on pull. Null if unknown or untracked. */
  receiverId: string | null;
  defenderId: string | null;
  /**
   * Derived during buildAnalyticsGame by walking the possession's actions array.
   * Not stored in the raw model. Used for hockey assist derivation.
   */
  previousActionId: string | null;
  /**
   * Ms elapsed since the point started. Derived from action.recordedAt - point.startedAt.
   * Null if either timestamp is absent.
   */
  elapsedMs: number | null;
}

export interface PullAnalyticsAction extends AnalyticsActionBase {
  kind: 'pull';
  result: PullResult;
  /** Pull hang time in ms. */
  hangTimeMs?: number;
}

export interface DiscPickupAnalyticsAction extends AnalyticsActionBase {
  kind: 'disc_pickup';
}

export interface ThrowAnalyticsAction extends AnalyticsActionBase {
  kind: 'throw';
  result: ThrowResult;
  splitAttribution: boolean;
}

export interface StoppageAnalyticsAction extends AnalyticsActionBase {
  kind: 'stoppage';
}

export type AnalyticsAction =
  | PullAnalyticsAction
  | DiscPickupAnalyticsAction
  | ThrowAnalyticsAction
  | StoppageAnalyticsAction;

export interface AnalyticsAttribution {
  type: AttributionType;
  participantId: string;
  /** 1.0 standard, 0.5 for split attribution. */
  weight: number;
  actionId: string;
  pointId: string;
}

export interface AnalyticsGame {
  gameType: 'game' | 'scrimmage' | 'practice' | 'other';
  /** The side the coach is tracking for — defines the analytics perspective. */
  focusSideId: string;
  /** The opposing side (non-focus). */
  oppSideId: string;
  /** Which side received the opening pull. */
  initialReceivingSideId: string;
  /** Optional recorded flip result and the focus side's choice when it won. */
  flip?: GameFlip;
  /** Display label for each side, keyed by sideId. */
  sideLabels: Record<string, string>;
  /** Player identity tracking capability for each side, keyed by sideId. */
  sideTrackingModes?: Record<string, GameSide['trackingMode']>;
  /** Display name for each participant, keyed by participantId. */
  participantNames: Map<string, string>;
  metadata?: GameMetadata;
  /** Unix ms timestamp when the game was created — fallback when metadata.date is absent. */
  createdAt: number;
  points: AnalyticsPoint[];
  possessions: AnalyticsPossession[];
  actions: AnalyticsAction[];
  attributions: AnalyticsAttribution[];
}
