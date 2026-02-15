import { buildImportedTeam } from '@/lib/import-team/transform';
import { ImportApiSuccessPayload } from '@/lib/import-team/types';

describe('importTeam transform', () => {
  it('suffixes duplicate player names and preserves role mapping', () => {
    const payload: ImportApiSuccessPayload = {
      team: { teamname: 'Noise', division: 'Men' },
      players: [
        { name: 'Alex', position: 'Handler' },
        { name: 'Alex', position: 'Cutter' },
        { name: 'Alex', position: 'Hybrid' },
      ],
    };

    const importedTeam = buildImportedTeam(payload, [], 'Fallback Team');

    expect(importedTeam.roster.map((player) => player.name)).toEqual([
      'Alex',
      'Alex (2)',
      'Alex (3)',
    ]);
    expect(importedTeam.roster.map((player) => player.role)).toEqual([
      'handler',
      'cutter',
      'hybrid',
    ]);
  });

  it('treats duplicates case-insensitively when suffixing names', () => {
    const payload: ImportApiSuccessPayload = {
      team: { teamname: 'Noise', division: 'Men' },
      players: [{ name: 'Casey' }, { name: 'casey' }],
    };

    const importedTeam = buildImportedTeam(payload, [], 'Fallback Team');

    expect(importedTeam.roster[0].name).toBe('Casey');
    expect(importedTeam.roster[1].name).toBe('casey (2)');
  });

  it('truncates long imported team names to 30 chars', () => {
    const payload: ImportApiSuccessPayload = {
      team: {
        teamname: 'Very Long Team Name That Exceeds The Thirty Character Limit',
        division: 'Men',
      },
      players: [{ name: 'Alex' }],
    };

    const importedTeam = buildImportedTeam(payload, [], 'Fallback Team');

    expect(importedTeam.name).toBe('Very Long Team Name That Excee');
    expect(importedTeam.name.length).toBeLessThanOrEqual(30);
  });

  it('keeps team name suffix within length limit for collisions', () => {
    const payload: ImportApiSuccessPayload = {
      team: {
        teamname: 'Very Long Team Name That Exceeds The Thirty Character Limit',
        division: 'Men',
      },
      players: [{ name: 'Alex' }],
    };

    const savedTeams = [{ id: '1', name: 'Very Long Team Name That Excee', roster: [] }];
    const importedTeam = buildImportedTeam(payload, savedTeams, 'Fallback Team');

    expect(importedTeam.name).toBe('Very Long Team Name That E (2)');
    expect(importedTeam.name.length).toBe(30);
  });

  it('truncates long duplicate player names and preserves unique suffixes', () => {
    const payload: ImportApiSuccessPayload = {
      team: { teamname: 'Noise', division: 'Men' },
      players: [{ name: 'Alexanderthegreatname' }, { name: 'Alexanderthegreatname' }],
    };

    const importedTeam = buildImportedTeam(payload, [], 'Fallback Team');

    expect(importedTeam.roster[0].name).toBe('Alexanderthegreatnam');
    expect(importedTeam.roster[1].name).toBe('Alexanderthegrea (2)');
    expect(importedTeam.roster[0].name.length).toBe(20);
    expect(importedTeam.roster[1].name.length).toBe(20);
  });

  it('filters out empty imported player names after trimming', () => {
    const payload: ImportApiSuccessPayload = {
      team: { teamname: 'Noise', division: 'Men' },
      players: [{ name: '  ' }, { name: 'Alex' }],
    };

    const importedTeam = buildImportedTeam(payload, [], 'Fallback Team');

    expect(importedTeam.roster.map((player) => player.name)).toEqual(['Alex']);
  });
});
