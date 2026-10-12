import { act, renderHook } from '@testing-library/react-native';

import { useCountdownSeconds, useNow } from '@/hooks/useTimer';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(100000);
});
afterEach(() => {
  jest.useRealTimers();
});

describe('useNow', () => {
  it('ticks while enabled and holds its last value while disabled', async () => {
    const { result, rerender } = await renderHook(
      ({ enabled }: { enabled: boolean }) => useNow(enabled),
      {
        initialProps: { enabled: true },
      },
    );
    await act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current).toBe(103000);

    await rerender({ enabled: false });
    await act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(103000);

    await rerender({ enabled: true });
    expect(result.current).toBe(108000);
  });
});

describe('useCountdownSeconds', () => {
  it('returns the full duration while not running', async () => {
    const { result } = await renderHook(() =>
      useCountdownSeconds({ startedAt: null, durationSeconds: 70 }),
    );
    expect(result.current).toBe(70);
  });

  it('counts down from the start timestamp and goes negative in overtime', async () => {
    const { result } = await renderHook(() =>
      useCountdownSeconds({ startedAt: 100000, durationSeconds: 5 }),
    );
    expect(result.current).toBe(5);
    await act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(3);
    await act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(-2);
  });

  it('never adds time when the start is re-baselined between ticks', async () => {
    const { result, rerender } = await renderHook(
      ({ startedAt }: { startedAt: number }) =>
        useCountdownSeconds({ startedAt, durationSeconds: 60 }),
      { initialProps: { startedAt: 100000 } },
    );
    jest.setSystemTime(100600);
    await rerender({ startedAt: 100600 });
    expect(result.current).toBe(60);
  });
});
