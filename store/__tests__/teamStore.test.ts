import AsyncStorage from '@react-native-async-storage/async-storage';

import { Player, SavedTeam } from '@/lib/storage/types';
import { createDeferred } from '@/test/deferred';

import { getCurrentTeam, selectCurrentTeam, useTeamStore } from '../teamStore';
import { PersistedTeamState } from '../teamStore.types';

const TEAM_STORAGE_KEY = 'ultimatestats-team-storage';

function makePlayer(id: string, name: string): Player {
  return { id, name, isActive: true, matchingType: null, role: null };
}

function makeHammers(): SavedTeam {
  return {
    id: 'hammers',
    name: 'Hammers',
    roster: [makePlayer('ana', 'Ana'), makePlayer('ben', 'Ben')],
  };
}

function makeRookies(): SavedTeam {
  return { id: 'rookies', name: 'Rookies', roster: [makePlayer('jo', 'Jo')] };
}

async function readPersistedTeamState(): Promise<PersistedTeamState> {
  const teamEntryJson = await AsyncStorage.getItem(TEAM_STORAGE_KEY);
  if (teamEntryJson === null) throw new Error('Expected a persisted team entry.');
  return JSON.parse(teamEntryJson).state;
}

describe('team store', () => {
  // Hammers is the current team, Rookies the other one.
  beforeEach(async () => {
    await useTeamStore.setState({
      teams: [makeHammers(), makeRookies()],
      currentTeamId: 'hammers',
    });
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts with one empty default team as the current team', () => {
    const { teams, currentTeamId } = useTeamStore.getInitialState();

    expect(teams).toEqual([{ id: currentTeamId, name: 'Team 1', roster: [] }]);
  });

  it('rejects a current team id that no team has', () => {
    expect(() => selectCurrentTeam({ teams: [makeHammers()], currentTeamId: 'rookies' })).toThrow(
      'Current team "rookies" is not in the teams.',
    );
  });

  describe('addPlayer', () => {
    it('adds a trimmed, active player to the current team only', () => {
      const newPlayerId = useTeamStore.getState().addPlayer('  Cleo ');

      expect(newPlayerId).toEqual(expect.any(String));
      expect(getCurrentTeam().roster).toEqual([
        ...makeHammers().roster,
        { id: newPlayerId, name: 'Cleo', isActive: true, matchingType: null, role: null },
      ]);
      expect(useTeamStore.getState().teams[1]).toEqual(makeRookies());
    });

    it.each([
      ['a blank name', '   '],
      ['a name already on the current roster in another case', ' ANA'],
    ])('rejects %s', (_label, name) => {
      expect(useTeamStore.getState().addPlayer(name)).toBeNull();
      expect(getCurrentTeam()).toEqual(makeHammers());
    });

    it('accepts a name that only another team uses', () => {
      expect(useTeamStore.getState().addPlayer('Jo')).toEqual(expect.any(String));
    });
  });

  describe('updateRosterPlayer', () => {
    it('applies the given fields to the player on the current team', () => {
      const { result: editResult } = useTeamStore.getState().updateRosterPlayer('ben', {
        name: 'Benny',
        isActive: false,
        matchingType: 'fmp',
        number: '7',
        role: 'handler',
      });

      expect(editResult).toBe('updated');
      expect(getCurrentTeam().roster).toEqual([
        makePlayer('ana', 'Ana'),
        {
          id: 'ben',
          name: 'Benny',
          isActive: false,
          matchingType: 'fmp',
          number: '7',
          role: 'handler',
        },
      ]);
    });

    it('removes the number when it is set to an empty string', () => {
      useTeamStore.getState().updateRosterPlayer('ben', { number: '7' });

      useTeamStore.getState().updateRosterPlayer('ben', { number: '' });

      expect(getCurrentTeam().roster[1].number).toBeUndefined();
    });

    it('reports a player who is not on the current team', () => {
      expect(useTeamStore.getState().updateRosterPlayer('jo', { isActive: false }).result).toBe(
        'not-found',
      );
      expect(useTeamStore.getState().teams).toEqual([makeHammers(), makeRookies()]);
    });
  });

  it('clears the roster of the current team only', () => {
    useTeamStore.getState().clearRoster();

    expect(useTeamStore.getState().teams).toEqual([
      { id: 'hammers', name: 'Hammers', roster: [] },
      makeRookies(),
    ]);
  });

  describe('setCurrentTeam', () => {
    it('appends a new team, makes it current, and persists both', async () => {
      const imports: SavedTeam = { id: 'imports', name: 'Imports', roster: [] };

      await useTeamStore.getState().setCurrentTeam(imports);

      const expectedState = {
        teams: [makeHammers(), makeRookies(), imports],
        currentTeamId: 'imports',
      };
      expect(useTeamStore.getState()).toMatchObject(expectedState);
      expect(await readPersistedTeamState()).toEqual(expectedState);
    });

    it('replaces an existing team in place and makes it current', async () => {
      const renamedRookies: SavedTeam = { ...makeRookies(), name: 'Sophomores' };

      await useTeamStore.getState().setCurrentTeam(renamedRookies);

      expect(useTeamStore.getState()).toMatchObject({
        teams: [makeHammers(), renamedRookies],
        currentTeamId: 'rookies',
      });
    });
  });

  describe('importTeam', () => {
    it('appends a new team without changing the current team', async () => {
      const imports: SavedTeam = { id: 'imports', name: 'Imports', roster: [] };

      await useTeamStore.getState().importTeam(imports);

      const expectedState = {
        teams: [makeHammers(), makeRookies(), imports],
        currentTeamId: 'hammers',
      };
      expect(useTeamStore.getState()).toMatchObject(expectedState);
      expect(await readPersistedTeamState()).toEqual(expectedState);
    });

    it('replaces the current team in place when the import has its id', async () => {
      const reimportedHammers: SavedTeam = { ...makeHammers(), roster: [makePlayer('dev', 'Dev')] };

      await useTeamStore.getState().importTeam(reimportedHammers);

      expect(useTeamStore.getState().teams).toEqual([reimportedHammers, makeRookies()]);
      expect(getCurrentTeam()).toEqual(reimportedHammers);
    });
  });

  describe('switchTeam', () => {
    it('makes another team current, leaves every team as it was, and persists it', async () => {
      await useTeamStore.getState().switchTeam('rookies');

      const expectedState = { teams: [makeHammers(), makeRookies()], currentTeamId: 'rookies' };
      expect(useTeamStore.getState()).toMatchObject(expectedState);
      expect(await readPersistedTeamState()).toEqual(expectedState);
    });

    it('rejects a team that does not exist', async () => {
      await expect(useTeamStore.getState().switchTeam('imports')).rejects.toThrow(
        'Cannot switch to unknown team "imports".',
      );
      expect(useTeamStore.getState().currentTeamId).toBe('hammers');
    });
  });

  describe('deleteTeam', () => {
    it('removes a team that is not current and persists it', async () => {
      await useTeamStore.getState().deleteTeam('rookies');

      const expectedState = { teams: [makeHammers()], currentTeamId: 'hammers' };
      expect(useTeamStore.getState()).toMatchObject(expectedState);
      expect(await readPersistedTeamState()).toEqual(expectedState);
    });

    it('rejects deleting the current team', async () => {
      await expect(useTeamStore.getState().deleteTeam('hammers')).rejects.toThrow(
        'Cannot delete the current team.',
      );
      expect(useTeamStore.getState().teams).toEqual([makeHammers(), makeRookies()]);
    });
  });

  it.each([
    ['setCurrentTeam', () => useTeamStore.getState().setCurrentTeam(makeRookies())],
    ['importTeam', () => useTeamStore.getState().importTeam(makeRookies())],
    ['switchTeam', () => useTeamStore.getState().switchTeam('rookies')],
    ['deleteTeam', () => useTeamStore.getState().deleteTeam('rookies')],
  ])('does not resolve %s until the storage write finishes', async (_label, runAction) => {
    const storageWrite = createDeferred();
    jest.spyOn(AsyncStorage, 'setItem').mockImplementationOnce(() => storageWrite.promise);
    let didResolve = false;

    const action = runAction().then(() => {
      didResolve = true;
    });
    await Promise.resolve();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(TEAM_STORAGE_KEY, expect.any(String));
    expect(didResolve).toBe(false);

    storageWrite.resolve();
    await action;

    expect(didResolve).toBe(true);
  });
});
