import { GameSessionStatus } from '@/lib/basic/gameSessionUtils';
import { PointLineRecord, SavedGame, SavedTeam } from '@/lib/storage';
import { MatchingType, PlayerRole } from '@/lib/storage/types';

export type TurnoverType = 'block' | 'throwaway' | 'drop' | 'fiftyfifty';
export type UpdateRosterPlayerResult =
  | 'updated'
  | 'blocked-current-game-participation'
  | 'not-found';

// Unified event model - all game events in chronological order
// NOTE: gameId is optional because events are created during live gameplay before the game is saved.
// When a game is saved, gameId is stamped on all events for future-proofing:
// - Currently events are nested in SavedGame.events[], so gameId is redundant
// - But if we later migrate to a flat database table (e.g. SQLite), we'll need gameId as a foreign key
// - Pre-populating it now avoids a data migration when that happens
export type GoalEvent = {
  type: 'goal';
  team: 'team1' | 'team2';
  goalPlayerId: string | null; // Player ID who scored
  assistPlayerId: string | null; // Player ID who assisted
  gameId?: string; // Populated on save - links to SavedGame.id
  elapsedMs?: number; // Elapsed game time in ms when goal was scored
  pointNumber?: number; // Point this event belongs to (absent in games saved before this field existed)
  triggeredHalftime?: boolean; // True if this goal was the one that actually sent the game to halftime
  triggeredSoftcap?: boolean; // True if this goal was the one that activated the soft cap
};

export type TurnoverEvent = {
  type: 'turnover';
  team: 'team1' | 'team2'; // Team receiving the turnover attribution (blocker or team that lost possession)
  subtype: TurnoverType;
  playerId: string | null;
  player2Id?: string | null; // Second player ID for 50/50 turnovers
  gameId?: string; // Populated on save - links to SavedGame.id
  elapsedMs?: number; // Elapsed game time in ms when event was recorded
  pointNumber?: number; // Point this event belongs to (absent in games saved before this field existed)
};

export type TimeoutEvent = {
  type: 'timeout';
  team: 'team1' | 'team2'; // Team that called the timeout
  index: number; // Which timeout slot (0, 1 for regular timeouts)
  isFloater: boolean; // Whether this was a floater timeout
  gameId?: string; // Populated on save - links to SavedGame.id
  elapsedMs?: number; // Elapsed game time in ms when timeout was called
  pointTimerWasPaused?: boolean; // Timer state BEFORE timeout (for undo restoration)
  pointNumber?: number; // Point this event belongs to (absent in games saved before this field existed)
};

export type GameEvent = GoalEvent | TurnoverEvent | TimeoutEvent;

export type EventToastSignal =
  | { id: number; kind: 'turnover'; event: TurnoverEvent }
  | { id: number; kind: 'undo'; event: GameEvent }
  | { id: number; kind: 'opponentGoal' };

export interface GameState {
  // Teams
  currentTeam: SavedTeam; // My team (id, name, roster) - defaults to Team 1
  team2Name: string; // Opposing team name (no roster/ID needed)

  // Team colors and game state
  team1BgColor: string;
  team2BgColor: string;
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
  timerIsActive: boolean;
  timerEndTime: number | null;
  timerTimeLeft: number;
  currentGameStatus: GameSessionStatus;
  isPostGameFlowPending: boolean;
  currentGameId: string | null; // ID of saved game for current session (prevents duplicates on undo+re-win)

  // Halftime Break
  isHalftimeBreak: boolean;
  halftimeEndTime: number | null; // Absolute timestamp when halftime timer ends
  halftimeTimeLeft: number; // Seconds remaining in halftime break

  // Timeout Modal
  pendingTimeoutModal: boolean; // Whether to show the timeout modal
  timeoutEndTime: number | null; // Absolute timestamp when timeout timer ends
  timeoutTimeLeft: number; // Seconds remaining in timeout (default 70)

  // Stat Tracking
  statTrackingEnabled: boolean;
  events: GameEvent[]; // Unified event log
  pendingStatEntry: { team: 'team1' | 'team2'; pointNumber: number } | null;
  pointTimerEnabled: boolean; // Optional: show "Start Point" button for accurate timing
  currentPointStartTime: number | null; // Working timestamp for current point
  pointStartTimestamps: Record<number, number>; // Finalized timestamps for completed points
  pointTimerPausedElapsed: number | null; // Elapsed ms when paused (null = running)

  // Turnover Tracking
  possession: 'team1' | 'team2' | null;
  startingPossession: 'team1' | 'team2' | null;
  pendingTurnoverEntry: { receivingTeam: 'team1' | 'team2' } | null;
  eventToastSignal: EventToastSignal | null;

  // Point tracking for timeline
  currentPoint: number;

  // Line Calling
  currentLine: string[]; // 7 playerIds on field now
  pointLines: PointLineRecord[]; // Line records per point

  // Actions
  setCurrentTeam: (team: SavedTeam) => void;
  setTeam2Name: (name: string) => void;
  setTeamBgColor: (team: 'team1' | 'team2', color: string) => void;
  setFloaterEnabled: (enabled: boolean) => void;
  setAutoHalftimeEnabled: (enabled: boolean) => void;
  setGameTo: (score: number) => void;
  setGameToInGame: (score: number) => void;
  incrementScore: (isTeam1: boolean) => { didIncrement: boolean; isHalftime: boolean };
  triggerHalftimeEarly: () => boolean;
  undoLastAction: () => boolean; // Returns true if something was undone
  toggleTimeout: (isTeam1: boolean, index: number) => void;
  resetTimeouts: (count: number) => void;
  resetGame: () => void;
  setSoftCapPending: (pending: boolean) => void;
  setTimerActive: (active: boolean) => void;
  setTimerEndTime: (time: number | null) => void;
  setTimerTimeLeft: (seconds: number) => void;
  setCurrentGameStatus: (status: GameSessionStatus) => void;
  setPostGameFlowPending: (pending: boolean) => void;
  setHalftimeBreak: (active: boolean) => void;
  setHalftimeEndTime: (time: number | null) => void;
  setHalftimeTimeLeft: (seconds: number) => void;
  clearHalftimeBreak: () => void;

  // Timeout Modal Actions
  setPendingTimeoutModal: (pending: boolean) => void;
  setTimeoutEndTime: (time: number | null) => void;
  setTimeoutTimeLeft: (seconds: number) => void;
  clearTimeoutModal: () => void;

  // Stat Tracking Actions
  setStatTrackingEnabled: (enabled: boolean) => void;
  addPlayer: (name: string) => string | null;
  updateRosterPlayer: (
    playerId: string,
    updates: {
      isActive?: boolean;
      matchingType?: MatchingType | null;
      number?: string;
      role?: PlayerRole | null;
    },
  ) => UpdateRosterPlayerResult;
  addGoalEvent: (event: { goalPlayerId: string | null; assistPlayerId: string | null }) => void;
  cancelPendingGoal: () => void;
  clearRoster: () => void;
  setPointTimerEnabled: (enabled: boolean) => void;
  startPoint: () => void;
  togglePointTimerPause: () => void;

  // Turnover Tracking Actions
  setPossession: (team: 'team1' | 'team2') => void;
  triggerTurnover: () => void;
  addTurnoverEvent: (event: {
    team: 'team1' | 'team2';
    subtype: TurnoverType;
    playerId: string | null;
    player2Id?: string | null;
  }) => void;
  clearEventToastSignal: () => void;
  clearPendingTurnoverEntry: () => void;

  // Event Editing Actions
  updateEvent: (
    eventIndex: number,
    updates: {
      playerId?: string | null;
      player2Id?: string | null;
      subtype?: TurnoverType;
      goalPlayerId?: string | null;
      assistPlayerId?: string | null;
      elapsedMs?: number | null;
    },
  ) => void;
  deleteEvent: (eventIndex: number) => boolean; // Returns false if deletion blocked (goal/assist)

  // Saved Game Event Editing Actions
  updateSavedGameEvent: (
    gameId: string,
    eventIndex: number,
    updates: {
      playerId?: string | null;
      player2Id?: string | null;
      subtype?: TurnoverType;
      goalPlayerId?: string | null;
      assistPlayerId?: string | null;
      elapsedMs?: number | null;
    },
  ) => Promise<void>;
  deleteSavedGameEvent: (gameId: string, eventIndex: number) => Promise<boolean>;
  updateSavedGamePlayedAt: (gameId: string, playedAt: number) => Promise<void>;
  updateSavedGameTournament: (gameId: string, tournamentId: string | undefined) => Promise<void>;
  clearTournamentFromGames: (tournamentId: string) => Promise<void>;

  // Line Calling Actions
  setCurrentLine: (playerIds: string[]) => void;
  recordLineForPoint: (
    pointNumber: number,
    isSubstitution?: boolean,
    subType?: 'injury' | 'replacement',
  ) => void;
  replacePointLine: (pointNumber: number, playerIds: string[]) => boolean;
  replaceSavedGamePointLine: (
    gameId: string,
    pointNumber: number,
    playerIds: string[],
  ) => Promise<boolean>;

  // Saved Games & Teams
  savedGames: SavedGame[];
  savedTeams: SavedTeam[];
  saveCurrentGame: () => Promise<void>;
  deleteSavedGame: (id: string) => Promise<void>;
  deleteSavedGames: (ids: string[]) => Promise<void>;
  saveCurrentTeam: (teamOverride?: SavedTeam) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  loadTeam: (teamId: string) => void;
  importGame: (game: SavedGame) => Promise<void>;
  importTeam: (team: SavedTeam) => Promise<void>;
}
