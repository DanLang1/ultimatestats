import { SavedGame, SavedTeam } from '@/lib/storage';

export type TurnoverType = 'block' | 'throwaway' | 'drop' | 'fiftyfifty';

// Unified event model - all game events in chronological order
export type GameEvent =
  | {
      type: 'goal';
      team: 'team1' | 'team2';
      goal: string | null; // Player who scored
      assist: string | null; // Player who assisted
    }
  | {
      type: 'turnover';
      team: 'team1' | 'team2'; // Team that committed the turnover
      subtype: TurnoverType;
      player: string | null;
      player2?: string | null; // Second player for 50/50 turnovers
    };

export interface GameState {
  // State
  team1Name: string;
  team2Name: string;
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
  team1Roster: string[];
  events: GameEvent[]; // Unified event log
  pendingStatEntry: { team: 'team1' | 'team2'; pointNumber: number } | null;

  // Turnover Tracking
  possession: 'team1' | 'team2' | null;
  startingPossession: 'team1' | 'team2' | null;
  pendingTurnoverEntry: { receivingTeam: 'team1' | 'team2' } | null;

  // Point tracking for timeline
  currentPoint: number;

  // Actions
  setTeamNames: (team1: string, team2: string) => void;
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
  setRoster: (team: 'team1' | 'team2', roster: string[]) => void;
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
  saveTeam: (name: string, roster: string[]) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  loadTeamRoster: (teamId: string, targetTeam: 'team1' | 'team2') => void;
}
