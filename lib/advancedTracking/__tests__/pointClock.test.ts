import {
  createAdvancedGameScenario,
  participantRef,
  UNTRACKED_PLAYER,
} from '@/test/fixtures/advancedGameBuilder';

import { getPointTimer, type PointTimer } from '../pointClock';

const alex = participantRef('alex');
const blair = participantRef('blair');

/** What the score bar shows at `now`. */
function shownMs({ base, frozenAt }: PointTimer, now = 0): number {
  return (frozenAt ?? now) - base!;
}

// Goal at 11s undone at 21s, then a pass and a timeout that opens at 25s.
function buildRevivedPointWithTimeout(timeoutResumedAt?: number) {
  const game = createAdvancedGameScenario()
    .startPoint({ id: 'pt1', puller: UNTRACKED_PLAYER, startedAt: 1_000, recordedAt: 1_000 })
    .pickup(alex, { recordedAt: 2_000 })
    .complete(blair, { recordedAt: 23_000 })
    .stoppage('timeout', { recordedAt: 25_000, pausedAt: 25_000, resumedAt: timeoutResumedAt })
    .build();
  game.points[0].revivalPauses = [{ pausedAt: 11_000, resumedAt: 21_000 }];
  return game;
}

describe('getPointTimer', () => {
  it('freezes the live timer at an open stoppage after an undone goal', () => {
    const game = buildRevivedPointWithTimeout();

    const timer = getPointTimer(game, game.points[0]);

    expect(timer.frozenAt).toBe(25_000);
    expect(shownMs(timer)).toBe(14_000);
  });

  it('excludes a resumed stoppage after an undone goal from the running timer', () => {
    const game = buildRevivedPointWithTimeout(30_000);

    const timer = getPointTimer(game, game.points[0]);

    expect(timer.frozenAt).toBeNull();
    expect(shownMs(timer, 40_000)).toBe(24_000);
  });

  it('freezes the timer at the scoring action once the point has ended', () => {
    const game = createAdvancedGameScenario({
      gameClockPauses: [{ id: 'cap', reason: 'weather', pausedAt: 50_000, resumedAt: 60_000 }],
    })
      .startPoint({ id: 'pt1', puller: UNTRACKED_PLAYER, startedAt: 1_000, recordedAt: 1_000 })
      .pickup(alex, { recordedAt: 2_000 })
      .stoppage('injury', { recordedAt: 5_000, pausedAt: 5_000, resumedAt: 10_000 })
      .goal(blair, { recordedAt: 21_000 })
      .build();

    const timer = getPointTimer(game, game.points[0]);

    expect(timer.frozenAt).toBe(21_000);
    expect(shownMs(timer)).toBe(15_000);
  });

  it('ignores a game-clock pause that ended before the point started', () => {
    const game = createAdvancedGameScenario({
      gameClockPauses: [{ id: 'cap', reason: 'weather', pausedAt: 200, resumedAt: 800 }],
    })
      .startPoint({ id: 'pt1', puller: UNTRACKED_PLAYER, startedAt: 1_000, recordedAt: 1_000 })
      .pickup(alex, { recordedAt: 2_000 })
      .goal(blair, { recordedAt: 21_000 })
      .build();

    expect(shownMs(getPointTimer(game, game.points[0]))).toBe(20_000);
  });

  it('keeps the goal time on screen when the goal is undone during a cap pause', () => {
    const game = createAdvancedGameScenario({
      gameClockPauses: [{ id: 'cap', reason: 'manual', pausedAt: 13_000 }],
    })
      .startPoint({ id: 'pt1', puller: UNTRACKED_PLAYER, startedAt: 1_000, recordedAt: 1_000 })
      .pickup(alex, { recordedAt: 2_000 })
      .build();
    // Goal at 11s, cap pause opened at 13s, goal undone at 21s while still paused.
    game.points[0].revivalPauses = [{ pausedAt: 11_000, resumedAt: 21_000 }];

    const timer = getPointTimer(game, game.points[0]);

    expect(timer.frozenAt).toBe(13_000);
    expect(shownMs(timer)).toBe(10_000);
  });
});
