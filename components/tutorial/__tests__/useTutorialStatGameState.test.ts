import { act, renderHook } from '@testing-library/react-native';

import useTutorialStatGameState from '@/components/tutorial/useTutorialStatGameState';

describe('useTutorialStatGameState', () => {
  it('completes immediately after assist attribution without a line-selection phase', async () => {
    const onComplete = jest.fn();
    const { result } = await renderHook(() => useTutorialStatGameState(onComplete));

    expect(result.current.phase).toBe('scoreboard');
    await act(() => result.current.handleStartPoint());
    await act(() => result.current.handleBlock());
    expect(result.current.phase).toBe('turnover-entry');

    await act(() => result.current.handleSelectBlocker());
    expect(result.current.phase).toBe('scoreboard');
    await act(() => result.current.handleScoreGoal());
    expect(result.current.phase).toBe('stat-entry');

    await act(() => result.current.handleSelectScorer('f1'));
    expect(result.current.phase).toBe('stat-entry');
    expect(onComplete).not.toHaveBeenCalled();

    await act(() => result.current.handleSelectAssist());
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
