import { hasReachedHalftime } from '../halftimeUtils';
import { GameEvent } from '@/store/gameStore.types';

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
