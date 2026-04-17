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

export type { PullResult, ThrowResult };

export interface CreateAdvancedGameInput {
  gameType?: AdvancedTrackedGame['gameType'];
  focusSideId: string;
  initialReceivingSideId: string;
  sides: GameSide[];
  participants: Participant[];
  format: { gameTo: number; halftimeEnabled?: boolean; softCapAt?: number; hardCapAt?: number };
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
}

export interface RecordStoppageInput {
  reason: 'timeout' | 'injury';
  sideId?: string;
}

export interface RecordSubInput {
  stoppageActionId: string;
  sideId: string;
  inIds: string[];
  outIds: string[];
}

export interface RecordBetweenPointTimeoutInput {
  sideId: string;
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
      kind: 'sub';
      pointId: string;
      subId: string;
    }
  | {
      kind: 'resume_stoppage';
      pointId: string;
      actionId: string;
    }
  | {
      kind: 'amend_throw_result';
      pointId: string;
      possessionId: string;
      actionId: string;
      previousResult: ThrowResult;
    };

export interface AdvancedTrackingState {
  currentGameId: string | null;
  savedGames: AdvancedTrackedGame[];
  undoStack: AdvancedTrackingUndoEntry[];
  createGame: (input: CreateAdvancedGameInput) => string;
  resetCurrentGame: () => void;
  finalizeGame: () => void;
  terminateGame: (endReason: NonNullable<AdvancedTrackedGame['endReason']>) => void;
  updateGameMetadata: (metadata: GameMetadata) => void;
  recordGameTransition: (transitionType: 'soft_cap' | 'hard_cap') => void;
  recordBetweenPointTimeout: (input: RecordBetweenPointTimeoutInput) => string;
  recordPull: (input: RecordPullInput) => string;
  recordPickup: (input: RecordPickupInput) => string;
  recordThrow: (input: RecordThrowInput) => string;
  amendLastThrowAsGoal: () => void;
  recordStoppage: (input: RecordStoppageInput) => string;
  resumeStoppage: (actionId: string) => void;
  recordSub: (input: RecordSubInput) => void;
  undoLastOperation: () => boolean;
  deleteSavedGame: (gameId: string) => void;
}
