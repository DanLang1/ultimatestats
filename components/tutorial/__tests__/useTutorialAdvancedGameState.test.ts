import {
  isExpectedTutorialAdvancedAction,
  TUTORIAL_ADVANCED_STEPS,
} from '../useTutorialAdvancedGameState';

describe('advanced tutorial point sequence', () => {
  it('models a continuous point with passes, turnovers, blocks, rare actions, and a goal', () => {
    expect(TUTORIAL_ADVANCED_STEPS.map((definition) => definition.step)).toEqual([
      'pass-to-blair',
      'drop-by-carl',
      'open-rare',
      'stall-by-carl',
      'throwaway-by-carl',
      'block-by-blair',
      'goal-to-carl',
    ]);
  });

  it('accepts only the scripted action for each step', () => {
    expect(isExpectedTutorialAdvancedAction(0, { kind: 'tap', playerId: 'blair' })).toBe(true);
    expect(isExpectedTutorialAdvancedAction(0, { kind: 'tap', playerId: 'carl' })).toBe(false);
    expect(isExpectedTutorialAdvancedAction(1, { kind: 'drop', playerId: 'carl' })).toBe(true);
    expect(isExpectedTutorialAdvancedAction(3, { kind: 'tap', playerId: 'carl' })).toBe(true);
    expect(isExpectedTutorialAdvancedAction(4, { kind: 'throwaway' })).toBe(true);
    expect(isExpectedTutorialAdvancedAction(5, { kind: 'tap', playerId: 'blair' })).toBe(true);
    expect(isExpectedTutorialAdvancedAction(6, { kind: 'goal', playerId: 'carl' })).toBe(true);
  });

  it('reserves explicit confirmation for the point-ending goal', () => {
    const results = TUTORIAL_ADVANCED_STEPS.map((definition) => definition.result).filter(Boolean);
    expect(results).toEqual(['drop', 'stall', 'throwaway', 'block', 'goal']);
    expect(TUTORIAL_ADVANCED_STEPS.at(-1)?.result).toBe('goal');
  });
});
