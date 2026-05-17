import type {
  AdvancedTrackedGame,
  FieldLocation,
  GameMetadata,
  GameSide,
  Participant,
  PlayerRef,
  PointLine,
  PullResult,
  ThrowResult,
} from '@/lib/advancedTracking/types';
import type { GenderRatio } from '@/lib/genderRatioUtils';

export type { PullResult, ThrowResult };

export interface CreateAdvancedGameInput {
  gameType?: AdvancedTrackedGame['gameType'];
  focusSideId: string;
  initialReceivingSideId: string;
  sides: GameSide[];
  participants: Participant[];
  format: {
    gameTo: number;
    halftimeEnabled?: boolean;
    softCapAt?: number;
    hardCapAt?: number;
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

export interface RecordPickupInput {
  sideId: string;
  player: PlayerRef;
}

export interface RecordThrowInput {
  thrower: PlayerRef;
  result: ThrowResult;
  toPlayer?: PlayerRef;
  defender?: PlayerRef;
  splitAttribution?: boolean;
  /** Visual timer elapsed ms at throw time — used as elapsedMsAtEnd for goal/callahan. */
  timerElapsedMs?: number;
}

export interface RecordStoppageInput {
  reason: 'timeout' | 'injury' | 'manual_pause';
  sideId?: string;
  /** For `reason: 'timeout'`, true when this consumes the one-per-game floater. */
  isFloater?: boolean;
}

export interface RecordSubInput {
  stoppageActionId: string;
  sideId: string;
  inIds: string[];
  outIds: string[];
}

export type UpdateSubInput = RecordSubInput;

export interface CorrectPointLineInput {
  sideId: string;
  participantIds: string[];
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
      kind: 'amend_throw_result';
      pointId: string;
      possessionId: string;
      actionId: string;
      previousResult: ThrowResult;
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
  savedGames: AdvancedTrackedGame[];
  undoStack: AdvancedTrackingUndoEntry[];
  isHalftimeBreakActive: boolean;
  createGame: (input: CreateAdvancedGameInput) => string;
  clearHalftimeBreak: () => void;
  resetCurrentGame: () => void;
  finalizeGame: () => void;
  terminateGame: (endReason: NonNullable<AdvancedTrackedGame['endReason']>) => void;
  updateGameMetadata: (metadata: GameMetadata) => void;
  recordGameTransition: (transitionType: 'soft_cap' | 'hard_cap') => void;
  recordBetweenPointTimeout: (input: RecordBetweenPointTimeoutInput) => string;
  recordPull: (input: RecordPullInput) => string;
  amendOpeningPullAsDropped: (receiver: PlayerRef) => void;
  recordPickup: (input: RecordPickupInput) => string;
  recordThrow: (input: RecordThrowInput) => string;
  amendLastThrowAsGoal: (timerElapsedMs?: number) => void;
  recordStoppage: (input: RecordStoppageInput) => string;
  resumeStoppage: (actionId: string) => void;
  cancelStoppage: (actionId: string) => void;
  recordSub: (input: RecordSubInput) => void;
  updateSub: (input: UpdateSubInput) => void;
  correctPointLine: (input: CorrectPointLineInput) => void;
  undoLastOperation: () => boolean;
  importAdvancedGame: (game: AdvancedTrackedGame) => void;
  deleteSavedGame: (gameId: string) => void;
}
