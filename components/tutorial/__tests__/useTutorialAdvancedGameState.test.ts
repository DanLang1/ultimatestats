import {
  isExpectedTutorialAdvancedAction,
  TUTORIAL_ADVANCED_STEPS,
} from '../useTutorialAdvancedGameState';

describe('advanced tutorial point sequence', () => {
  it('accepts only the scripted action for each step', () => {
    expect(isExpectedTutorialAdvancedAction(0, { kind: 'tap', playerId: 'line-mark' })).toBe(true);
    expect(isExpectedTutorialAdvancedAction(0, { kind: 'tap', playerId: 'line-jules' })).toBe(
      false,
    );
    expect(isExpectedTutorialAdvancedAction(1, { kind: 'throwaway' })).toBe(true);
    expect(isExpectedTutorialAdvancedAction(2, { kind: 'tap', playerId: 'line-rachel' })).toBe(
      true,
    );
    expect(isExpectedTutorialAdvancedAction(3, { kind: 'drop', playerId: 'line-jules' })).toBe(
      true,
    );
    expect(isExpectedTutorialAdvancedAction(4, { kind: 'pressure', playerId: 'line-harper' })).toBe(
      true,
    );
    expect(isExpectedTutorialAdvancedAction(5, { kind: 'goal', playerId: 'line-kelly' })).toBe(
      true,
    );
  });

  it('ends the sequence with the point-ending goal', () => {
    expect(TUTORIAL_ADVANCED_STEPS.at(-1)?.result).toBe('goal');
  });
});
