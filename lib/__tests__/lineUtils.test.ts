import { Player, PointLineRecord } from '@/lib/storage/types';

import {
  computePlayingTime,
  formatPlayingTime,
  getLatestLineForPoint,
  getRecentLines,
  sortByPlayerNumber,
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
