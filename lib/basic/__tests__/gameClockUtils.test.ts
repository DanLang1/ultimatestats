import { getGameClockSecondsLeft, getRecordedGameClockSecondsLeft } from '../gameClockUtils';

describe('getGameClockSecondsLeft', () => {
  it('returns the stored remainder while the clock is paused', () => {
    expect(getGameClockSecondsLeft({ timerEndTime: null, timerTimeLeft: 1234 }, 999999)).toBe(1234);
  });

  it('derives the live remainder from the deadline while running, rounding up', () => {
    const state = { timerEndTime: 190000, timerTimeLeft: 90 };
    expect(getGameClockSecondsLeft(state, 100000)).toBe(90);
    expect(getGameClockSecondsLeft(state, 112300)).toBe(78);
  });

  it('reports hard cap once the deadline passes, even if the store has not expired it yet', () => {
    const state = { timerEndTime: 190000, timerTimeLeft: 90 };
    expect(getGameClockSecondsLeft(state, 190000)).toBe(0);
    expect(getGameClockSecondsLeft(state, 250000)).toBe(0);
  });
});

describe('getRecordedGameClockSecondsLeft', () => {
  it('returns the stored remainder without consulting the deadline', () => {
    expect(getRecordedGameClockSecondsLeft({ timerTimeLeft: 90 })).toBe(90);
    expect(getRecordedGameClockSecondsLeft({ timerTimeLeft: 0 })).toBe(0);
  });
});
