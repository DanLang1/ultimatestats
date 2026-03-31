// Advanced Stat Tracking Types
// See docs/future-features/advanced-stat-tracking/data-model.md

// --- Core Game ---

export interface AdvancedTrackedGame {
  id: string;
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;

  trackingScope: 'single-team' | 'both-teams';
  gameType: 'game' | 'scrimmage' | 'practice' | 'other';
  status: 'in_progress' | 'final' | 'terminated';
  endReason?: 'score_limit' | 'time_limit' | 'weather' | 'conceded' | 'manual';

  focusSideId: string;
  metadata?: GameMetadata;
  settings: AdvancedTrackingSettings;

  sides: GameSide[];
  participants: Participant[];
  points: TrackedPoint[];
}

export interface GameMetadata {
  title?: string;
  opponentName?: string;
  location?: string;
  date?: string; // ISO date string: YYYY-MM-DD
  notes?: string;
}

export interface AdvancedTrackingSettings {
  locationMode: 'none' | 'zone' | 'xy';
  scoring?: ScoringSettings;
}

export interface ScoringSettings {
  gameTo?: number;
  halftimeAt?: number;
  softCapAt?: number;
  hardCapAt?: number;
}

// --- Sides & Participants ---

export interface GameSide {
  id: string;
  label: string;
  colorToken?: string;
  sourceTeamId?: string | null;
  trackingMode: 'full-roster' | 'anonymous';
}

export interface Participant {
  id: string;
  name: string;
  sourcePlayerId?: string | null;
}

// --- Points ---

export type Endzone = 'near' | 'far';

export interface PointLineup {
  sideId: string;
  participantIds: string[];
}

export type PointOutcome =
  | {
      outcomeType: 'goal';
      scoringSideId: string;
      possessionId: string;
      actionId: string;
    }
  | { outcomeType: 'unfinished' }
  | { outcomeType: 'abandoned'; reason: 'weather' | 'injury' | 'manual' | 'other' };

export interface TrackedPoint {
  id: string;
  number: number;
  scoreStart: Record<string, number>;
  offenseStartSideId: string;
  attackingEndzoneBySide: Record<string, Endzone>;
  lineups: PointLineup[];
  possessions: PointPossession[];
  outcome: PointOutcome;
  transitionsAfter?: BetweenPointTransition[];
}

// --- Possessions ---

export type PossessionStartedBy =
  | { startType: 'pull_received'; actionId: string }
  | { startType: 'pull_pickup'; actionId: string }
  | { startType: 'turnover'; causedByActionId: string }
  | { startType: 'dead_disc_check'; actionId: string };

export type PossessionEndedBy =
  | { endType: 'goal'; actionId: string }
  | { endType: 'turnover'; actionId: string }
  | { endType: 'stoppage'; actionId: string }
  | { endType: 'end_of_recording' };

export interface PointPossession {
  id: string;
  number: number;
  sideId: string;
  startedBy: PossessionStartedBy;
  actions: PossessionAction[];
  endedBy: PossessionEndedBy;
}

// --- Transitions ---

export type BetweenPointTransition =
  | {
      id: string;
      transitionType: 'timeout';
      sideId: string;
      notes?: string;
    }
  | {
      id: string;
      transitionType: 'halftime' | 'spirit_timeout' | 'injury' | 'administrative' | 'heat_timeout';
      sideId?: string;
      notes?: string;
    };

// --- Player References ---

export type PlayerRef =
  | { refType: 'participant'; participantId: string }
  | { refType: 'unknown' }
  | { refType: 'untracked' };

// --- Field Location ---

export type FieldLocation =
  | { locationType: 'zone'; zoneId: string }
  | { locationType: 'xy'; x: number; y: number };

// --- Turnover Attribution ---

export type TurnoverAttribution =
  | { mode: 'single'; player: PlayerRef }
  | { mode: 'split'; thrower: PlayerRef; receiver: PlayerRef };

// --- Actions ---

export type PossessionAction = PullAction | DiscGainAction | ThrowAction | StoppageAction;

export interface PullAction {
  id: string;
  kind: 'pull';
  sideId: string;
  receivingSideId: string;
  puller: PlayerRef;
  receiver?: PlayerRef;
  result: 'caught' | 'dropped' | 'landed_in_bounds' | 'landed_in_bounds_rolled_out' | 'bricked';
  hangTimeMs?: number;
  origin?: FieldLocation;
  landing?: FieldLocation;
}

export interface DiscGainAction {
  id: string;
  kind: 'disc_gain';
  sideId: string;
  player: PlayerRef;
  source: 'pull_pickup' | 'turnover_pickup' | 'dead_disc_check';
  causedByActionId?: string;
  location?: FieldLocation;
}

export interface ThrowAction {
  id: string;
  kind: 'throw';
  sideId: string;
  thrower: PlayerRef;
  targetSideId: string;
  targetPlayer?: PlayerRef;
  result: 'complete' | 'goal' | 'drop' | 'throwaway' | 'block' | 'callahan';
  defender?: PlayerRef;
  turnoverAttribution?: TurnoverAttribution;
  origin?: FieldLocation;
  target?: FieldLocation;
}

export interface StoppageAction {
  id: string;
  kind: 'stoppage';
  reason: 'timeout' | 'injury';
  sideId?: string;
}
