import { MatchingType, PlayerRole, SavedTeam } from '@/lib/storage/types';

export type RosterPlayerEditResult = 'updated' | 'not-found';
export type RosterPlayerUpdates = {
  /** Already trimmed and checked for duplicates by the caller. */
  name?: string;
  isActive?: boolean;
  matchingType?: MatchingType | null;
  number?: string;
  role?: PlayerRole | null;
};

export type RosterPlayerEdit<Result = RosterPlayerEditResult> = {
  result: Result;
  /** Settles when the edit is written to storage; await it before dismissing the editing screen. */
  persisted: Promise<void>;
};

/** The part of the team store written to AsyncStorage. */
export type PersistedTeamState = {
  teams: SavedTeam[];
  /** Always the id of a team in `teams`. */
  currentTeamId: string;
};
