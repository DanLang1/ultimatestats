import {
  ADVANCED_TEST_FOCUS_SIDE_ID,
  ADVANCED_TEST_OPPONENT_SIDE_ID,
  ADVANCED_TEST_SIDES,
  ADVANCED_TEST_TIMESTAMP,
  UNTRACKED_PLAYER,
  createAdvancedGameFixture,
  createAdvancedGameScenario,
  participantRef,
} from '@/test/fixtures/advancedGameBuilder';

import type { AdvancedTrackingUndoEntry } from '../persistenceTypes';
import {
  canAmendOpeningPull,
  canChangeLine,
  canClearRedZone,
  canPauseGameClock,
  canRecordStoppage,
  canSetRedZone,
  canUndo,
  getGameClockPauseTapTarget,
  getStoppageTapTarget,
  planTimeout,
  type CommandAvailability,
  type PauseTapTarget,
  type TimeoutAvailability,
} from '../trackerCommands';
import type { AdvancedTrackedGame, GameFormatSettings } from '../types';

const alex = participantRef('alex');
const blair = participantRef('blair');

/** Focus side (full-roster) receives the pull; the opponent side is anonymous. */
const receivedPull = () =>
  createAdvancedGameScenario().startPoint({
    puller: UNTRACKED_PLAYER,
    receiver: alex,
    startedAt: ADVANCED_TEST_TIMESTAMP,
  });

const withGameClockPause = (game: AdvancedTrackedGame, resumedAt?: number) => ({
  ...game,
  gameClockPauses: [
    { id: 'pause', reason: 'weather' as const, pausedAt: ADVANCED_TEST_TIMESTAMP + 1, resumedAt },
  ],
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
      withGameClockPause(receivedPull().build()),
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

describe('canAmendOpeningPull', () => {
  const opponentReceives = { initialReceivingSideId: ADVANCED_TEST_OPPONENT_SIDE_ID };
  const scrimmageParticipants = Array.from({ length: 14 }, (_, index) => ({
    id: `scrim-${index}`,
    name: `Scrim ${index}`,
  }));
  const bothSidesTracked = {
    sides: ADVANCED_TEST_SIDES.map((side) => ({ ...side, trackingMode: 'full-roster' as const })),
    participants: scrimmageParticipants,
    defaultLines: ADVANCED_TEST_SIDES.map((side, sideIndex) => ({
      sideId: side.id,
      participantIds: scrimmageParticipants
        .slice(sideIndex * 7, sideIndex * 7 + 7)
        .map((participant) => participant.id),
    })),
  };

  it.each<[string, AdvancedTrackedGame, CommandAvailability]>([
    [
      'before the first point',
      createAdvancedGameFixture(),
      { ok: false, reason: 'point-not-started' },
    ],
    ['after the focus side receives the pull', receivedPull().build(), { ok: true }],
    [
      'after the focus side picks up an out-of-bounds pull',
      createAdvancedGameScenario()
        .startPoint({ puller: UNTRACKED_PLAYER, pullResult: 'ob' })
        .pickup(alex)
        .build(),
      { ok: false, reason: 'play-past-pull' },
    ],
    [
      'during a stoppage after the pull',
      receivedPull().stoppage('injury').build(),
      { ok: false, reason: 'play-paused' },
    ],
    [
      'after a stoppage after the pull resumed',
      receivedPull()
        .stoppage('injury', { resumedAt: ADVANCED_TEST_TIMESTAMP + 1 })
        .build(),
      { ok: false, reason: 'play-past-pull' },
    ],
    [
      'during a game-clock pause',
      withGameClockPause(receivedPull().build()),
      { ok: false, reason: 'play-paused' },
    ],
    ['after a goal', receivedPull().goal(blair).build(), { ok: false, reason: 'point-over' }],
    [
      'after the pull was already marked dropped',
      createAdvancedGameScenario()
        .startPoint({ puller: UNTRACKED_PLAYER, receiver: alex, pullResult: 'dropped' })
        .build(),
      { ok: false, reason: 'pull-already-dropped' },
    ],
    [
      'after the untracked opponent receives the pull',
      createAdvancedGameScenario(opponentReceives).startPoint({ puller: alex }).build(),
      { ok: false, reason: 'opponent-has-disc' },
    ],
    [
      'after the other tracked side receives the pull in a scrimmage',
      createAdvancedGameScenario({ ...bothSidesTracked, ...opponentReceives })
        .startPoint({ puller: participantRef('scrim-0') })
        .build(),
      { ok: true },
    ],
  ])('%s', (_label, game, expected) => {
    expect(canAmendOpeningPull(game)).toEqual(expected);
  });
});

describe('canRecordStoppage', () => {
  it.each<[string, AdvancedTrackedGame, CommandAvailability]>([
    [
      'before the first point',
      createAdvancedGameFixture(),
      { ok: false, reason: 'point-not-started' },
    ],
    ['while the point is in play', receivedPull().complete(blair).build(), { ok: true }],
    ['after a goal', receivedPull().goal(blair).build(), { ok: false, reason: 'point-over' }],
    [
      'during a stoppage',
      receivedPull().stoppage('injury').build(),
      { ok: false, reason: 'play-paused' },
    ],
    [
      'during a game-clock pause',
      withGameClockPause(receivedPull().build()),
      { ok: false, reason: 'play-paused' },
    ],
  ])('%s', (_label, game, expected) => {
    expect(canRecordStoppage(game)).toEqual(expected);
  });
});

describe('canPauseGameClock', () => {
  it.each<[string, AdvancedTrackedGame, CommandAvailability]>([
    [
      'before the first point',
      createAdvancedGameFixture(),
      { ok: false, reason: 'game-not-started' },
    ],
    ['while the point is in play', receivedPull().build(), { ok: true }],
    ['between points', receivedPull().goal(blair).build(), { ok: true }],
    [
      'during a stoppage',
      receivedPull().stoppage('manual_pause').build(),
      { ok: false, reason: 'play-paused' },
    ],
    [
      'during another game-clock pause',
      withGameClockPause(receivedPull().build()),
      { ok: false, reason: 'play-paused' },
    ],
    [
      'after an earlier game-clock pause resumed',
      withGameClockPause(receivedPull().build(), ADVANCED_TEST_TIMESTAMP + 2),
      { ok: true },
    ],
  ])('%s', (_label, game, expected) => {
    expect(canPauseGameClock(game)).toEqual(expected);
  });
});

describe('planTimeout', () => {
  const withFormat = (format: Omit<GameFormatSettings, 'formatType'>) =>
    createAdvancedGameScenario({
      settings: { locationMode: 'none', format: { formatType: 'standard', ...format } },
    }).startPoint({ puller: UNTRACKED_PLAYER, receiver: alex, startedAt: ADVANCED_TEST_TIMESTAMP });
  const focusTimeout = { sideId: ADVANCED_TEST_FOCUS_SIDE_ID };
  const resumed = { ...focusTimeout, resumedAt: ADVANCED_TEST_TIMESTAMP + 1 };

  it.each<[string, AdvancedTrackedGame, TimeoutAvailability]>([
    [
      'before the first point',
      createAdvancedGameFixture(),
      { ok: false, reason: 'point-not-started' },
    ],
    [
      'while the point is in play',
      receivedPull().build(),
      { ok: true, plan: { kind: 'in-point', isFloater: false } },
    ],
    [
      'during a stoppage',
      receivedPull().stoppage('injury').build(),
      { ok: false, reason: 'play-paused' },
    ],
    [
      'between points',
      receivedPull().goal(blair).build(),
      { ok: true, plan: { kind: 'between-point', isFloater: false } },
    ],
    [
      'during a game-clock pause between points',
      withGameClockPause(receivedPull().goal(blair).build()),
      { ok: false, reason: 'play-paused' },
    ],
    [
      'while a between-point timeout is running',
      receivedPull()
        .goal(blair)
        .transitionAfterPoint({ transitionType: 'timeout', sideId: ADVANCED_TEST_OPPONENT_SIDE_ID })
        .build(),
      { ok: false, reason: 'timeout-active' },
    ],
    [
      'after a between-point timeout ended',
      receivedPull()
        .goal(blair)
        .transitionAfterPoint({
          transitionType: 'timeout',
          sideId: ADVANCED_TEST_OPPONENT_SIDE_ID,
          endedAt: ADVANCED_TEST_TIMESTAMP + 1,
        })
        .build(),
      { ok: true, plan: { kind: 'between-point', isFloater: false } },
    ],
    [
      'during the halftime break',
      withFormat({ gameTo: 2, halftimeAt: 1 }).goal(blair).build(),
      { ok: false, reason: 'halftime-break' },
    ],
    [
      'with regular timeouts used and the floater left',
      withFormat({ timeoutsPerHalf: 1, floaterEnabled: true }).stoppage('timeout', resumed).build(),
      { ok: true, plan: { kind: 'in-point', isFloater: true } },
    ],
    [
      'with regular timeouts used and no floater',
      withFormat({ timeoutsPerHalf: 1 }).stoppage('timeout', resumed).build(),
      { ok: false, reason: 'no-timeouts-left' },
    ],
    [
      'with regular timeouts and the floater used',
      withFormat({ timeoutsPerHalf: 1, floaterEnabled: true })
        .stoppage('timeout', resumed)
        .stoppage('timeout', { ...resumed, isFloater: true })
        .build(),
      { ok: false, reason: 'no-timeouts-left' },
    ],
  ])('%s', (_label, game, expected) => {
    expect(planTimeout(game, ADVANCED_TEST_FOCUS_SIDE_ID)).toEqual(expected);
  });
});

describe('getStoppageTapTarget', () => {
  it.each<[string, AdvancedTrackedGame, PauseTapTarget]>([
    ['the active stoppage', receivedPull().stoppage('injury', { id: 'stop' }).build(), 'active'],
    [
      'an already resumed stoppage',
      receivedPull()
        .stoppage('injury', { id: 'stop', resumedAt: ADVANCED_TEST_TIMESTAMP + 1 })
        .build(),
      'settled',
    ],
    ['a cancelled stoppage', receivedPull().build(), 'settled'],
  ])('%s', (_label, game, expected) => {
    expect(getStoppageTapTarget(game, 'stop')).toBe(expected);
  });
});

describe('getGameClockPauseTapTarget', () => {
  it.each<[string, AdvancedTrackedGame, PauseTapTarget]>([
    ['the active pause', withGameClockPause(receivedPull().build()), 'active'],
    [
      'an already resumed pause',
      withGameClockPause(receivedPull().build(), ADVANCED_TEST_TIMESTAMP + 2),
      'settled',
    ],
  ])('%s', (_label, game, expected) => {
    expect(getGameClockPauseTapTarget(game, 'pause')).toBe(expected);
  });
});

describe('canChangeLine', () => {
  it.each<[string, AdvancedTrackedGame, CommandAvailability]>([
    ['while the point is in play', receivedPull().complete(blair).build(), { ok: true }],
    ['after a goal', receivedPull().goal(blair).build(), { ok: false, reason: 'point-over' }],
    [
      'during a stoppage',
      receivedPull().stoppage('injury').build(),
      { ok: false, reason: 'play-paused' },
    ],
    [
      'during a game-clock pause',
      withGameClockPause(receivedPull().build()),
      { ok: false, reason: 'play-paused' },
    ],
  ])('%s', (_label, game, expected) => {
    expect(canChangeLine(game)).toEqual(expected);
  });
});

describe('canUndo', () => {
  const lastEntry: AdvancedTrackingUndoEntry = {
    kind: 'action',
    pointId: 'point',
    possessionId: 'possession',
    actionId: 'action',
  };

  it.each<
    [string, AdvancedTrackedGame, AdvancedTrackingUndoEntry | undefined, CommandAvailability]
  >([
    [
      'with nothing recorded',
      createAdvancedGameFixture(),
      undefined,
      { ok: false, reason: 'nothing-to-undo' },
    ],
    ['while the point is in play', receivedPull().build(), lastEntry, { ok: true }],
    ['between points', receivedPull().goal(blair).build(), lastEntry, { ok: true }],
    [
      'during a stoppage',
      receivedPull().stoppage('timeout', { sideId: ADVANCED_TEST_FOCUS_SIDE_ID }).build(),
      lastEntry,
      { ok: false, reason: 'stoppage-active' },
    ],
    [
      'during a game-clock pause',
      withGameClockPause(receivedPull().build()),
      lastEntry,
      { ok: true },
    ],
  ])('%s', (_label, game, entry, expected) => {
    expect(canUndo(game, entry)).toEqual(expected);
  });
});
