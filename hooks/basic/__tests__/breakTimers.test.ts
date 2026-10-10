import { act, renderHook } from '@testing-library/react-native';

import { useGameTimer } from '@/hooks/basic/useGameTimer';
import { useHalftimeTimer } from '@/hooks/basic/useHalftimeTimer';
import { usePointTimer } from '@/hooks/basic/usePointTimer';
import { useTimeoutTimer } from '@/hooks/basic/useTimeoutTimer';
import { useGameStore } from '@/store/basic/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { resetAllStores } from '@/test/fixtures/resetStores';

beforeEach(() => {
  resetAllStores();
  jest.useFakeTimers();
  jest.setSystemTime(100000);
});
afterEach(() => {
  jest.useRealTimers();
});

describe.each([
  {
    label: 'halftime',
    useTimer: useHalftimeTimer,
    timeField: 'halftimeTimeLeft',
    endField: 'halftimeEndTime',
    max: 900,
    step: 60,
    delta: 1,
  },
  {
    label: 'timeout',
    useTimer: useTimeoutTimer,
    timeField: 'timeoutTimeLeft',
    endField: 'timeoutEndTime',
    max: 300,
    step: 10,
    delta: 10,
  },
] as const)('$label countdown', ({ useTimer, timeField, endField, max, step, delta }) => {
  it('uses elapsed wall time, pauses precisely, and resumes from the remaining duration', async () => {
    useGameStore.setState({ [timeField]: 90, [endField]: null });
    const { result } = await renderHook(useTimer);
    await act(() => result.current.toggleTimer());
    expect(useGameStore.getState()[endField]).toBe(190000);
    await act(() => {
      jest.setSystemTime(112300);
      jest.advanceTimersByTime(500);
    });
    expect(result.current.timeLeft).toBe(78);
    await act(() => result.current.toggleTimer());
    expect(result.current.isRunning).toBe(false);
    await act(() => {
      jest.advanceTimersByTime(30000);
    });
    expect(result.current.timeLeft).toBe(78);
    await act(() => result.current.toggleTimer());
    expect(useGameStore.getState()[endField]).toBe(Date.now() + 78000);
  });

  it('adjusts a running timer without losing the absolute deadline', async () => {
    useGameStore.setState({ [timeField]: 90, [endField]: 190000 });
    const { result } = await renderHook(useTimer);
    await act(() => result.current.adjustTimer(delta));
    expect(result.current.timeLeft).toBe(90 + step);
    expect(useGameStore.getState()[endField]).toBe(190000 + step * 1000);
    await act(() => result.current.adjustTimer(-delta));
    expect(useGameStore.getState()[endField]).toBe(190000);
  });

  it('clamps adjustments at zero and the maximum break duration', async () => {
    useGameStore.setState({ [timeField]: 5, [endField]: null });
    const { result } = await renderHook(useTimer);
    await act(() => result.current.adjustTimer(-delta));
    expect(result.current.timeLeft).toBe(0);
    expect(result.current.canDecrement).toBe(false);
    expect(result.current.isComplete).toBe(true);
    await act(() => result.current.adjustTimer(10000));
    expect(result.current.timeLeft).toBe(max);
    expect(result.current.canIncrement).toBe(false);
    expect(useGameStore.getState()[endField]).toBeNull();
  });

  it('continues below zero and displays overtime while the timer is running', async () => {
    useGameStore.setState({ [timeField]: 1, [endField]: 101000 });
    const { result, unmount } = await renderHook(useTimer);
    await act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.timeLeft).toBe(-2);
    expect(result.current.formattedTime).toBe('-0:02');
    expect(result.current.isOvertime).toBe(true);
    await unmount();
    const before = useGameStore.getState()[timeField];
    await act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(useGameStore.getState()[timeField]).toBe(before);
  });
});

describe('game clock', () => {
  it('pauses and resets to the configured hard cap duration', async () => {
    useSettingsStore.setState({ hardCapMins: 80 });
    useGameStore.setState({ timerTimeLeft: 90, timerIsActive: false, timerEndTime: null });
    const { result } = await renderHook(useGameTimer);
    await act(() => result.current.toggleTimer());
    expect(useGameStore.getState().timerEndTime).toBe(190000);
    await act(() => {
      jest.setSystemTime(112300);
      result.current.toggleTimer();
    });
    expect(useGameStore.getState()).toMatchObject({
      timerTimeLeft: 78,
      timerEndTime: null,
      timerIsActive: false,
    });
    await act(() => result.current.resetTimer());
    expect(result.current.timeLeft).toBe(4800);
    expect(result.current.isActive).toBe(false);
  });

  it('marks soft cap pending at the threshold and stops at hard cap despite a delayed tick', async () => {
    useSettingsStore.setState({ softCapMins: 1 });
    useGameStore.setState({
      timerTimeLeft: 90,
      timerIsActive: false,
      timerEndTime: null,
      softCapPending: false,
    });
    const { result } = await renderHook(useGameTimer);
    await act(() => result.current.toggleTimer());
    await act(() => {
      jest.advanceTimersByTime(30000);
    });
    expect(useGameStore.getState().softCapPending).toBe(true);
    await act(() => {
      jest.setSystemTime(210000);
      jest.advanceTimersByTime(500);
    });
    expect(result.current.timeLeft).toBe(0);
    expect(useGameStore.getState()).toMatchObject({ timerEndTime: null, timerIsActive: false });
  });
});

it('freezes a paused point clock and resets its display when the point ends', async () => {
  useGameStore.setState({
    currentPointStartTime: 90000,
    pointTimerPausedElapsed: null,
    pointTimerEnabled: true,
  });
  const { result } = await renderHook(usePointTimer);
  expect(result.current.elapsedSeconds).toBe(10);
  await act(() => {
    jest.advanceTimersByTime(1500);
  });
  expect(result.current.elapsedSeconds).toBe(11);
  await act(() => {
    useGameStore.setState({ pointTimerPausedElapsed: 11500 });
  });
  await act(() => {
    jest.advanceTimersByTime(10000);
  });
  expect(result.current.elapsedSeconds).toBe(11);
  expect(result.current.isPaused).toBe(true);
  await act(() => {
    useGameStore.setState({ currentPointStartTime: null, pointTimerPausedElapsed: null });
  });
  expect(result.current.elapsedSeconds).toBe(0);
  expect(result.current.isActive).toBe(false);
});
