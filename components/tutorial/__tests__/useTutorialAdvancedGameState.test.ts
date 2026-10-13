import { act, renderHook } from '@testing-library/react-native';

import useTutorialAdvancedGameState, {
  isExpectedTutorialAdvancedAction,
} from '../useTutorialAdvancedGameState';

const participant = (participantId: string) => ({ refType: 'participant' as const, participantId });

describe('advanced tutorial point sequence', () => {
  it('accepts only the scripted gesture for each gestures step', () => {
    expect(
      isExpectedTutorialAdvancedAction('gestures', 0, { kind: 'tap', playerId: 'line-mark' }),
    ).toBe(true);
    expect(
      isExpectedTutorialAdvancedAction('gestures', 0, { kind: 'tap', playerId: 'line-jules' }),
    ).toBe(false);
    expect(
      isExpectedTutorialAdvancedAction('gestures', 1, { kind: 'throwaway', via: 'swipe' }),
    ).toBe(true);
    expect(
      isExpectedTutorialAdvancedAction('gestures', 1, { kind: 'throwaway', via: 'button' }),
    ).toBe(false);
    expect(
      isExpectedTutorialAdvancedAction('gestures', 2, { kind: 'tap', playerId: 'line-rachel' }),
    ).toBe(true);
    expect(
      isExpectedTutorialAdvancedAction('gestures', 3, { kind: 'drop', playerId: 'line-jules' }),
    ).toBe(true);
    expect(
      isExpectedTutorialAdvancedAction('gestures', 4, {
        kind: 'pressure',
        playerId: 'line-harper',
      }),
    ).toBe(true);
    expect(
      isExpectedTutorialAdvancedAction('gestures', 5, {
        kind: 'goal',
        playerId: 'line-kelly',
        via: 'swipe',
      }),
    ).toBe(true);
  });

  it('accepts only the scripted button input for each buttons step', () => {
    expect(
      isExpectedTutorialAdvancedAction('buttons', 0, { kind: 'tap', playerId: 'line-rachel' }),
    ).toBe(true);
    expect(
      isExpectedTutorialAdvancedAction('buttons', 1, { kind: 'tap', playerId: 'line-mark' }),
    ).toBe(true);
    expect(
      isExpectedTutorialAdvancedAction('buttons', 2, { kind: 'throwaway', via: 'button' }),
    ).toBe(true);
    expect(
      isExpectedTutorialAdvancedAction('buttons', 2, { kind: 'throwaway', via: 'swipe' }),
    ).toBe(false);
    expect(
      isExpectedTutorialAdvancedAction('buttons', 3, {
        kind: 'pressure',
        playerId: 'line-harper',
      }),
    ).toBe(true);
    expect(
      isExpectedTutorialAdvancedAction('buttons', 4, {
        kind: 'goal',
        playerId: 'line-kelly',
        via: 'button',
      }),
    ).toBe(true);
    expect(
      isExpectedTutorialAdvancedAction('buttons', 4, {
        kind: 'goal',
        playerId: 'line-kelly',
        via: 'swipe',
      }),
    ).toBe(false);
  });

  it('runs the buttons point from block to goal, rejecting untaught inputs', async () => {
    const { result } = await renderHook(() => useTutorialAdvancedGameState('buttons'));

    expect(result.current.oppHasDisc).toBe(true);
    await act(() => result.current.handlers.onPlayerTap(participant('line-rachel')));
    expect(result.current.step).toBe('pass-to-mark');
    expect(result.current.discHolderRef).toEqual(participant('line-rachel'));

    await act(() => result.current.handlers.onPlayerTap(participant('line-mark')));
    expect(result.current.step).toBe('throwaway-by-mark');

    await act(() => result.current.handlers.onThrowaway());
    expect(result.current.step).toBe('throwaway-by-mark');
    expect(result.current.correctionMessage).toBe(
      'Try this step again: Tap T/A to record a throwaway by Mark.',
    );

    await act(() => result.current.footerHandlers.onThrowaway());
    expect(result.current.step).toBe('pressure-by-harper');
    expect(result.current.cue).toEqual({ target: 'more' });

    await act(() => result.current.selectPressure());
    expect(result.current.armedModifier).toBe('pressure');
    expect(result.current.message).toBe('Now tap Harper.');
    await act(() => result.current.handlers.onPlayerTap(participant('line-erin')));
    expect(result.current.correctionMessage).toBe('Now tap Harper.');
    expect(result.current.armedModifier).toBe('pressure');
    await act(() => result.current.handlers.onPlayerTap(participant('line-harper')));
    expect(result.current.step).toBe('goal-to-kelly');
    expect(result.current.discHolderRef).toEqual(participant('line-harper'));
    expect(result.current.cue).toEqual({ target: 'footer', button: 'goal' });

    await act(() => result.current.footerHandlers.onArmTapAction('drop'));
    expect(result.current.armedModifier).toBeNull();
    expect(result.current.correctionMessage).not.toBeNull();

    await act(() => result.current.footerHandlers.onArmTapAction('goal'));
    expect(result.current.armedModifier).toBe('goal');
    expect(result.current.cue).toEqual({
      target: 'chip',
      playerId: 'line-kelly',
      direction: 'right',
    });

    await act(() => result.current.cancelModifier());
    expect(result.current.armedModifier).toBeNull();

    await act(() => result.current.footerHandlers.onArmTapAction('goal'));
    await act(() => result.current.handlers.onPlayerTap(participant('line-kelly')));
    expect(result.current.isComplete).toBe(true);
    expect(result.current.lastResult).toEqual({ kind: 'goal', label: 'Harper + Kelly · Goal' });
  });
});
