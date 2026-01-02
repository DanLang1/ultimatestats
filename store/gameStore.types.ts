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
      goal: string | null; // Player who scored
      assist: string | null; // Player who assisted
      gameId?: string; // Populated on save - links to SavedGame.id
    }
  | {
      type: 'turnover';
      team: 'team1' | 'team2'; // Team that committed the turnover
      subtype: TurnoverType;
      player: string | null;
      player2?: string | null; // Second player for 50/50 turnovers
      gameId?: string; // Populated on save - links to SavedGame.id
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

  // Stat Tracking
  statTrackingEnabled: boolean;
  events: GameEvent[]; // Unified event log
  pendingStatEntry: { team: 'team1' | 'team2'; pointNumber: number } | null;

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
  setGameTo: (score: number) => void;
  setGameLength: (minutes: number) => void;
  incrementScore: (isTeam1: boolean) => void;
  undoLastAction: () => boolean; // Returns true if something was undone
  toggleTimeout: (isTeam1: boolean, index: number) => void;
  resetTimeouts: (count: number) => void;
  resetGame: () => void;
  triggerSoftCap: () => void;
  setSoftCapPending: (pending: boolean) => void;
  setSoftCapMins: (minutes: number) => void;
  setTimerActive: (active: boolean) => void;
  setTimerEndTime: (time: number | null) => void;
  setTimerTimeLeft: (seconds: number) => void;

  // Stat Tracking Actions
  setStatTrackingEnabled: (enabled: boolean) => void;
  addPlayer: (name: string) => void;
  addGoalEvent: (event: {
    team: 'team1' | 'team2';
    goal: string | null;
    assist: string | null;
  }) => void;
  clearPendingStatEntry: () => void;
  clearRoster: () => void;

  // Turnover Tracking Actions
  setPossession: (team: 'team1' | 'team2') => void;
  triggerTurnover: () => void;
  addTurnoverEvent: (event: {
    team: 'team1' | 'team2';
    subtype: TurnoverType;
    player: string | null;
    player2?: string | null;
  }) => void;
  clearPendingTurnoverEntry: () => void;

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
