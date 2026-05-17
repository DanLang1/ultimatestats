import { Player, PointLineRecord } from '@/lib/storage/types';
import {
  computePlayingTime,
  formatPlayingTime,
  getLatestLineForPoint,
  getRecentLines,
  groupPlayersByGenderRole,
  sortByPlayerNumber,
  sortByPointsPlayed,
} from '../lineUtils';

const createPlayer = (
  id: string,
  name: string,
  matchingType: 'mmp' | 'fmp' | null = null,
  role: 'handler' | 'cutter' | 'hybrid' | null = null,
  isActive = true,
  number?: string,
): Player => ({
  id,
  name,
  number,
  matchingType,
  role,
  isActive,
});

describe('sortByPlayerNumber', () => {
  it('sorts numeric player numbers ascending', () => {
    const players: Player[] = [
      createPlayer('1', 'Alice', null, null, true, '12'),
      createPlayer('2', 'Bob', null, null, true, '3'),
      createPlayer('3', 'Carol', null, null, true, '21'),
    ];

    const sorted = sortByPlayerNumber(players);

    expect(sorted.map((p) => p.name)).toEqual(['Bob', 'Alice', 'Carol']);
  });

  it('places unnumbered players after numbered players alphabetically', () => {
    const players: Player[] = [
      createPlayer('1', 'Charlie'),
      createPlayer('2', 'Bob', null, null, true, '7'),
      createPlayer('3', 'Alice'),
    ];

    const sorted = sortByPlayerNumber(players);

    expect(sorted.map((p) => p.name)).toEqual(['Bob', 'Alice', 'Charlie']);
  });
});

describe('groupPlayersByGenderRole', () => {
  it('groups players by gender matching type and role', () => {
    const roster: Player[] = [
      createPlayer('1', 'Alice', 'fmp', 'handler'),
      createPlayer('2', 'Bob', 'mmp', 'cutter'),
      createPlayer('3', 'Carol', 'fmp', 'cutter'),
      createPlayer('4', 'Dave', 'mmp', 'handler'),
      createPlayer('5', 'Eve', null, null), // unassigned
    ];

    const groups = groupPlayersByGenderRole(roster);

    expect(groups).toHaveLength(5);
    expect(groups.find((g) => g.key === 'mmp-handler')?.players).toHaveLength(1);
    expect(groups.find((g) => g.key === 'fmp-handler')?.players).toHaveLength(1);
    expect(groups.find((g) => g.key === 'mmp-cutter')?.players).toHaveLength(1);
    expect(groups.find((g) => g.key === 'fmp-cutter')?.players).toHaveLength(1);
    expect(groups.find((g) => g.key === 'unassigned')?.players).toHaveLength(1);
  });

  it('excludes inactive players', () => {
    const roster: Player[] = [
      createPlayer('1', 'Alice', 'fmp', 'handler', true),
      createPlayer('2', 'Bob', 'mmp', 'cutter', false), // inactive
    ];

    const groups = groupPlayersByGenderRole(roster);

    const allPlayers = groups.flatMap((g) => g.players);
    expect(allPlayers).toHaveLength(1);
    expect(allPlayers[0].name).toBe('Alice');
  });

  it('returns empty array when no active players', () => {
    const roster: Player[] = [createPlayer('1', 'Alice', 'fmp', 'handler', false)];

    const groups = groupPlayersByGenderRole(roster);

    expect(groups).toHaveLength(0);
  });

  it('puts players with no role in unassigned', () => {
    const roster: Player[] = [
      createPlayer('1', 'Alice', 'fmp', null), // has gender but no role
      createPlayer('2', 'Bob', null, 'handler'), // has role but no gender
    ];

    const groups = groupPlayersByGenderRole(roster);

    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('unassigned');
    expect(groups[0].players).toHaveLength(2);
  });

  it('returns groups in consistent order', () => {
    const roster: Player[] = [
      createPlayer('1', 'A', 'fmp', 'handler'),
      createPlayer('2', 'B', 'mmp', 'handler'),
      createPlayer('3', 'C', 'fmp', 'cutter'),
      createPlayer('4', 'D', 'mmp', 'cutter'),
      createPlayer('5', 'E', 'fmp', 'hybrid'),
      createPlayer('6', 'F', 'mmp', 'hybrid'),
      createPlayer('7', 'G', null, null),
    ];

    const groups = groupPlayersByGenderRole(roster);
    const keys = groups.map((g) => g.key);

    // Should be in order: mmp-handler, fmp-handler, mmp-cutter, fmp-cutter, mmp-hybrid, fmp-hybrid, unassigned
    expect(keys).toEqual([
      'mmp-handler',
      'fmp-handler',
      'mmp-cutter',
      'fmp-cutter',
      'mmp-hybrid',
      'fmp-hybrid',
      'unassigned',
    ]);
  });
});

describe('computePlayingTime', () => {
  it('counts points played per player', () => {
    const pointLines: PointLineRecord[] = [
      { pointNumber: 1, playerIds: ['a', 'b', 'c'], timestamp: 1000 },
      { pointNumber: 2, playerIds: ['a', 'b', 'd'], timestamp: 2000 },
      { pointNumber: 3, playerIds: ['a', 'c', 'd'], timestamp: 3000 },
    ];

    const playingTime = computePlayingTime(pointLines);

    expect(playingTime.get('a')).toBe(3);
    expect(playingTime.get('b')).toBe(2);
    expect(playingTime.get('c')).toBe(2);
    expect(playingTime.get('d')).toBe(2);
  });

  it('counts both original and subbed-in players for the same point', () => {
    const pointLines: PointLineRecord[] = [
      { pointNumber: 1, playerIds: ['a', 'b'], timestamp: 1000 },
      { pointNumber: 1, playerIds: ['a', 'c'], timestamp: 1500, isSubstitution: true },
    ];

    const playingTime = computePlayingTime(pointLines);

    expect(playingTime.get('a')).toBe(1); // played the whole point
    expect(playingTime.get('b')).toBe(1); // subbed out but still gets credit
    expect(playingTime.get('c')).toBe(1); // subbed in and gets credit
  });

  it('counts all players from multiple records for same point', () => {
    const pointLines: PointLineRecord[] = [
      { pointNumber: 1, playerIds: ['a', 'b'], timestamp: 1000 },
      { pointNumber: 1, playerIds: ['c', 'd'], timestamp: 1500, isSubstitution: true },
    ];

    const playingTime = computePlayingTime(pointLines);

    // All players who appeared in point 1 get credit
    expect(playingTime.get('a')).toBe(1);
    expect(playingTime.get('b')).toBe(1);
    expect(playingTime.get('c')).toBe(1);
    expect(playingTime.get('d')).toBe(1);
  });

  it('returns empty map when no records', () => {
    const playingTime = computePlayingTime([]);
    expect(playingTime.size).toBe(0);
  });
});

describe('getLatestLineForPoint', () => {
  it('returns an empty array when the point has no records', () => {
    const pointLines: PointLineRecord[] = [
      { pointNumber: 2, playerIds: ['a', 'b'], timestamp: 1000 },
    ];

    expect(getLatestLineForPoint(pointLines, 1)).toEqual([]);
  });

  it('returns the player ids from the latest record for the requested point', () => {
    const pointLines: PointLineRecord[] = [
      { pointNumber: 1, playerIds: ['a', 'b', 'c'], timestamp: 1000 },
      { pointNumber: 1, playerIds: ['a', 'b', 'd'], timestamp: 1500, isSubstitution: true },
      { pointNumber: 2, playerIds: ['e', 'f', 'g'], timestamp: 2000 },
    ];

    expect(getLatestLineForPoint(pointLines, 1)).toEqual(['a', 'b', 'd']);
  });

  it('returns a copy instead of the original playerIds array', () => {
    const pointLines: PointLineRecord[] = [
      { pointNumber: 1, playerIds: ['a', 'b'], timestamp: 1000 },
    ];

    const latestLine = getLatestLineForPoint(pointLines, 1);
    latestLine.push('c');

    expect(pointLines[0]?.playerIds).toEqual(['a', 'b']);
  });
});

describe('getRecentLines', () => {
  it('returns the most recent distinct completed lines', () => {
    const pointLines: PointLineRecord[] = [
      { pointNumber: 1, playerIds: ['a', 'b', 'c'], timestamp: 1000 },
      { pointNumber: 2, playerIds: ['d', 'e', 'f'], timestamp: 2000 },
      { pointNumber: 3, playerIds: ['f', 'e', 'd'], timestamp: 3000 },
      { pointNumber: 4, playerIds: ['g', 'h', 'i'], timestamp: 4000 },
      { pointNumber: 5, playerIds: ['j', 'k', 'l'], timestamp: 5000 },
      { pointNumber: 6, playerIds: ['m', 'n', 'o'], timestamp: 6000 },
      { pointNumber: 7, playerIds: ['p', 'q', 'r'], timestamp: 7000 },
    ];

    const recentLines = getRecentLines(pointLines, 7);

    expect(recentLines).toEqual([
      { pointNumber: 6, playerIds: ['m', 'n', 'o'] },
      { pointNumber: 5, playerIds: ['j', 'k', 'l'] },
      { pointNumber: 4, playerIds: ['g', 'h', 'i'] },
    ]);
  });

  it('uses the latest record for a point when there were substitutions', () => {
    const pointLines: PointLineRecord[] = [
      { pointNumber: 1, playerIds: ['a', 'b', 'c'], timestamp: 1000 },
      { pointNumber: 2, playerIds: ['d', 'e', 'f'], timestamp: 2000 },
      { pointNumber: 2, playerIds: ['d', 'e', 'g'], timestamp: 2500, isSubstitution: true },
      { pointNumber: 3, playerIds: ['h', 'i', 'j'], timestamp: 3000 },
    ];

    const recentLines = getRecentLines(pointLines, 4);

    expect(recentLines).toEqual([
      { pointNumber: 3, playerIds: ['h', 'i', 'j'] },
      { pointNumber: 2, playerIds: ['d', 'e', 'g'] },
      { pointNumber: 1, playerIds: ['a', 'b', 'c'] },
    ]);
  });

  it('ignores the current point and limits results to maxCount', () => {
    const pointLines: PointLineRecord[] = [
      { pointNumber: 1, playerIds: ['a', 'b', 'c'], timestamp: 1000 },
      { pointNumber: 2, playerIds: ['d', 'e', 'f'], timestamp: 2000 },
      { pointNumber: 3, playerIds: ['g', 'h', 'i'], timestamp: 3000 },
      { pointNumber: 4, playerIds: ['j', 'k', 'l'], timestamp: 4000 },
    ];

    const recentLines = getRecentLines(pointLines, 4, 2);

    expect(recentLines).toEqual([
      { pointNumber: 3, playerIds: ['g', 'h', 'i'] },
      { pointNumber: 2, playerIds: ['d', 'e', 'f'] },
    ]);
  });
});

describe('sortByPointsPlayed', () => {
  it('sorts players by points played ascending', () => {
    const players: Player[] = [
      createPlayer('1', 'Alice'),
      createPlayer('2', 'Bob'),
      createPlayer('3', 'Carol'),
    ];

    const playingTime = new Map([
      ['1', 3],
      ['2', 1],
      ['3', 2],
    ]);

    const sorted = sortByPointsPlayed(players, playingTime);

    expect(sorted.map((p) => p.name)).toEqual(['Bob', 'Carol', 'Alice']);
  });

  it('sorts alphabetically when points are equal', () => {
    const players: Player[] = [
      createPlayer('1', 'Charlie'),
      createPlayer('2', 'Alice'),
      createPlayer('3', 'Bob'),
    ];

    const playingTime = new Map([
      ['1', 2],
      ['2', 2],
      ['3', 2],
    ]);

    const sorted = sortByPointsPlayed(players, playingTime);

    expect(sorted.map((p) => p.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('treats missing playing time as 0', () => {
    const players: Player[] = [createPlayer('1', 'Alice'), createPlayer('2', 'Bob')];

    const playingTime = new Map([['1', 5]]);

    const sorted = sortByPointsPlayed(players, playingTime);

    expect(sorted.map((p) => p.name)).toEqual(['Bob', 'Alice']);
  });
});

describe('formatPlayingTime', () => {
  it('formats singular point', () => {
    const playingTime = new Map([['a', 1]]);
    expect(formatPlayingTime('a', playingTime)).toBe('1pt');
  });

  it('formats plural points', () => {
    const playingTime = new Map([['a', 5]]);
    expect(formatPlayingTime('a', playingTime)).toBe('5pts');
  });

  it('formats zero points', () => {
    const playingTime = new Map<string, number>();
    expect(formatPlayingTime('a', playingTime)).toBe('0pts');
  });
});
