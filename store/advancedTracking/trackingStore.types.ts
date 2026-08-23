import type { CorrectAdvancedGoalScorerInput } from '@/lib/advancedTracking/advancedActionCorrectionUtils';
import type { CorrectAdvancedPointActiveLinesInput } from '@/lib/advancedTracking/advancedPointLineCorrectionUtils';
import type { CaptureIntent, CaptureIntentResult } from '@/lib/advancedTracking/captureIntentUtils';
import type {
  AdvancedGameType,
  AdvancedTrackedGame,
  FieldLocation,
  GameClockPauseReason,
  GameFlip,
  GameMetadata,
  GameSide,
  InjurySubChange,
  Participant,
  PlayerRef,
  PointLine,
  PullResult,
  ThrowType,
} from '@/lib/advancedTracking/types';
import type { GenderRatio } from '@/lib/genderRatioUtils';

export type { InjurySubChange, PullResult };

export interface CreateAdvancedGameInput {
  id?: string;
  gameType?: AdvancedGameType;
  focusSideId: string;
  initialReceivingSideId: string;
  flip?: GameFlip;
  sides: GameSide[];
  participants: Participant[];
  format: {
    gameTo: number;
    halftimeEnabled?: boolean;
    softCapEnabled?: boolean;
    hardCapEnabled?: boolean;
    timeoutsPerHalf?: number;
    floaterEnabled?: boolean;
  };
  metadata?: GameMetadata;
}

export interface RecordPullInput {
  lines: PointLine[];
  puller: PlayerRef;
  receiver?: PlayerRef;
  result: PullResult;
  hangTimeMs?: number;
  origin?: FieldLocation;
  landing?: FieldLocation;
  genderRatio?: GenderRatio;
}

export interface UpdateThrowTypeInput {
  pointId: string;
  possessionId: string;
  actionId: string;
  type?: ThrowType;
}

export interface RecordStoppageInput {
  reason: 'timeout' | 'injury' | 'manual_pause';
  sideId?: string;
  /** For `reason: 'timeout'`, true when this consumes the one-per-game floater. */
  isFloater?: boolean;
}

export interface RecordInjurySubsInput {
  sideId?: string;
  changes: InjurySubChange[];
}

export interface UpdateInjurySubsInput {
  stoppageActionId: string;
  changes: InjurySubChange[];
}

/**
 * Recoverable UI state for the point that has not started yet. It remains separate from the
 * canonical game record until `recordPull` creates that point.
 */
export interface PendingNextPointLineSelection {
  gameId: string;
  afterPointId: string | null;
  participantIdsBySide: Record<string, string[]>;
}

export interface RecordBetweenPointTimeoutInput {
  sideId: string;
  /** True when this consumes the one-per-game floater. */
  isFloater?: boolean;
}

export type AdvancedTrackingUndoEntry =
  | {
      kind: 'action';
      pointId: string;
      possessionId: string;
      actionId: string;
    }
  | {
      kind: 'between_point_timeout';
      pointId: string;
      transitionId: string;
    }
  | {
      kind: 'halftime_early';
      pointId: string;
      transitionId: string;
    }
  | {
      kind: 'amend_pull_result';
      pointId: string;
      possessionId: string;
      actionId: string;
      previousResult: PullResult;
      previousReceiver?: PlayerRef;
    };

export interface AdvancedTrackingState {
  currentGameId: string | null;
  currentGame: AdvancedTrackedGame | null;
  undoStack: AdvancedTrackingUndoEntry[];
  pendingNextPointLineSelection: PendingNextPointLineSelection | null;
  isHalftimeBreakActive: boolean;
  halftimeTimerStartedAt: number | null;
  halftimeTimerDurationSeconds: number;
  loadCurrentGame: () => Promise<AdvancedTrackedGame | null>;
  createGame: (input: CreateAdvancedGameInput) => string;
  clearHalftimeBreak: () => void;
  startHalftimeTimer: () => void;
  pauseHalftimeTimer: (timeLeftSeconds: number) => void;
  adjustHalftimeTimer: (timeLeftSeconds: number, deltaMinutes: number) => void;
  resetHalftimeTimer: () => void;
  savePendingNextPointLineSelection: (sideId: string, participantIds: string[]) => void;
  clearPendingNextPointLineSelection: () => void;
  resetCurrentGame: () => void;
  finalizeGame: () => Promise<void>;
  terminateGame: (endReason: NonNullable<AdvancedTrackedGame['endReason']>) => void;
  finishTerminatedGame: () => Promise<void>;
  updateGameMetadata: (metadata: GameMetadata) => void;
  correctCurrentGoalScorer: (input: CorrectAdvancedGoalScorerInput) => Promise<void>;
  correctCurrentGamePointActiveLines: (
    input: CorrectAdvancedPointActiveLinesInput,
  ) => Promise<void>;
  recordGameTransition: (transitionType: 'soft_cap' | 'hard_cap') => void;
  triggerHalftimeEarly: () => boolean;
  startGameClockPause: (reason: GameClockPauseReason) => string;
  resumeGameClockPause: (pauseId: string) => void;
  recordBetweenPointTimeout: (input: RecordBetweenPointTimeoutInput) => string;
  endBetweenPointTimeout: (transitionId: string) => void;
  recordPull: (input: RecordPullInput) => string;
  amendOpeningPullAsDropped: (receiver: PlayerRef) => void;
  recordCaptureIntent: (intent: CaptureIntent) => CaptureIntentResult;
  updateThrowType: (input: UpdateThrowTypeInput) => void;
  recordStoppage: (input: RecordStoppageInput) => string;
  resumeStoppage: (actionId: string) => void;
  cancelStoppage: (actionId: string) => void;
  recordInjurySubs: (input: RecordInjurySubsInput) => string;
  updateInjurySubs: (input: UpdateInjurySubsInput) => void;
  undoLastOperation: () => boolean;
  importAdvancedGame: (game: AdvancedTrackedGame) => Promise<void>;
  deleteSavedGame: (gameId: string) => Promise<void>;
}
