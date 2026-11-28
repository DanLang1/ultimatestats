import type { StateCreator } from 'zustand';

import { PointLineRecord, SavedGame } from '@/lib/storage';
import type { BasicGameFormatSettings } from '@/store/settingsStore';

/** 'fresh' means the game is still on the pre-game screen. */
type GameSessionStatus = 'fresh' | 'inProgress' | 'finished';
export type TurnoverType = 'block' | 'throwaway' | 'drop' | 'fiftyfifty';
export type TeamSide = 'team1' | 'team2';

// Unified event model - all game events in chronological order
// NOTE: gameId is optional because events are created during live gameplay before the game is saved.
// When a game is saved, gameId is stamped on all events for future-proofing:
// - Currently events are nested in SavedGame.events[], so gameId is redundant
// - But if we later migrate to a flat database table (e.g. SQLite), we'll need gameId as a foreign key
// - Pre-populating it now avoids a data migration when that happens
export type GoalEvent = {
  type: 'goal';
  team: TeamSide;
  goalPlayerId: string | null;
  assistPlayerId: string | null;
  gameId?: string; // Populated on save - links to SavedGame.id
  elapsedMs?: number;
  pointNumber?: number; // Point this event belongs to (absent in games saved before this field existed)
  triggeredHalftime?: boolean; // True if this goal was the one that actually sent the game to halftime
  triggeredSoftcap?: boolean; // True if this goal was the one that activated the soft cap
};

export type TurnoverEvent = {
  type: 'turnover';
  team: TeamSide; // Team receiving the turnover attribution (blocker or team that lost possession)
  subtype: TurnoverType;
  playerId: string | null;
  player2Id?: string | null; // Second player ID for 50/50 turnovers
  gameId?: string; // Populated on save - links to SavedGame.id
  elapsedMs?: number;
  pointNumber?: number; // Point this event belongs to (absent in games saved before this field existed)
};

type TimeoutEvent = {
  type: 'timeout';
  team: TeamSide; // Team that called the timeout
  index: number; // Which timeout slot (0, 1 for regular timeouts)
  isFloater: boolean;
  gameId?: string; // Populated on save - links to SavedGame.id
  elapsedMs?: number;
  pointTimerWasPaused?: boolean; // Timer state BEFORE timeout (for undo restoration)
  pointNumber?: number; // Point this event belongs to (absent in games saved before this field existed)
};

export type GameEvent = GoalEvent | TurnoverEvent | TimeoutEvent;

export type EventUpdates = {
  playerId?: string | null;
  player2Id?: string | null;
  subtype?: TurnoverType;
  team?: TeamSide;
  goalPlayerId?: string | null;
  assistPlayerId?: string | null;
  elapsedMs?: number | null;
};

export type EventToastSignal =
  | { id: number; kind: 'turnover'; event: TurnoverEvent }
  | { id: number; kind: 'undo'; event: GameEvent }
  | { id: number; kind: 'opponentGoal' };

/** The saved-game actions that also change the game in progress, and the pre-SQLite copy. */
export interface SavedGamesSlice {
  /**
   * The saved games the AsyncStorage entry held before SQLite, kept only until they have moved;
   * null when it holds none.
   */
  asyncStorageSavedGames: SavedGame[] | null;
  /** Takes the saved games out of the AsyncStorage entry. */
  dropAsyncStorageSavedGames: () => Promise<void>;

  replaceSavedGamePointLine: (
    gameId: string,
    pointNumber: number,
    playerIds: string[],
  ) => Promise<boolean>;

  saveCurrentGame: () => Promise<void>;
  deleteSavedGames: (ids: string[]) => Promise<void>;
}

/** The pre-game settings the AsyncStorage entry held before they moved to the settings store. */
type LegacyPreGameSettings = Omit<BasicGameFormatSettings, 'hardCapMins'> & {
  team1Color: string;
  team2Color: string;
};

export interface LiveGameSlice {
  /** Kept only until they have moved to the settings store; null when the entry holds none. */
  legacyPreGameSettings: LegacyPreGameSettings | null;
  /** Takes the pre-game settings out of the AsyncStorage entry. */
  dropLegacyPreGameSettings: () => Promise<void>;

  team2Name: string; // Opposing team name (no roster/ID needed)

  team1Score: number;
  team2Score: number;
  team1Timeouts: boolean[];
  team2Timeouts: boolean[];
  team1Floater: boolean;
  team2Floater: boolean;
  floaterEnabled: boolean;
  autoHalftimeEnabled: boolean;
  gameHalf: number;
  gameTo: number;
  baseGameTo: number;

  isSoftCap: boolean;
  softCapPending: boolean;
  // Timers (game clock, halftime, timeout, point) persist only deadlines and paused remainders and
  // are written only on start, pause, adjust, and cap transitions, never per tick: this whole store
  // is one AsyncStorage record. Derive seconds left from the deadline.
  /** Absolute hard-cap deadline while the clock runs; null while paused, reset, or expired. */
  timerEndTime: number | null;
  timerTimeLeft: number;
  currentGameStatus: GameSessionStatus;
  isPostGameFlowPending: boolean;
  currentGameId: string | null; // ID of saved game for current session (prevents duplicates on undo+re-win)

  isHalftimeBreak: boolean;
  halftimeEndTime: number | null; // Absolute timestamp when halftime timer ends
  halftimeTimeLeft: number; // Seconds remaining in halftime break

  pendingTimeoutModal: boolean;
  timeoutEndTime: number | null; // Absolute timestamp when timeout timer ends
  timeoutTimeLeft: number; // Seconds remaining in timeout (default 70)

  statTrackingEnabled: boolean;
  events: GameEvent[];
  pendingStatEntry: { team: TeamSide; pointNumber: number } | null;
  pointTimerEnabled: boolean; // Optional: show "Start Point" button for accurate timing
  currentPointStartTime: number | null; // Working timestamp for current point
  pointStartTimestamps: Record<number, number>; // Finalized timestamps for completed points
  pointTimerPausedElapsed: number | null; // Elapsed ms when paused (null = running)

  possession: TeamSide | null;
  startingPossession: TeamSide | null;
  pendingTurnoverEntry: { receivingTeam: TeamSide } | null;
  eventToastSignal: EventToastSignal | null;

  currentPoint: number;

  currentLine: string[]; // numPlayers playerIds on field now
  pointLines: PointLineRecord[];
  lineConfirmedForNextPoint: boolean;

  /**
   * Leaves pre-game: copies the pre-game settings (opponent name and format) into the live game
   * and marks it in progress, so a relaunch returns to the scoreboard instead of pre-game.
   */
  startGame: () => void;
  setGameToInGame: (score: number) => void;
  incrementScore: (isTeam1: boolean) => { didIncrement: boolean; isHalftime: boolean };
  triggerHalftimeEarly: () => boolean;
  undoLastAction: () => boolean; // Returns true if something was undone
  toggleTimeout: (isTeam1: boolean, index: number) => void;
  resetGame: () => void;
  setSoftCapPending: (pending: boolean) => void;
  /** Starts the hard-cap countdown from `timerTimeLeft`; no-op while already running. */
  startGameClock: () => void;
  /** Stops the countdown and stores the live remainder in `timerTimeLeft`. */
  pauseGameClock: () => void;
  /** Marks the hard cap reached: zero seconds left, clock stopped. */
  expireGameClock: () => void;
  /** Stops the countdown and sets a fresh duration in seconds. */
  resetGameClock: (seconds: number) => void;
  setCurrentGameStatus: (status: GameSessionStatus) => void;
  setPostGameFlowPending: (pending: boolean) => void;
  setHalftimeEndTime: (time: number | null) => void;
  setHalftimeTimeLeft: (seconds: number) => void;
  clearHalftimeBreak: () => void;

  setTimeoutEndTime: (time: number | null) => void;
  setTimeoutTimeLeft: (seconds: number) => void;
  clearTimeoutModal: () => void;

  setStatTrackingEnabled: (enabled: boolean) => void;
  addGoalEvent: (event: { goalPlayerId: string | null; assistPlayerId: string | null }) => void;
  cancelPendingGoal: () => void;
  setPointTimerEnabled: (enabled: boolean) => void;
  startPoint: () => void;
  togglePointTimerPause: () => void;

  setPossession: (team: TeamSide) => void;
  triggerTurnover: () => void;
  addTurnoverEvent: (event: {
    team: TeamSide;
    subtype: TurnoverType;
    playerId: string | null;
    player2Id?: string | null;
  }) => void;
  clearEventToastSignal: () => void;
  clearPendingTurnoverEntry: () => void;

  updateEvent: (eventIndex: number, updates: EventUpdates) => void;
  deleteEvent: (eventIndex: number) => boolean; // Returns false if deletion blocked (goal/assist)

  setCurrentLine: (playerIds: string[]) => void;
  recordLineForPoint: (
    pointNumber: number,
    isSubstitution?: boolean,
    subType?: 'injury' | 'replacement',
  ) => void;
  replacePointLine: (pointNumber: number, playerIds: string[]) => Promise<boolean>;
  setLineConfirmedForNextPoint: (confirmed: boolean) => void;
}

export interface GameState extends SavedGamesSlice, LiveGameSlice {}

export type GameSliceCreator<Slice> = StateCreator<
  GameState,
  [['zustand/immer', never], ['zustand/persist', unknown]],
  [],
  Slice
>;
