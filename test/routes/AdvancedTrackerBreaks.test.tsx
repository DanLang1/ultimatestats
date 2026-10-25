import { act, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import TrackerScreen from '@/app/(main)/advanced-tracking/tracker';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { participantRef } from '@/test/fixtures/advancedGameBuilder';
import { arrangeAdvancedPickupGame } from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

const gameStartedAt = Date.UTC(2026, 0, 1);
beforeEach(() => {
  resetAllStores();
  resetMockRouter();
  jest.useFakeTimers();
  jest.setSystemTime(gameStartedAt);
});
afterEach(() => {
  jest.useRealTimers();
});

describe('between-point breaks', () => {
  beforeEach(() => {
    arrangeAdvancedPickupGame({ startedAt: gameStartedAt - 45_000 });
    const result = useAdvancedTrackingStore
      .getState()
      .recordCaptureIntent({ kind: 'goal', scorer: participantRef('blair') });
    if (!result.ok) throw new Error(`Could not arrange completed point: ${result.reason}`);
  });

  it('freezes halftime when paused and resumes from the remaining duration', async () => {
    if (!useAdvancedTrackingStore.getState().triggerHalftimeEarly())
      throw new Error('Expected halftime setup');
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderScreen(<TrackerScreen />);
    const toggle = () => screen.getByTestId('halftime-between-point-timer-toggle');
    await user.press(toggle());
    await act(() => {
      jest.advanceTimersByTime(30000);
    });
    expect(screen.getByText('6:30')).toBeVisible();
    await user.press(toggle());
    expect(useAdvancedTrackingStore.getState().halftimeTimerStartedAt).toBeNull();
    await act(() => {
      jest.advanceTimersByTime(60000);
    });
    expect(screen.getByText('6:30')).toBeVisible();
    await user.press(toggle());
    await act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(screen.getByText('6:20')).toBeVisible();
    expect(useAdvancedTrackingStore.getState().isHalftimeBreakActive).toBe(true);
  });

  it('keeps halftime active and displays overtime after its countdown expires', async () => {
    if (!useAdvancedTrackingStore.getState().triggerHalftimeEarly())
      throw new Error('Expected halftime setup');
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderScreen(<TrackerScreen />);
    await user.press(screen.getByTestId('halftime-between-point-timer-toggle'));
    await act(() => {
      jest.advanceTimersByTime(425000);
    });
    expect(screen.getByText('-0:05')).toBeVisible();
    expect(useAdvancedTrackingStore.getState().isHalftimeBreakActive).toBe(true);
    expect(screen.getByText('START 2ND HALF')).toBeVisible();
  });

  it('ends a between-point timeout without starting or changing the next point', async () => {
    const startedAt = Date.now();
    useAdvancedTrackingStore.getState().recordBetweenPointTimeout({ sideId: 'focus' });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderScreen(<TrackerScreen />);
    expect(screen.getByText('TIMEOUT')).toBeVisible();
    await act(() => {
      jest.advanceTimersByTime(10000);
    });
    await user.press(screen.getByTestId('between-point-end-timeout'));
    const game = useAdvancedTrackingStore.getState().currentGame!;
    expect(game.points).toHaveLength(1);
    const timeout = game.points[0].transitionsAfter![0];
    expect(timeout.endedAt! - startedAt).toBeGreaterThanOrEqual(10000);
    expect(screen.queryByTestId('between-point-end-timeout')).not.toBeOnTheScreen();
    expect(screen.getByTestId('between-point-start-next')).toBeVisible();
  });

  it('keeps the point timer at the point duration while the game clock is paused', async () => {
    await act(() => {
      jest.advanceTimersByTime(10_000);
    });
    useAdvancedTrackingStore.getState().startGameClockPause('manual');
    await act(() => {
      jest.advanceTimersByTime(20_000);
    });
    await renderScreen(<TrackerScreen />);
    expect(screen.getByTestId('scorebar-point-timer')).toHaveTextContent('0:45');
  });

  it('adjusts halftime by minutes and prevents decreasing below its minimum', async () => {
    if (!useAdvancedTrackingStore.getState().triggerHalftimeEarly())
      throw new Error('Expected halftime setup');
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderScreen(<TrackerScreen />);
    await user.press(screen.getByRole('button', { name: 'Increase halftime by one minute' }));
    expect(screen.getByText('8:00')).toBeVisible();
    for (let count = 0; count < 8; count++)
      await user.press(screen.getByRole('button', { name: 'Decrease halftime by one minute' }));
    expect(screen.getByText('0:00')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Decrease halftime by one minute' })).toBeDisabled();
    await user.press(screen.getByRole('button', { name: 'Decrease halftime by one minute' }));
    expect(screen.getByText('0:00')).toBeVisible();
  });
});

describe('stoppages', () => {
  beforeEach(() => {
    arrangeAdvancedPickupGame({ startedAt: gameStartedAt });
  });

  it('counts down a timeout past zero and resumes without changing possession', async () => {
    const id = useAdvancedTrackingStore
      .getState()
      .recordStoppage({ reason: 'timeout', sideId: 'focus' });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderScreen(<TrackerScreen />);
    expect(screen.getByText('TIMEOUT')).toBeVisible();
    expect(screen.getByText('1:10')).toBeVisible();
    await act(async () => jest.advanceTimersByTime(75_000));
    expect(screen.getByText('-0:05')).toBeVisible();
    await user.press(screen.getByTestId('stoppage-resume'));
    expect(screen.queryByText('TIMEOUT')).not.toBeOnTheScreen();
    const game = useAdvancedTrackingStore.getState().currentGame!;
    expect(game.points[0].possessions).toHaveLength(1);
    expect(game.points[0].possessions[0].actions.find((action) => action.id === id)).toMatchObject({
      resumedAt: expect.any(Number),
    });
  });

  it('cancels a timeout and removes its pending stoppage record', async () => {
    useAdvancedTrackingStore.getState().recordStoppage({ reason: 'timeout', sideId: 'opponent' });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderScreen(<TrackerScreen />);
    expect(screen.getByText('TIMEOUT')).toBeVisible();
    await user.press(screen.getByTestId('stoppage-cancel'));
    expect(screen.queryByText('TIMEOUT')).not.toBeOnTheScreen();
  });

  it('freezes a manually paused point and resumes its clock from the same elapsed time', async () => {
    jest.setSystemTime(gameStartedAt + 25_000);
    useAdvancedTrackingStore.getState().recordStoppage({ reason: 'manual_pause' });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderScreen(<TrackerScreen />);
    expect(screen.getByText('PAUSED')).toBeVisible();
    screen.getAllByText('0:25').forEach((timer) => expect(timer).toBeVisible());
    await act(async () => jest.advanceTimersByTime(20_000));
    screen.getAllByText('0:25').forEach((timer) => expect(timer).toBeVisible());
    await user.press(screen.getByTestId('stoppage-resume'));
    expect(screen.queryByText('PAUSED')).not.toBeOnTheScreen();
    screen.getAllByText('0:25').forEach((timer) => expect(timer).toBeVisible());
  });

  it('opens injury-sub editing from a recorded injury stoppage', async () => {
    useAdvancedTrackingStore.getState().recordStoppage({ reason: 'injury', sideId: 'focus' });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderScreen(<TrackerScreen />);
    expect(screen.getByText('INJURY')).toBeVisible();
    await user.press(screen.getByTestId('stoppage-edit-sub'));
    expect(router.push).toHaveBeenCalledWith('/advanced-tracking/tracker-injury-sub');
  });

  it('bounds timeout adjustments and starts the next timeout with its default duration', async () => {
    useAdvancedTrackingStore.getState().recordStoppage({ reason: 'timeout', sideId: 'focus' });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderScreen(<TrackerScreen />);
    for (let count = 0; count < 23; count++)
      await user.press(screen.getByRole('button', { name: 'Increase timeout by 10 seconds' }));
    expect(screen.getByRole('button', { name: 'Increase timeout by 10 seconds' })).toBeDisabled();
    // The 5:00 maximum, less the few fake seconds the presses themselves consume.
    expect(screen.getByText(/^(5:00|4:5\d)$/)).toBeVisible();
    for (let count = 0; count < 30; count++)
      await user.press(screen.getByRole('button', { name: 'Decrease timeout by 10 seconds' }));
    expect(screen.getByRole('button', { name: 'Decrease timeout by 10 seconds' })).toBeDisabled();
    // A zero-second timeout has already run out, so it counts past zero.
    expect(screen.getByText(/^-0:\d\d$/)).toBeVisible();
    await user.press(screen.getByTestId('stoppage-resume'));
    await act(() => {
      useAdvancedTrackingStore.getState().recordStoppage({ reason: 'timeout', sideId: 'opponent' });
    });
    expect(screen.getByText('1:10')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Increase timeout by 10 seconds' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Decrease timeout by 10 seconds' })).toBeEnabled();
  });
});
