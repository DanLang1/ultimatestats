import { seedTeamStateFromLegacyBasicGame } from '../migrations/team_store_seed';
import { Player, SavedTeam } from '../types';

function makePlayer(id: string): Player {
  return { id, name: id, isActive: true, matchingType: null, role: null };
}

const hammers: SavedTeam = { id: 'hammers', name: 'Hammers', roster: [makePlayer('ana')] };
const rookies: SavedTeam = { id: 'rookies', name: 'Rookies', roster: [makePlayer('jo')] };
const imports: SavedTeam = { id: 'imports', name: 'Imports', roster: [makePlayer('nia')] };

describe('seedTeamStateFromLegacyBasicGame', () => {
  it('keeps the saved order and replaces the stale saved copy with the current team', () => {
    const clearedRookies: SavedTeam = { ...rookies, roster: [] };

    expect(
      seedTeamStateFromLegacyBasicGame({
        currentTeam: clearedRookies,
        savedTeams: [hammers, rookies, imports],
      }),
    ).toEqual({ teams: [hammers, clearedRookies, imports], currentTeamId: 'rookies' });
  });

  it('appends a current team that was never saved', () => {
    const unsavedTeam: SavedTeam = { id: 'unsaved', name: 'Team 1', roster: [makePlayer('quin')] };

    expect(
      seedTeamStateFromLegacyBasicGame({
        currentTeam: unsavedTeam,
        savedTeams: [hammers, rookies],
      }),
    ).toEqual({ teams: [hammers, rookies, unsavedTeam], currentTeamId: 'unsaved' });
  });

  it.each([
    ['missing', undefined],
    ['not a list', { hammers }],
  ])('rejects a basic entry whose saved teams are %s', (_label, savedTeams) => {
    expect(() => seedTeamStateFromLegacyBasicGame({ currentTeam: hammers, savedTeams })).toThrow(
      'no saved teams list',
    );
  });
});
