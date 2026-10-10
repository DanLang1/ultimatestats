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

it.each([undefined, []])('imports an empty roster when players are %s', (players) => {
  expect(buildImportedTeam({ players }, [], 'Fallback').roster).toEqual([]);
});

it.each([
  [{}, '  Fallback  ', 'Fallback'],
  [{ team: { teamname: '   ' } }, '   ', 'Imported Team'],
])('resolves missing team names %#', (payload, fallback, expected) => {
  expect(buildImportedTeam(payload, [], fallback).name).toBe(expected);
});

it('skips pre-existing player and team suffixes when resolving collisions', () => {
  const imported = buildImportedTeam(
    {
      team: { teamname: 'Noise' },
      players: [{ name: 'Alex (2)' }, { name: 'Alex' }, { name: 'Alex' }],
    },
    [
      { id: '1', name: ' noise ', roster: [] },
      { id: '2', name: 'NOISE (2)', roster: [] },
    ],
    'Fallback',
  );
  expect(imported.name).toBe('Noise (3)');
  expect(imported.roster.map(({ name }) => name)).toEqual(['Alex (2)', 'Alex', 'Alex (3)']);
});

it.each([
  ['Boys', 'mmp'],
  ['Women', 'fmp'],
  ['Girls', 'fmp'],
  ['Open', null],
  [undefined, null],
])('uses division %s for matching regardless of pronouns', (division, matchingType) => {
  const imported = buildImportedTeam(
    {
      team: { division },
      players: [
        { name: 'Alex', pronouns: 's' },
        { name: 'Blair', pronouns: 'h' },
      ],
    },
    [],
    'Fallback',
  );
  expect(imported.roster.map((player) => player.matchingType)).toEqual([
    matchingType,
    matchingType,
  ]);
});

it('normalizes mixed division pronouns and leaves unknown roles unassigned', () => {
  const imported = buildImportedTeam(
    {
      team: { division: ' Mixed ' },
      players: [
        { name: '', position: 'Handler' },
        { name: 'Alex', pronouns: ' H ', position: 'Captain' },
        { name: 'Blair', pronouns: 's' },
        { name: 'Casey', pronouns: 'they' },
        { name: 'Drew' },
      ],
    },
    [],
    'Fallback',
  );
  expect(
    imported.roster.map(({ name, matchingType, role }) => ({ name, matchingType, role })),
  ).toEqual([
    { name: 'Alex', matchingType: 'mmp', role: null },
    { name: 'Blair', matchingType: 'fmp', role: null },
    { name: 'Casey', matchingType: null, role: null },
    { name: 'Drew', matchingType: null, role: null },
  ]);
});
