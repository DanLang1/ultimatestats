import {
  ADVANCED_TEST_FOCUS_SIDE_ID,
  ADVANCED_TEST_TIMESTAMP,
  UNTRACKED_PLAYER,
  createAdvancedGameFixture,
  createAdvancedGameScenario,
  participantRef,
} from '@/test/fixtures/advancedGameBuilder';

import { canClearRedZone, canSetRedZone, type CommandAvailability } from '../trackerCommands';
import type { AdvancedTrackedGame } from '../types';

const alex = participantRef('alex');
const blair = participantRef('blair');

/** Focus side (full-roster) receives the pull; the opponent side is anonymous. */
const receivedPull = () =>
  createAdvancedGameScenario().startPoint({
    puller: UNTRACKED_PLAYER,
    receiver: alex,
    startedAt: ADVANCED_TEST_TIMESTAMP,
  });

/** Blair holds the disc in Red Zone, then is subbed out during a resumed injury stoppage. */
const redZoneHolderSubbedOut = () => {
  const game = receivedPull()
    .complete(blair)
    .stoppage('injury', {
      pausedAt: ADVANCED_TEST_TIMESTAMP + 10,
      resumedAt: ADVANCED_TEST_TIMESTAMP + 20,
    })
    .injurySub({ sideId: ADVANCED_TEST_FOCUS_SIDE_ID, outIds: ['blair'], inIds: ['hana'] })
    .build();
  game.points[0].possessions[0].redZone = { enteredAt: ADVANCED_TEST_TIMESTAMP + 5 };
  return game;
};

describe('canSetRedZone', () => {
  const cases: [string, AdvancedTrackedGame, CommandAvailability][] = [
    [
      'before the first point',
      createAdvancedGameFixture(),
      { ok: false, reason: 'point-not-started' },
    ],
    ['after a goal', receivedPull().goal(blair).build(), { ok: false, reason: 'point-over' }],
    [
      'during a stoppage',
      receivedPull().stoppage('manual_pause').build(),
      { ok: false, reason: 'play-paused' },
    ],
    [
      'during a game-clock pause',
      {
        ...receivedPull().build(),
        gameClockPauses: [
          { id: 'pause', reason: 'weather', pausedAt: ADVANCED_TEST_TIMESTAMP + 1 },
        ],
      },
      { ok: false, reason: 'play-paused' },
    ],
    [
      'for a full-roster side before its holder is captured',
      createAdvancedGameScenario()
        .startPoint({ puller: UNTRACKED_PLAYER, pullResult: 'ob' })
        .build(),
      { ok: false, reason: 'holder-required' },
    ],
    ['for a full-roster side with a holder', receivedPull().complete(blair).build(), { ok: true }],
    [
      'for an anonymous side without a holder',
      receivedPull().turnover('throwaway').build(),
      { ok: true },
    ],
  ];

  it.each(cases)('%s', (_label, game, expected) => {
    expect(canSetRedZone(game)).toEqual(expected);
  });

  it('still needs a holder after the holder is subbed out', () => {
    expect(canSetRedZone(redZoneHolderSubbedOut())).toEqual({
      ok: false,
      reason: 'holder-required',
    });
  });
});

describe('canClearRedZone', () => {
  it.each<[string, AdvancedTrackedGame, CommandAvailability]>([
    [
      'before the first point',
      createAdvancedGameFixture(),
      { ok: false, reason: 'point-not-started' },
    ],
    ['after a goal', receivedPull().goal(blair).build(), { ok: false, reason: 'point-over' }],
    [
      'during a stoppage',
      receivedPull().stoppage('manual_pause').build(),
      { ok: false, reason: 'play-paused' },
    ],
    ['after the holder is subbed out', redZoneHolderSubbedOut(), { ok: true }],
  ])('%s', (_label, game, expected) => {
    expect(canClearRedZone(game)).toEqual(expected);
  });
});
