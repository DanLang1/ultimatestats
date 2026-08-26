import { generateAdvancedGameCSV } from '../advancedCSVUtils';
import {
  correctAdvancedTurnover,
  getAdvancedTurnoverCorrectionContext,
  getCorrectableAdvancedTurnoverContexts,
  type AdvancedTurnoverEditorResult,
} from '../advancedTurnoverCorrectionUtils';
import { buildAnalyticsGame } from '../buildAnalyticsGame';
import type { AdvancedTrackedGame, PlayerRef, ThrowAction, TrackedPoint } from '../types';

const HOME = 'home';
const AWAY = 'away';
const ref = (participantId: string): PlayerRef => ({ refType: 'participant', participantId });

function participants(prefix: string) {
  return Array.from({ length: 7 }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    name: `${prefix} ${index + 1}`,
  }));
}

function makeGame(
  turnoverAction: ThrowAction,
  options: {
    homeTracking?: 'full-roster' | 'anonymous';
    awayTracking?: 'full-roster' | 'anonymous';
  } = {},
): AdvancedTrackedGame {
  const homeParticipants = participants('home');
  const awayParticipants = participants('away');
  const homeTracking = options.homeTracking ?? 'full-roster';
  const awayTracking = options.awayTracking ?? 'full-roster';
  const point: TrackedPoint = {
    id: 'point-1',
    lines: [
      {
        sideId: HOME,
        participantIds: homeTracking === 'full-roster' ? homeParticipants.map((p) => p.id) : [],
      },
      {
        sideId: AWAY,
        participantIds: awayTracking === 'full-roster' ? awayParticipants.map((p) => p.id) : [],
      },
    ],
    possessions: [
      {
        id: 'possession-home',
        sideId: HOME,
        actions: [
          { id: 'pickup-home', kind: 'disc_pickup', sideId: HOME, player: ref('home-1') },
          {
            id: 'complete-home',
            kind: 'throw',
            sideId: HOME,
            thrower: ref('home-1'),
            toPlayer: ref('home-2'),
            result: 'complete',
          },
          turnoverAction,
        ],
      },
      {
        id: 'possession-away',
        sideId: AWAY,
        actions: [
          {
            id: 'away-goal',
            kind: 'throw',
            sideId: AWAY,
            thrower: awayTracking === 'full-roster' ? ref('away-1') : { refType: 'untracked' },
            toPlayer: awayTracking === 'full-roster' ? ref('away-2') : { refType: 'untracked' },
            result: 'goal',
          },
        ],
      },
    ],
  };
  return {
    id: 'turnover-correction-game',
    schemaVersion: 3,
    createdAt: 100,
    updatedAt: 200,
    gameType: 'game',
    status: 'final',
    focusSideId: HOME,
    initialReceivingSideId: HOME,
    settings: { locationMode: 'none' },
    sides: [
      { id: HOME, label: 'Home', trackingMode: homeTracking },
      { id: AWAY, label: 'Away', trackingMode: awayTracking },
    ],
    participants: [...homeParticipants, ...awayParticipants],
    points: [point],
  };
}

function turnover(result: ThrowAction['result'] = 'throwaway'): ThrowAction {
  return {
    id: 'turnover-1',
    kind: 'throw',
    sideId: HOME,
    thrower: ref('home-2'),
    result,
  };
}

const locator = { pointId: 'point-1', possessionId: 'possession-home', actionId: 'turnover-1' };

describe('advanced turnover correction domain', () => {
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(999));
  afterEach(() => jest.restoreAllMocks());

  it('exposes all six editable outcomes and the linked holder occurrence', () => {
    const game = makeGame(turnover());
    const context = getAdvancedTurnoverCorrectionContext(game, locator);

    expect(context.availableResults).toEqual([
      'drop',
      'fifty-fifty',
      'throwaway',
      'block',
      'pressure',
      'stall',
    ]);
    expect(context.holderTouch).toMatchObject({
      incomingActionId: 'complete-home',
      outgoingActionId: 'turnover-1',
      currentParticipantId: 'home-2',
    });
  });

  it('corrects the thrower and preceding completion receiver atomically', () => {
    const game = makeGame(turnover());
    const corrected = correctAdvancedTurnover(game, {
      ...locator,
      result: 'throwaway',
      throwerParticipantId: 'home-3',
    });
    const actions = corrected.points[0].possessions[0].actions;

    expect(actions[1]).toMatchObject({ toPlayer: ref('home-3') });
    expect(actions[2]).toMatchObject({ thrower: ref('home-3'), result: 'throwaway' });
    expect(corrected.updatedAt).toBe(999);
  });

  it.each<{
    result: AdvancedTurnoverEditorResult;
    input: Partial<Parameters<typeof correctAdvancedTurnover>[1]>;
    expected: Partial<ThrowAction>;
  }>([
    {
      result: 'drop',
      input: { receiverParticipantId: 'home-4' },
      expected: { result: 'drop', toPlayer: ref('home-4') },
    },
    {
      result: 'fifty-fifty',
      input: { receiverParticipantId: 'home-4' },
      expected: { result: 'drop', toPlayer: ref('home-4'), splitAttribution: true },
    },
    { result: 'throwaway', input: {}, expected: { result: 'throwaway' } },
    {
      result: 'block',
      input: { defenderParticipantId: 'away-3' },
      expected: { result: 'block', defender: ref('away-3') },
    },
    {
      result: 'pressure',
      input: { defenderParticipantId: 'away-3' },
      expected: { result: 'pressure', defender: ref('away-3') },
    },
    {
      result: 'stall',
      input: { defenderParticipantId: 'away-3' },
      expected: { result: 'stall', defender: ref('away-3') },
    },
  ])('normalizes a conversion to $result', ({ result, input, expected }) => {
    const game = makeGame(turnover());
    const corrected = correctAdvancedTurnover(game, { ...locator, result, ...input });
    const action = corrected.points[0].possessions[0].actions[2];

    expect(action).toMatchObject(expected);
    if (result === 'drop' || result === 'fifty-fifty') {
      expect(action).toHaveProperty('toPlayer');
      expect(action).not.toHaveProperty('defender');
    } else if (result === 'block' || result === 'pressure' || result === 'stall') {
      expect(action).toHaveProperty('defender');
      expect(action).not.toHaveProperty('toPlayer');
      expect(action).not.toHaveProperty('splitAttribution');
    } else {
      expect(action).not.toHaveProperty('toPlayer');
      expect(action).not.toHaveProperty('defender');
      expect(action).not.toHaveProperty('splitAttribution');
    }
  });

  it('preserves valid hucks and strips them when converting to a stall', () => {
    const game = makeGame({ ...turnover(), details: { type: 'huck' } });
    const preserved = correctAdvancedTurnover(game, {
      ...locator,
      result: 'block',
      defenderParticipantId: 'away-3',
      throwType: 'huck',
    });
    expect(preserved.points[0].possessions[0].actions[2]).toMatchObject({
      result: 'block',
      details: { type: 'huck' },
    });

    const stripped = correctAdvancedTurnover(game, {
      ...locator,
      result: 'stall',
      defenderParticipantId: 'away-3',
    });
    expect(stripped.points[0].possessions[0].actions[2]).not.toHaveProperty('details');
  });

  it('preserves imported throw details when classification is read-only except for stalls', () => {
    const game = makeGame(
      { ...turnover(), thrower: { refType: 'untracked' }, details: { type: 'huck' } },
      { homeTracking: 'anonymous' },
    );
    game.points[0].possessions[0].actions[0] = {
      id: 'pickup-home',
      kind: 'disc_pickup',
      sideId: HOME,
      player: { refType: 'untracked' },
    };
    game.points[0].possessions[0].actions[1] = {
      id: 'complete-home',
      kind: 'throw',
      sideId: HOME,
      thrower: { refType: 'untracked' },
      toPlayer: { refType: 'untracked' },
      result: 'complete',
    };

    const preserved = correctAdvancedTurnover(game, {
      ...locator,
      result: 'block',
      defenderParticipantId: 'away-3',
    });
    expect(preserved.points[0].possessions[0].actions[2]).toMatchObject({
      result: 'block',
      details: { type: 'huck' },
    });

    const stripped = correctAdvancedTurnover(game, {
      ...locator,
      result: 'stall',
      defenderParticipantId: 'away-3',
    });
    expect(stripped.points[0].possessions[0].actions[2]).not.toHaveProperty('details');
  });

  it('rebuilds analytics and CSV from the corrected canonical result', () => {
    const game = makeGame(turnover());
    const corrected = correctAdvancedTurnover(game, {
      ...locator,
      result: 'pressure',
      defenderParticipantId: 'away-3',
    });
    const analytics = buildAnalyticsGame(corrected);
    const turnoverAttributions = analytics.attributions.filter(
      (attribution) => attribution.actionId === 'turnover-1',
    );
    const csv = generateAdvancedGameCSV(analytics);

    expect(turnoverAttributions.map((attribution) => attribution.type)).toEqual([
      'throw_attempt',
      'throwaway',
      'pressure',
    ]);
    expect(csv).toContain('1,Throw,home 2,pressure,,,away 3');
    expect(csv).not.toContain('1,Throw,home 2,throwaway');
  });

  it('allows anonymous defender attribution where block and stall capture semantics permit it', () => {
    const game = makeGame(turnover(), { awayTracking: 'anonymous' });
    const context = getAdvancedTurnoverCorrectionContext(game, locator);
    expect(context.availableResults).toContain('block');
    expect(context.availableResults).toContain('stall');
    expect(context.availableResults).not.toContain('pressure');

    const corrected = correctAdvancedTurnover(game, { ...locator, result: 'block' });
    expect(corrected.points[0].possessions[0].actions[2]).toMatchObject({
      result: 'block',
      defender: { refType: 'untracked' },
    });
  });

  it('does not expose unfinished points or invalid imported chains', () => {
    const unfinished = makeGame(turnover());
    unfinished.points[0].possessions[1].actions[0] = {
      id: 'away-complete',
      kind: 'throw',
      sideId: AWAY,
      thrower: ref('away-1'),
      toPlayer: ref('away-2'),
      result: 'complete',
    };
    expect(getCorrectableAdvancedTurnoverContexts(unfinished)).toEqual([]);

    const invalidContinuity = makeGame({ ...turnover(), thrower: ref('home-3') });
    expect(getCorrectableAdvancedTurnoverContexts(invalidContinuity)).toEqual([]);

    const invalid = makeGame(turnover());
    invalid.points[0].subs = [
      {
        id: 'missing-sub',
        sideId: HOME,
        type: 'injury',
        inIds: ['home-3'],
        outIds: ['home-2'],
        stoppageActionId: 'missing-stoppage',
      },
    ];
    expect(getCorrectableAdvancedTurnoverContexts(invalid)).toEqual([]);
  });

  it.each([
    {
      name: 'a non-terminal turnover action',
      mutate: (game: AdvancedTrackedGame) => {
        game.points[0].possessions[0].actions.push({
          id: 'complete-after-turnover',
          kind: 'throw',
          sideId: HOME,
          thrower: ref('home-2'),
          toPlayer: ref('home-3'),
          result: 'complete',
        });
      },
    },
    {
      name: 'a turnover with the wrong action side',
      mutate: (game: AdvancedTrackedGame) => {
        (game.points[0].possessions[0].actions[2] as ThrowAction).sideId = AWAY;
      },
    },
    {
      name: 'a turnover followed by the same side',
      mutate: (game: AdvancedTrackedGame) => {
        game.points[0].possessions[1].sideId = HOME;
      },
    },
    {
      name: 'a turnover without a following possession',
      mutate: (game: AdvancedTrackedGame) => {
        game.points[0].possessions.pop();
      },
    },
  ])('rejects $name as a non-canonical turnover', ({ mutate }) => {
    const game = makeGame(turnover());
    mutate(game);

    expect(() => getAdvancedTurnoverCorrectionContext(game, locator)).toThrow();
    expect(() => correctAdvancedTurnover(game, { ...locator, result: 'drop' })).toThrow();
    expect(getCorrectableAdvancedTurnoverContexts(game)).toEqual([]);
  });
});
