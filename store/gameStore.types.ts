import { SavedGame, SavedTeam } from '@/lib/storage';

export type TurnoverType = 'block' | 'throwaway' | 'drop' | 'fiftyfifty';

// Unified event model - all game events in chronological order
// NOTE: gameId is optional because events are created during live gameplay before the game is saved.
// When a game is saved, gameId is stamped on all events for future-proofing:
// - Currently events are nested in SavedGame.events[], so gameId is redundant
// - But if we later migrate to a flat database table (e.g. SQLite), we'll need gameId as a foreign key
// - Pre-populating it now avoids a data migration when that happens
export type GameEvent =
  | {
      type: 'goal';
      team: 'team1' | 'team2';
      goalPlayerId: string | null; // Player ID who scored
      assistPlayerId: string | null; // Player ID who assisted
      gameId?: string; // Populated on save - links to SavedGame.id
      elapsedMs?: number; // Elapsed game time in ms when goal was scored
    }
  | {
      type: 'turnover';
      team: 'team1' | 'team2'; // Team that committed the turnover
      subtype: TurnoverType;
      playerId: string | null;
      player2Id?: string | null; // Second player ID for 50/50 turnovers
      gameId?: string; // Populated on save - links to SavedGame.id
      elapsedMs?: number; // Elapsed game time in ms when event was recorded
    };

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
  gameLength: number;

  isSoftCap: boolean;
  softCapPending: boolean;
  softCapMins: number;
  timerIsActive: boolean;
  timerEndTime: number | null;
  timerTimeLeft: number;
  gameLocked: boolean;
  currentGameId: string | null; // ID of saved game for current session (prevents duplicates on undo+re-win)

  // Halftime Break
  isHalftimeBreak: boolean;
  halftimeEndTime: number | null; // Absolute timestamp when halftime timer ends
  halftimeTimeLeft: number; // Seconds remaining in halftime break

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

  // Point tracking for timeline
  currentPoint: number;

  // Actions
  setCurrentTeam: (team: SavedTeam) => void;
  setTeam2Name: (name: string) => void;
  setTeamBgColor: (team: 'team1' | 'team2', color: string) => void;
  setFloaterEnabled: (enabled: boolean) => void;
  setAutoHalftimeEnabled: (enabled: boolean) => void;
  setGameTo: (score: number) => void;
  setGameLength: (minutes: number) => void;
  incrementScore: (isTeam1: boolean) => { didIncrement: boolean; isHalftime: boolean };
  undoLastAction: () => boolean; // Returns true if something was undone
  toggleTimeout: (isTeam1: boolean, index: number) => void;
  resetTimeouts: (count: number) => void;
  resetGame: () => void;
  setSoftCapPending: (pending: boolean) => void;
  setSoftCapMins: (minutes: number) => void;
  setTimerActive: (active: boolean) => void;
  setTimerEndTime: (time: number | null) => void;
  setTimerTimeLeft: (seconds: number) => void;
  setGameLocked: (locked: boolean) => void;
  setHalftimeBreak: (active: boolean) => void;
  setHalftimeEndTime: (time: number | null) => void;
  setHalftimeTimeLeft: (seconds: number) => void;
  clearHalftimeBreak: () => void;

  // Stat Tracking Actions
  setStatTrackingEnabled: (enabled: boolean) => void;
  addPlayer: (name: string) => string | null;
  addGoalEvent: (event: {
    team: 'team1' | 'team2';
    goalPlayerId: string | null;
    assistPlayerId: string | null;
  }) => void;
  clearPendingStatEntry: () => void;
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
    },
  ) => Promise<void>;
  deleteSavedGameEvent: (gameId: string, eventIndex: number) => Promise<boolean>;

  // Saved Games & Teams
  savedGames: SavedGame[];
  savedTeams: SavedTeam[];
  loadSavedGames: () => Promise<void>;
  loadSavedTeams: () => Promise<void>;
  saveCurrentGame: () => Promise<void>;
  deleteSavedGame: (id: string) => Promise<void>;
  saveCurrentTeam: () => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  loadTeam: (teamId: string) => void;
}
