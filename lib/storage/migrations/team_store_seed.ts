import type { PersistedTeamState } from '@/store/teamStore.types';

import { SavedTeam } from '../types';

/** Team data as 2.6.x kept it in the basic game store: a current team plus saved copies. */
export type LegacyBasicGameTeams = {
  currentTeam: SavedTeam;
  /** Read straight from storage, so not yet known to be the `SavedTeam[]` 2.6.x always wrote. */
  savedTeams: unknown;
};

/**
 * Builds the team store's first state from the 2.6.x basic game store. The current team is the
 * truth where it differs from its saved copy (after Clear All the saved copy still has the players),
 * and a current team that was never saved joins the list at the end.
 */
export function seedTeamStateFromLegacyBasicGame({
  currentTeam,
  savedTeams,
}: LegacyBasicGameTeams): PersistedTeamState {
  if (!Array.isArray(savedTeams)) {
    throw new Error('Basic game storage has a current team but no saved teams list.');
  }

  const legacySavedTeams: SavedTeam[] = savedTeams;

  const isCurrentTeamSaved = legacySavedTeams.some((team) => team.id === currentTeam.id);
  const teams = isCurrentTeamSaved
    ? legacySavedTeams.map((team) => (team.id === currentTeam.id ? currentTeam : team))
    : [...legacySavedTeams, currentTeam];

  return { teams, currentTeamId: currentTeam.id };
}
