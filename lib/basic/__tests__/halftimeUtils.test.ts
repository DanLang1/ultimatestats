import { GameEvent } from '@/store/basic/gameStore.types';

import { getActualHalftimeScore, hasReachedHalftime } from '../halftimeUtils';

function goal(
  team: 'team1' | 'team2',
  overrides: Partial<Extract<GameEvent, { type: 'goal' }>> = {},
): Extract<GameEvent, { type: 'goal' }> {
  return {
    type: 'goal',
    team,
    goalPlayerId: null,
    assistPlayerId: null,
    ...overrides,
  };
}

describe('hasReachedHalftime', () => {
  it('returns true when a goal is explicitly marked as the halftime goal', () => {
    const events: GameEvent[] = [goal('team1'), goal('team2', { triggeredHalftime: true })];

    expect(hasReachedHalftime(events, true)).toBe(true);
  });

  it('returns false when no goal is marked as the halftime goal', () => {
    const events: GameEvent[] = [goal('team1'), goal('team2')];

    expect(hasReachedHalftime(events, true)).toBe(false);
  });

  it('ignores halftime markers when auto halftime is disabled', () => {
    const events: GameEvent[] = [goal('team1', { triggeredHalftime: true })];

    expect(hasReachedHalftime(events, false)).toBe(false);
  });
});

describe('getActualHalftimeScore', () => {
  it('returns null when no halftime goal exists', () => {
    const events: GameEvent[] = [goal('team1'), goal('team2')];

    expect(getActualHalftimeScore(events, 8)).toBeNull();
  });

  it('returns null for empty events', () => {
    expect(getActualHalftimeScore([], 8)).toBeNull();
  });

  it('returns the max score at the halftime goal', () => {
    const events: GameEvent[] = [
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team2'),
      goal('team1'),
      goal('team1'),
      goal('team2'),
      goal('team1', { triggeredHalftime: true }),
    ];

    const result = getActualHalftimeScore(events, 8);

    expect(result).not.toBeNull();
    expect(result!.score).toBe(7);
  });

  it('detects early triggering when score is below the scheduled', () => {
    const events: GameEvent[] = [
      goal('team1'),
      goal('team1'),
      goal('team2'),
      goal('team1'),
      goal('team1', { triggeredHalftime: true }),
    ];

    const result = getActualHalftimeScore(events, 8);

    expect(result).not.toBeNull();
    expect(result!.score).toBe(4);
    expect(result!.triggeredEarly).toBe(true);
  });

  it('does not flag as early when score equals scheduled', () => {
    const events: GameEvent[] = [
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1', { triggeredHalftime: true }),
    ];

    const result = getActualHalftimeScore(events, 8);

    expect(result).not.toBeNull();
    expect(result!.score).toBe(8);
    expect(result!.triggeredEarly).toBe(false);
  });

  it('uses team2 score when team2 is ahead at halftime', () => {
    const events: GameEvent[] = [
      goal('team2'),
      goal('team2'),
      goal('team2'),
      goal('team2'),
      goal('team2'),
      goal('team1'),
      goal('team2', { triggeredHalftime: true }),
    ];

    const result = getActualHalftimeScore(events, 8);

    expect(result).not.toBeNull();
    expect(result!.score).toBe(6);
    expect(result!.triggeredEarly).toBe(true);
  });

  it('only counts goals up to and including the halftime marker', () => {
    const events: GameEvent[] = [
      goal('team1'),
      goal('team1'),
      goal('team2', { triggeredHalftime: true }),
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
      goal('team1'),
    ];

    const result = getActualHalftimeScore(events, 8);

    expect(result).not.toBeNull();
    expect(result!.score).toBe(2);
    expect(result!.triggeredEarly).toBe(true);
  });

  it('handles edge case: halftime goal is the first event', () => {
    const events: GameEvent[] = [goal('team1', { triggeredHalftime: true })];

    const result = getActualHalftimeScore(events, 8);

    expect(result).not.toBeNull();
    expect(result!.score).toBe(1);
    expect(result!.triggeredEarly).toBe(true);
  });

  it('score equals scheduled when scheduled score is 1', () => {
    const events: GameEvent[] = [goal('team1', { triggeredHalftime: true })];

    const result = getActualHalftimeScore(events, 1);

    expect(result).not.toBeNull();
    expect(result!.score).toBe(1);
    expect(result!.triggeredEarly).toBe(false);
  });
});
